// genmon.js - javascrip source for generator monitor
// Define header
$("#myheader").html('<header>Generator Monitor</header>');

// Define main menu
$("#navMenu").html('<ul>' +
      '<li id="status"><a><table width="100%" height="100%"><tr><td width="28px" align="right" valign="middle"><img src="images/status.png" width="20px" height="20px"></td><td valign="middle">&nbsp;Status</td></tr></table></a></li>' +
      '<li id="maint"><a><table width="100%" height="100%"><tr><td width="28px" align="right" valign="middle"><img src="images/maintenance.png" width="20px" height="20px"></td><td valign="middle">&nbsp;Maintenance</td></tr></table></a></li>' +
      '<li id="outage"><a><table width="100%" height="100%"><tr><td width="28px" align="right" valign="middle"><img src="images/outage.png" width="20px" height="20px"></td><td valign="middle">&nbsp;Outage</td></tr></table></a></li>' +
      '<li id="logs"><a><table width="100%" height="100%"><tr><td width="28px" align="right" valign="middle"><img src="images/log.png" width="20px" height="20px"></td><td valign="middle">&nbsp;Logs</td></tr></table></a></li>' +
      '<li id="monitor"><a><table width="100%" height="100%"><tr><td width="28px" align="right" valign="middle"><img src="images/monitor.png" width="20px" height="20px"></td><td valign="middle">&nbsp;Monitor</td></tr></table></a></li>' +
      '<li id="notifications"><a><table width="100%" height="100%"><tr><td width="28px" align="right" valign="middle"><img src="images/notifications.png" width="20px" height="20px"></td><td valign="middle">&nbsp;Notifications</td></tr></table></a></li>' +
      '<li id="settings"><a><table width="100%" height="100%"><tr><td width="28px" align="right" valign="middle"><img src="images/settings.png" width="20px" height="20px"></td><td valign="middle">&nbsp;Settings</td></tr></table></a></li>' +
    '</ul>') ;

// global base state
var currentVersion = "";
var showMajorUSMobileCarrierTextEmail = false;
var baseState = "READY";        // updated on a time
var currentbaseState = "READY"; // menus change on this var
var currentClass = "active";    // CSS class for menu color
var menuElement = "status";
var ajaxErrors = {errorCount: 0, lastSuccessTime: 0, log: ""};
var windowActive = true;

var myGenerator = {sitename: "", nominalRPM: 3600, nominalfrequency: 60, Controller: "", model: "", nominalKW: 22, fueltype: "", EnhancedExerciseEnabled: false, OldExerciseParameters:[-1,-1,-1,-1,-1,-1]};
var regHistory = {updateTime: {}, _10m: {}, _60m: {}, _24h: {}, historySince: "", count_60m: 0, count_24h: 0};
var kwHistory = {data: [], plot:"", kwDuration: "h", tickInterval: "10 minutes", formatString: "%H:%M"};
var pathname = window.location.href;
var baseurl = pathname.concat("cmd/");
var DaysOfWeekArray = ["Sunday","Monday","Tuesday","Wednesday", "Thursday", "Friday", "Saturday"];
var MonthsOfYearArray = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

vex.defaultOptions.className = 'vex-theme-os'

//*****************************************************************************
// called on window.onload
//      sets up listener events (click menu) and inits the default page
//*****************************************************************************
GetGeneratorModel();
GetBaseStatus();
SetFavIcon();
GetkWHistory();
$(document).ready(function() {
    $("#footer").html('<table border="0" width="100%" height="30px"><tr><td width="5%"><img class="tooltip" id="ajaxWarning" src="images/alert.png" height="28px" width="28px" style="display: none;"></td><td width="90%"><a href="https://github.com/jgyates/genmon" target="_blank">GenMon Project on GitHub</a></td><td width="5%"></td></tr></table>');
    $('#ajaxWarning').tooltipster({minWidth: '280px', maxWidth: '480px', animation: 'fade', updateAnimation: 'null', contentAsHTML: 'true', delay: 100, animationDuration: 200, side: ['top', 'left'], content: "No Communicatikon Errors occured"});
    UpdateRegisters(true, false);
    setInterval(GetBaseStatus, 3000);       // Called every 3 sec
    setInterval(UpdateDisplay, 5000);       // Called every 5 sec
    DisplayStatusFull();
    $("#status").find("a").addClass(GetCurrentClass());
    $("li").on('click',  function() {  MenuClick($(this));});
    resizeDiv();
});


window.onresize = function(event) {
    resizeDiv();
}


//*****************************************************************************
//  Manage AJAX responsees
//*****************************************************************************
function processAjaxSuccess() {
    var now = new moment();
    if (ajaxErrors["errorCount"]>5) {
      ajaxErrors["log"] = ajaxErrors["errorCount"]+" messages missed between "+ajaxErrors["lastSuccessTime"].format("H:mm:ss") + " and " +now.format("H:mm:ss") +"<br>" + ajaxErrors["log"];
      $("#footer").removeClass("alert");
      $("#ajaxWarning").hide(2000);
    }
    ajaxErrors["errorCount"] = 0;
    ajaxErrors["lastSuccessTime"] = new moment();
}

function processAjaxError(xhr, ajaxOptions, thrownError) {
    // alert(xhr.status);
    // alert(thrownError);
    ajaxErrors["errorCount"]++;
    if (ajaxErrors["errorCount"]>5) {
      var tempMsg = '<b><span style="font-size:14px">Disconnected from server</span></b><br>'+ajaxErrors["errorCount"]+' messages missed since '+ajaxErrors["lastSuccessTime"].format("H:mm:ss")+"</b><br><br>"+((ajaxErrors["log"].length>500) ? ajaxErrors["log"].substring(0, 500)+"<br>[...]" : ajaxErrors["log"]);
      $("#footer").addClass("alert");
      $("#ajaxWarning").show(2000);
      $('#ajaxWarning').tooltipster('content', tempMsg);
    }
}


//*****************************************************************************
//  Make Sure window resize is handled correctly
//*****************************************************************************
function resizeDiv() {
     vpw = $(window).width();
     vph = $(window).height();
     $('#mytable').css({'height': vph + 'px'});
     $('#mytable').css({'width': vpw + 'px'});
     $('#myheader').css({'height': '30px'});
     $('#myheader').css({'width': vpw + 'px'});
     $('#myDiv').css({'height': (vph-60) + 'px'});
     $('#myDiv').css({'width': (vpw-200) + 'px'});
     $('#navMenu').css({'height': (vph-60) + 'px'});
     $('#navMenu').css({'width': '200px'});
     $('#footer').css({'height': '30px'});
     $('#footer').css({'width': vpw + 'px'});
}

//*****************************************************************************
//  Make sure we stop replots when windows in inactive. Chrome has a bug
//  that causes crashes otherwise:
//  https://plumbr.io/blog/performance-blog/leaking-gpu-memory-google-chrome-edition
//*****************************************************************************

$(window).focus(function() {
    windowActive = true;
    // console.log(moment().format("YYYY-MM-DD HH:mm:ss") + " window became active. Starting background replots for jqplot");
});

$(window).blur(function() {
    windowActive = false;
    // console.log(moment().format("YYYY-MM-DD HH:mm:ss") + " window became inactive. Stopping background replots for jqplot");
});

//*****************************************************************************
//
//*****************************************************************************
Number.prototype.pad = function(size) {
      var s = String(this);
      while (s.length < (size || 2)) {s = "0" + s;}
      return s;
    }

//*****************************************************************************
// called when setting a remote command
//*****************************************************************************
function SetRemoteCommand(command){

    // set remote command
    var url = baseurl.concat("setremote");
    $.getJSON(  url,
                {setremote: command},
                function(result){
   });

}


//*****************************************************************************
// DisplayStatusFull - show the status page at the beginning or when switching
// from another page
//*****************************************************************************
var gaugeBatteryVoltage;
var gaugeUtilityVoltage;
var gaugeOutputVoltage;
var gaugeBatteryFrequency;
var gaugekW;

function DisplayStatusFull()
{
    var url = baseurl.concat("status_json");
    $.ajax({dataType: "json", url: url, timeout: 4000, error: processAjaxError, success: function(result){
        processAjaxSuccess();
        var outstr = 'Dashboard:<br><br>';
        outstr += '<center><div class="gauge-breakpoint">';
        outstr += '<div class="gauge-block-a"><div class="gaugeField">Battery Voltage<br><canvas class="gaugeCanvas" id="gaugeBatteryVoltage"></canvas><br><div id="textBatteryVoltage" class="gaugeDiv"></div>V</div></div>';
        outstr += '<div class="gauge-block-b"><div class="gaugeField">Utility Voltage<br><canvas class="gaugeCanvas" id="gaugeUtilityVoltage"></canvas><br><div id="textUtilityVoltage" class="gaugeDiv"></div>V</div></div>';
        outstr += '<div class="gauge-lb2"></div>';
        outstr += '<div class="gauge-block-c"><div class="gaugeField">Output Voltage<br><canvas class="gaugeCanvas" id="gaugeOutputVoltage"></canvas><br><div id="textOutputVoltage" class="gaugeDiv"></div>V</div></div>';
        outstr += '<div class="gauge-lb3"></div>';
        outstr += '<div class="gauge-block-d"><div class="gaugeField">Frequency<br><canvas class="gaugeCanvas" id="gaugeFrequency"></canvas><br><div id="textFrequency" class="gaugeDiv"></div>Hz</div></div>';
        outstr += '<div class="gauge-lb2"></div>';
        outstr += '<div class="gauge-block-e"><div class="gaugeField">Rotation/Min<br><canvas class="gaugeCanvas" id="gaugeRPM"></canvas><br><div id="textRPM" class="gaugeDiv"></div> RPM</div></div>';
        outstr += '<div class="gauge-lb5"></div>';
        if ((myGenerator["Controller"].indexOf("Nexus") == -1) && !((myGenerator["Controller"] == "Evolution, Air Cooled") && (result["Status"]["Engine"]["Unsupported Sensors"] == undefined))) {
           outstr += '<div class="gauge-block-f"><div class="gaugeField">kW Output<br><canvas class="gaugeCanvas" id="gaugekW"></canvas><br><div id="textkW" class="gaugeDiv"></div>kW</div></div>';
           outstr += '<div class="gauge-lb2 gauge-lb3"></div>';
           outstr += '<div class="gauge-block-g"></div>';
           outstr += '<div class="gauge-block-h"><div class="plotField">kW Output<br><div id="plotkW" class="kwPlotCanvas"></div><span class="kwPlotText">Time (<div class="kwPlotSelection selection" id="1h">1 hour</div> | <div class="kwPlotSelection" id="1d">1 day</div> | <div class="kwPlotSelection" id="1w">1 week</div> | <div class="kwPlotSelection" id="1m">1 month</div>)</span></div></div>';
        }
        outstr += '</div></center><br>';

        $("#mydisplay").html(outstr + '<div style="clear:both" id="statusText">' + json2html(result, "", "root") + '</div>');

        gaugeBatteryVoltage = createGauge($("#gaugeBatteryVoltage"), $("#textBatteryVoltage"), 1, 10, 16, [10, 11, 12, 13, 14, 15, 16],
                                          [{strokeStyle: "#F03E3E", min: 10, max: 11.5},
                                           {strokeStyle: "#FFDD00", min: 11.5, max: 12.5},
                                           {strokeStyle: "#30B32D", min: 12.5, max: 15},
                                           {strokeStyle: "#FFDD00", min: 15, max: 15.5},
                                           {strokeStyle: "#F03E3E", min: 15.5, max: 16}], 6, 10);
        gaugeBatteryVoltage.set(result["Status"]["Engine"]["Battery Voltage"].replace(/V/g, '')); // set current value

        gaugeUtilityVoltage = createGauge($("#gaugeUtilityVoltage"), $("#textUtilityVoltage"), 0, 0, 260, [0, 100, 156, 220, 240, 260],
                                          [{strokeStyle: "#F03E3E", min: 0, max: 220},
                                           {strokeStyle: "#FFDD00", min: 220, max: 235},
                                           {strokeStyle: "#30B32D", min: 235, max: 245},
                                           {strokeStyle: "#FFDD00", min: 245, max: 255},
                                           {strokeStyle: "#F03E3E", min: 255, max: 260}], 26, 0);
        gaugeUtilityVoltage.set(result["Status"]["Line State"]["Utility Voltage"].replace(/V/g, '')); // set actual value

        gaugeOutputVoltage = createGauge($("#gaugeOutputVoltage"), $("#textOutputVoltage"), 0, 0, 260, [0, 100, 156, 220, 240, 260],
                                          [{strokeStyle: "#F03E3E", min: 0, max: 220},
                                           {strokeStyle: "#FFDD00", min: 220, max: 235},
                                           {strokeStyle: "#30B32D", min: 235, max: 245},
                                           {strokeStyle: "#FFDD00", min: 245, max: 255},
                                           {strokeStyle: "#F03E3E", min: 255, max: 260}], 26, 0);
        gaugeOutputVoltage.set(result["Status"]["Engine"]["Output Voltage"].replace(/V/g, '')); // set actual value

        var gaugeNominalFrequency = myGenerator["nominalfrequency"];
        gaugeFrequency = createGauge($("#gaugeFrequency"), $("#textFrequency"), 1, 0, 70, [10, 20, 30, 40, 50, 60, 70],
                                          [{strokeStyle: "#F03E3E", min: 0, max: gaugeNominalFrequency/100*96},
                                           {strokeStyle: "#FFDD00", min: gaugeNominalFrequency/100*96, max: gaugeNominalFrequency/100*98},
                                           {strokeStyle: "#30B32D", min: gaugeNominalFrequency/100*98, max: gaugeNominalFrequency/100*102},
                                           {strokeStyle: "#FFDD00", min: gaugeNominalFrequency/100*102, max: gaugeNominalFrequency/100*104},
                                           {strokeStyle: "#F03E3E", min: gaugeNominalFrequency/100*104, max: 70}], 7, 10);
        gaugeFrequency.set(result["Status"]["Engine"]["Frequency"].replace(/Hz/g, '')); // set actual value

        var gaugeRPMnominal = myGenerator["nominalRPM"];
        gaugeRPM = createGauge($("#gaugeRPM"), $("#textRPM"), 0, 0, parseInt(gaugeRPMnominal/9*10), [parseInt(gaugeRPMnominal/4), parseInt(gaugeRPMnominal/2), parseInt(gaugeRPMnominal/4*3), parseInt(gaugeRPMnominal)],
                                          [{strokeStyle: "#F03E3E", min: 0, max: gaugeRPMnominal/18*17},
                                           {strokeStyle: "#FFDD00", min: gaugeRPMnominal/18*17, max: gaugeRPMnominal/36*35},
                                           {strokeStyle: "#30B32D", min: gaugeRPMnominal/36*35, max: gaugeRPMnominal/36*37},
                                           {strokeStyle: "#FFDD00", min: gaugeRPMnominal/36*37, max: gaugeRPMnominal/18*19},
                                           {strokeStyle: "#F03E3E", min: gaugeRPMnominal/18*19, max: gaugeRPMnominal/9*10}], 4, 10);
        gaugeRPM.set(result["Status"]["Engine"]["RPM"]); // set actual value

        if ($("#gaugekW").length > 0) {
           var gaugeNominalKW = myGenerator["nominalKW"];
           var gaugeNominalKWmarks = [0];
           for(var i=0;i<=parseInt(gaugeNominalKW/20*23/5);i++){
             gaugeNominalKWmarks.unshift(5*i);
           }
           gaugekW = createGauge($("#gaugekW"), $("#textkW"), 0, 0, parseInt(gaugeNominalKW/20*23), gaugeNominalKWmarks,
                                          [{strokeStyle: "#30B32D", min: 0, max: gaugeNominalKW/10*8},
                                           {strokeStyle: "#FFDD00", min: gaugeNominalKW/10*8, max: gaugeNominalKW/20*19},
                                           {strokeStyle: "#F03E3E", min: gaugeNominalKW/20*19, max: gaugeNominalKW/20*23}], parseInt(gaugeNominalKW/20*23/5), 5);
           gaugekW.set(0); // set starting value

           kwHistory["kwDuration"] = "h";
           kwHistory["tickInterval"] = "10 minutes";
           kwHistory["formatString"] = "%H:%M";
           var now = new moment();
           kwHistory["plot"] =  $.jqplot('plotkW', (kwHistory["data"].length > 0) ? [kwHistory["data"]] : [[[now.format("YYYY-MM-DD H:mm:ss"), 0]]], {
                axesDefaults: { labelOptions:  { fontFamily: 'Arial', textColor: '#000000', fontSize: '8pt' },
                tickOptions: { fontFamily: 'Arial', textColor: '#000000', fontSize: '6pt' }},
                grid: { drawGridLines: true, gridLineColor: '#cccccc', background: '#e1e1e1', borderWidth: 0, shadow: false, shadowWidth: 0 },
                gridPadding: {right:40, left:55},
                axes: {
                    xaxis:{
                        renderer:$.jqplot.DateAxisRenderer,
                        tickInterval: kwHistory["tickInterval"],
                        tickOptions:{formatString:kwHistory["formatString"]},
                        min: now.add(-1, kwHistory["kwDuration"]).format("YYYY-MM-DD H:mm:ss"),
                        max: now.format("YYYY-MM-DD H:mm:ss")
                    },
                    yaxis:{
                        label:"kW",
                        labelRenderer: $.jqplot.CanvasAxisLabelRenderer,
                        min:0,
                        max: parseInt(gaugeNominalKW/20*23)
                    }
                },
                highlighter: {
                    show: true,
                    sizeAdjust: 7.5
                },
                cursor:{
                    show: true,
                    zoom:true,
                    showTooltip:true
                }
           });
           $(".kwPlotSelection").on('click', function() {
               $(".kwPlotSelection").removeClass("selection");
               $(this).addClass("selection");
               switch ($(this).attr("id")) {
                 case "1h":
                   kwHistory["kwDuration"] = "h";
                   kwHistory["tickInterval"] = "10 minutes";
                   kwHistory["formatString"] = "%H:%M";
                   break;
                 case "1d":
                   kwHistory["kwDuration"] = "d";
                   kwHistory["tickInterval"] = "1 hour";
                   kwHistory["formatString"] = "%#I%p";
                   break;
                 case "1w":
                   kwHistory["kwDuration"] = "w";
                   kwHistory["tickInterval"] = "1 day";
                   kwHistory["formatString"] = "%d %b";
                   break;
                 case "1m":
                   kwHistory["kwDuration"] = "M";
                   kwHistory["tickInterval"] = "1 day";
                   kwHistory["formatString"] = "%d";
                   break;
                 default:
                   break
               }
               printKwPlot(gaugekW.value);
           });
        }
    }});
    return;
}

function json2html(json, intent, parentkey) {
    var outstr = '';
    if (typeof json === 'string') {
      outstr += '<div class="jsonVal" id="'+parentkey.replace(/ /g, '_')+'">' + json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</div><br>';
    } else if (typeof json === 'number') {
      outstr += '<div class="jsonVal" id="'+parentkey.replace(/ /g, '_')+'">' + json + '</div><br>';
    } else if (typeof json === 'boolean') {
      outstr += '<div class="jsonVal" id="'+parentkey.replace(/ /g, '_')+'">' + json + '</div><br>';
    } else if (json === null) {
      outstr += '<div class="jsonVal" id="'+parentkey.replace(/ /g, '_')+'">null</div><br>';
    }
    else if (json instanceof Array) {
      if (json.length > 0) {
        intent += "&nbsp;&nbsp;&nbsp;&nbsp;";
        for (var i = 0; i < json.length; ++i) {
          outstr += json2html(json[i], intent, parentkey+"_"+i);
        }
      }
    }
    else if (typeof json === 'object') {
      var key_count = Object.keys(json).length;
      if (key_count > 0) {
        intent += "&nbsp;&nbsp;&nbsp;&nbsp;";
        for (var key in json) {
          if (json.hasOwnProperty(key)) {
            if ((typeof json[key] === 'string') || (typeof json[key] === 'number') || (typeof json[key] === 'boolean') || (typeof json[key] === null)) {
               outstr += intent + key + ' : ' + json2html(json[key], intent, key);
            } else {
               outstr += "<br>" + intent + key + ' :<br>' + json2html(json[key], intent, key);
            }
          }
        }
      }
    }
    return outstr;
}

function createGauge(pCanvas, pText, pTextPrecision, pMin, pMax, pLabels, pZones, pDiv, pSubDiv) {
    var opts = {
      angle: -0.2, // The span of the gauge arc
      lineWidth: 0.2, // The line thickness
      radiusScale: 0.73, // Relative radius
      pointer: {
        length: 0.6, // // Relative to gauge radius
        strokeWidth: 0.038, // The thickness
        color: '#000000' // Fill color
      },
      limitMax: false,     // If false, max value increases automatically if value > maxValue
      limitMin: false,     // If true, the min value of the gauge will be fixed
      generateGradient: true,
      highDpiSupport: true,     // High resolution support
      staticLabels: {
        font: "10px sans-serif",  // Specifies font
        labels: pLabels,  // Print labels at these values
        color: "#000000",  // Optional: Label text color
        fractionDigits: 0  // Optional: Numerical precision. 0=round off.
      },
      staticZones: pZones,
      // renderTicks is Optional
      renderTicks: {
        divisions: pDiv,
        divWidth: 0.1,
        divLength: 0.48,
        divColor: '#333333',
        subDivisions: pSubDiv,
        subLength: 0.17,
        subWidth: 0.1,
        subColor: '#666666'
      }
    };

    var gauge = new Gauge(pCanvas[0]).setOptions(opts);
    gauge.minValue = pMin; // set max gauge value
    gauge.maxValue = pMax; // set max gauge value
    gauge.setTextField(pText[0], pTextPrecision);
    gauge.animationSpeed = 1;
    gauge.set(pMin); // setting starting point
    gauge.animationSpeed = 128; // set animation speed (32 is default value)

    return gauge;
}

function printKwPlot(currenKw) {
   var now = new moment();
   if (currenKw == 0)
     kwHistory["data"].unshift([now.format("YYYY-MM-DD HH:mm:ss"), 0]); /// add a zero to the current point temporarily

   var max = now.format("YYYY-MM-DD H:mm:ss");
   if (kwHistory["kwDuration"] == "h")
     max = now.add(1, "m").format("YYYY-MM-DD H:mm:ss")
   if (kwHistory["kwDuration"] == "d")
     max = now.add(1, "h").format("YYYY-MM-DD H:mm:ss")

   if (windowActive == true)
     kwHistory["plot"].replot({data: [kwHistory["data"]], axes:{xaxis:{tickInterval: kwHistory["tickInterval"], tickOptions:{formatString:kwHistory["formatString"]}, max:now.format("YYYY-MM-DD H:mm:ss"), min:now.add(-1, kwHistory["kwDuration"]).format("YYYY-MM-DD H:mm:ss")}}});

   if (currenKw == 0)
     kwHistory["data"].shift();  /// remove the zero again

   if (kwHistory["data"].length > 2500)
     GetkWHistory();
}

//*****************************************************************************
// DisplayStatusUpdate - updates the status page at every interval
//*****************************************************************************
function DisplayStatusUpdate()
{
    var url = baseurl.concat("status_json");
    $.ajax({dataType: "json", url: url, timeout: 4000, error: processAjaxError, success: function(result){
        processAjaxSuccess();
        $("#statusText").html(json2html(result, "", "root"));
        // json2updates(result, "root");

        gaugeBatteryVoltage.set(result["Status"]["Engine"]["Battery Voltage"].replace(/V/g, '')); // set actual value
        gaugeUtilityVoltage.set(result["Status"]["Line State"]["Utility Voltage"].replace(/V/g, '')); // set actual value
        gaugeOutputVoltage.set(result["Status"]["Engine"]["Output Voltage"].replace(/V/g, '')); // set actual value
        gaugeFrequency.set(result["Status"]["Engine"]["Frequency"].replace(/Hz/g, '')); // set actual value
        gaugeRPM.set(result["Status"]["Engine"]["RPM"]); // set actual value
    }});

}

function json2updates(json, parentkey) {
    if ((typeof json === 'string') && ($("#"+parentkey.replace(/ /g, '_')).html() != json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'))) {
      $("#"+parentkey.replace(/ /g, '_')).html(json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'));
      // $("#"+parentkey.replace(/ /g, '_')).css("color", "red");
    } else if ((typeof json === 'number') && ($("#"+parentkey.replace(/ /g, '_')).html() != json)) {
      $("#"+parentkey.replace(/ /g, '_')).html(json);
    } else if ((typeof json === 'boolean') && ($("#"+parentkey.replace(/ /g, '_')).html() != json)) {
      $("#"+parentkey.replace(/ /g, '_')).html(json);
    } else if ((json === null) && ($("#"+parentkey.replace(/ /g, '_')).html() != "null")) {
      $("#"+parentkey.replace(/ /g, '_')).html('null');
    }
    else if (json instanceof Array) {
      if (json.length > 0) {
        for (var i = 0; i < json.length; ++i) {
          json2updates(json[i], parentkey+"_"+i);
        }
      }
    }
    else if (typeof json === 'object') {
      var key_count = Object.keys(json).length;
      if (key_count > 0) {
        for (var key in json) {
          if (json.hasOwnProperty(key)) {
            json2updates(json[key], key);
          }
        }
      }
    }
}


//*****************************************************************************
// Display the Maintenance Tab
//*****************************************************************************
function DisplayMaintenance(){

    var url = baseurl.concat("maint_json");
    $.ajax({dataType: "json", url: url, timeout: 4000, error: processAjaxError, success: function(result){
        processAjaxSuccess();

        outstr = json2html(result, "", "root");

        outstr += "<br>Generator Exercise Time:<br><br>";

        //Create array of options to be added
        if (myGenerator['EnhancedExerciseEnabled'] == true) {
           outstr += '&nbsp;&nbsp;&nbsp;&nbsp;<select id="ExerciseFrequency" onChange="setExerciseSelection()">';
           outstr += '<option value="Weekly" ' + (myGenerator['ExerciseFrequency'] == "Weekly"  ? ' selected="selected" ' : '') + '>Weekly</option>';
           outstr += '<option value="Biweekly" ' + (myGenerator['ExerciseFrequency'] == "Biweekly"  ? ' selected="selected" ' : '') + '>Biweekly</option>';
           outstr += '<option value="Monthly" ' + (myGenerator['ExerciseFrequency'] == "Monthly"  ? ' selected="selected" ' : '') + '>Monthly</option>';
           outstr += '</select>';
        }

        //Create and append the options, days
        outstr += '&nbsp;<select id="days"></select> , ';
        //Create and append the options, hours
        outstr += '<select id="hours">';
        for (var i = 0; i < 24; i++) {
            outstr += '<option value="' + i.pad() + '">' + i.pad() + '</option>';
        }
        outstr += '</select> : ';

        //Create and append the options, minute
        outstr += '<select id="minutes">';
        for (var i = 0; i < 60; i++) {
            outstr += '<option value="' + i.pad() + '">' + i.pad() + '</option>';
        }
        outstr += '</select>';

        //Create and append select list
        outstr += '&nbsp;&nbsp;<select id="quietmode">';
        outstr += '<option value="On" ' + (myGenerator['QuietMode'] == "On"  ? ' selected="selected" ' : '') + '>Quiet Mode On </option>';
        outstr += '<option value="Off"' + (myGenerator['QuietMode'] == "Off" ? ' selected="selected" ' : '') + '>Quiet Mode Off</option>';
        outstr += '</select><br><br>';

        outstr += '&nbsp;&nbsp;<button id="setexercisebutton" onClick="saveMaintenance();">Set Exercise Time</button>';

        outstr += '<br><br>Generator Time:<br><br>';
        outstr += '&nbsp;&nbsp;<button id="settimebutton" onClick="SetTimeClick();">Set Generator Time</button>';

        outstr += '<br><br>Remote Commands:<br><br>';

        outstr += '&nbsp;&nbsp;&nbsp;&nbsp;<button class="tripleButtonLeft" id="remotestop" onClick="SetStopClick();">Stop Generator</button>';
        outstr += '<button class="tripleButtonCenter" id="remotestart" onClick="SetStartClick();">Start Generator</button>';
        outstr += '<button class="tripleButtonRight"  id="remotetransfer" onClick="SetTransferClick();">Start Generator and Transfer</button><br><br>';

        $("#mydisplay").html(outstr);


        setExerciseSelection();

        $("#days").val(myGenerator['ExerciseDay']);
        $("#hours").val(myGenerator['ExerciseHour']);
        $("#minutes").val(myGenerator['ExerciseMinute']);

        startStartStopButtonsState();

        myGenerator["OldExerciseParameters"] = [myGenerator['ExerciseDay'], myGenerator['ExerciseHour'], myGenerator['ExerciseMinute'], myGenerator['QuietMode'], myGenerator['ExerciseFrequency'], myGenerator['EnhancedExerciseEnabled']];

   }});
}

//*****************************************************************************
// called when Monthly is clicked
//*****************************************************************************
function setExerciseSelection(freq){
   if ((myGenerator['EnhancedExerciseEnabled'] == true) && ($("#ExerciseFrequency").val() == "Monthly")) {
      MonthlyExerciseSelection();
   } else {
      WeekdayExerciseSelection();
   }
}

//*****************************************************************************
// called when Monthly is clicked
//*****************************************************************************
function MonthlyExerciseSelection(){
    if (($('#days option')).lenghth != 28) {
       $("#days").find('option').remove();
       for (var i = 1; i <= 28; i++) {
           $("#days").append('<option value="' + i.pad() + '">' + i.pad() + '</option>');
       }
    }
    $("#days").val(myGenerator['ExerciseDay']);
}
//*****************************************************************************
// called when Monthly is clicked
//*****************************************************************************
function WeekdayExerciseSelection(){
    if ($('#days option').lenghth != 7) {
       $("#days").find('option').remove();
       for (var i = 0; i < DaysOfWeekArray.length; i++) {
           $("#days").append('<option value="' + DaysOfWeekArray[i]+ '">' + DaysOfWeekArray[i]+ '</option>');
       }
    }
    $("#days").val(myGenerator['ExerciseDay']);
}

//*****************************************************************************
// called when Set Remote Stop is clicked
//*****************************************************************************
function SetStopClick(){

    vex.dialog.confirm({
        unsafeMessage: 'Stop generator?<br><span class="confirmSmall">Note: If the generator is powering a load the transfer switch will be deactivated and there will be a cool down period of a few minutes.</span>',
        overlayClosesOnClick: false,
        callback: function (value) {
             if (value == false) {
                return;
             } else {
                SetRemoteCommand("stop")
             }
        }
    });
}

//*****************************************************************************
// called when Set Remote Start is clicked
//*****************************************************************************
function SetStartClick(){

    vex.dialog.confirm({
        unsafeMessage: 'Start generator?<br><span class="confirmSmall">Generator will start, warm up and run idle (without activating the transfer switch).</span>',
        overlayClosesOnClick: false,
        callback: function (value) {
             if (value == false) {
                return;
             } else {
                SetRemoteCommand("start")
             }
        }
    });
}

//*****************************************************************************
// called when Set Remote Tansfer is clicked
//*****************************************************************************
function SetTransferClick(){

    vex.dialog.confirm({
        unsafeMessage: 'Start generator and activate transfer switch?<br><span class="confirmSmall">Generator will start, warm up, then activate the transfer switch.</span>',
        overlayClosesOnClick: false,
        callback: function (value) {
             if (value == false) {
                return;
             } else {
                SetRemoteCommand("starttransfer")
             }
        }
    });
}

//*****************************************************************************
// called when Set Time is clicked
//*****************************************************************************
function SetTimeClick(){

    vex.dialog.confirm({
        unsafeMessage: 'Set generator time to monitor time?<br><span class="confirmSmall">Note: This operation may take up to one minute to complete.</span>',
        overlayClosesOnClick: false,
        callback: function (value) {
             if (value == false) {
                return;
             } else {
                // set exercise time
                var url = baseurl.concat("settime");
                $.getJSON(  url,
                   {settime: " "},
                   function(result){});
             }
        }
    });
}

//*****************************************************************************
// Display the Maintenance Tab
//*****************************************************************************
function DisplayMaintenanceUpdate(){

    $("#Exercise_Time").html(myGenerator['ExerciseFrequency'] + ' ' +
                             myGenerator['ExerciseDay'] + ' ' + myGenerator['ExerciseHour'] + ':' + myGenerator['ExerciseMinute'] +
                             ' Quiet Mode ' + myGenerator['QuietMode']);

    if ((myGenerator['EnhancedExerciseEnabled'] == true) && (myGenerator['ExerciseFrequency'] != myGenerator['OldExerciseParameters'][4])) {
        $("#ExerciseFrequency").val(myGenerator['ExerciseFrequency']);
        setExerciseSelection();
    }

    if (myGenerator['ExerciseDay'] !=  myGenerator['OldExerciseParameters'][0])
       $("#days").val(myGenerator['ExerciseDay']);
    if (myGenerator['ExerciseHour'] !=  myGenerator['OldExerciseParameters'][1])
       $("#hours").val(myGenerator['ExerciseHour']);
    if (myGenerator['ExerciseMinute'] !=  myGenerator['OldExerciseParameters'][2])
       $("#minutes").val(myGenerator['ExerciseMinute']);
    if (myGenerator['QuietMode'] !=  myGenerator['OldExerciseParameters'][3])
       $("#quietmode").val(myGenerator['QuietMode']);

    startStartStopButtonsState();

    myGenerator["OldExerciseParameters"] = [myGenerator['ExerciseDay'], myGenerator['ExerciseHour'], myGenerator['ExerciseMinute'], myGenerator['QuietMode'], myGenerator['ExerciseFrequency'], myGenerator['EnhancedExerciseEnabled']];

    var url = baseurl.concat("maint_json");
    $.ajax({dataType: "json", url: url, timeout: 4000, error: processAjaxError, success: function(result){
        processAjaxSuccess();

       $("#Next_Service_Scheduled").html(result["Maintenance"]["Service"]["Next Service Scheduled"]);
       $("#Total_Run_Hours").html(result["Maintenance"]["Service"]["Total Run Hours"]);
    }});

}

function startStartStopButtonsState(){
   if((baseState === "EXERCISING") || (baseState === "RUNNING")) {
     $("#remotestop").prop("disabled",false);
     $("#remotestart").prop("disabled",true);
     $("#remotetransfer").prop("disabled",true);
   } else {
     $("#remotestop").prop("disabled",true);
     $("#remotestart").prop("disabled",false);
     $("#remotetransfer").prop("disabled",false);
   }

   $("#remotestop").css("background", "#bbbbbb");
   $("#remotestart").css("background", "#bbbbbb");
   $("#remotetransfer").css("background", "#bbbbbb");
   switch (baseState) {
    case "EXERCISING" :
        $("#remotestart").css("background", "#4CAF50");
        $("#remotestop").css("background", "#bbbbbb");
        $("#remotetransfer").css("background", "#bbbbbb");
        break;
    case "RUNNING":
        $("#remotetransfer").css("background", "#4CAF50");
        $("#remotestop").css("background", "#bbbbbb");
        $("#remotestart").css("background", "#bbbbbb");
        break;
     default:
        $("#remotestop").css("background", "#4CAF50");
        $("#remotestart").css("background", "#bbbbbb");
        $("#remotetransfer").css("background", "#bbbbbb");
        break;
   }
}

//*****************************************************************************
// called when Set Exercise is clicked
//*****************************************************************************
function saveMaintenance(){

    try {
        var strDays         = $("#days").val();
        var strHours        = $("#hours").val();
        var strMinutes      = $("#minutes").val();
        var strQuiet        = $("#quietmode").val();
        var strChoice       = ((myGenerator['EnhancedExerciseEnabled'] == true) ? $("#ExerciseFrequency").val() : "Weekly");
        var strExerciseTime = strDays + "," + strHours + ":" + strMinutes + "," + strChoice;

        vex.dialog.confirm({
            unsafeMessage: "Set exercise time to<br>" + strExerciseTime + ", " + strQuiet + "?",
            overlayClosesOnClick: false,
            callback: function (value) {
                 if (value == false) {
                    return;
                 } else {
                    // set exercise time
                    var url = baseurl.concat("setexercise");
                    $.getJSON(  url,
                                {setexercise: strExerciseTime},
                                function(result){});

                    // set quite mode
                    var url = baseurl.concat("setquiet");
                    $.getJSON(  url,
                                {setquiet: strQuiet},
                                function(result){});
                 }
            }
        });
    }
    catch(err) {
        GenmonAlert("Error: invalid selection");
    }
}

//*****************************************************************************
// Display the Logs Tab
//*****************************************************************************
function DisplayLogs(){

    var url = baseurl.concat("logs");
    $.ajax({dataType: "json", url: url, timeout: 4000, error: processAjaxError, success: function(result) {
        processAjaxSuccess();

        var outstr = '<center><div id="annualCalendar"></div></center>';
        outstr += replaceAll(replaceAll(result,'\n','<br/>'),' ','&nbsp');  // replace space with html friendly &nbsp

        $("#mydisplay").html(outstr);

        var date = new Date();
        var data_helper = {};
        var months = 1;
        var loglines = result.split('\n');
        var severity = 0;
        for(var i = 0;i < loglines.length;i++){
            if (loglines[i].indexOf("Alarm Log :") >= 0) {
               severity = 3;
            } else if (loglines[i].indexOf("Service Log :") >= 0) {
               severity = 2;
            } else if (loglines[i].indexOf("Start Stop Log :") >= 0) {
               severity = 1;
            } else {
               var matches = loglines[i].match(/^\s*(\d+)\/(\d+)\/(\d+) (\d+:\d+:\d+) (.*)$/i)
               if ((matches != undefined) && (matches.length == 6)) {
                  if ((12*matches[3]+1*matches[1]+12) <  (12*(date.getYear()-100) + date.getMonth() + 1)) {
                  } else if (data_helper[matches.slice(1,3).join("/")] == undefined) {
                      data_helper[matches.slice(1,3).join("/")] = {count: severity, date: '20'+matches[3]+'-'+matches[1]+'-'+matches[2], dateFormatted: matches[2]+' '+MonthsOfYearArray[(matches[1] -1)]+' 20'+matches[3], title: matches[5].trim()};
                      if (((12*(date.getYear()-100) + date.getMonth() + 1)-(12*matches[3]+1*matches[1])) > months) {
                          months = (12*(date.getYear()-100) + date.getMonth() + 1)-(12*matches[3]+1*matches[1])
                      }
                  } else {
                      data_helper[matches.slice(1,3).join("/")]["title"] = data_helper[matches.slice(1,3).join("/")]["title"] + "<br>" + matches[5].trim();
                      if (data_helper[matches.slice(1,3).join("/")]["count"] < severity)
                         data_helper[matches.slice(1,3).join("/")]["count"] = severity;
                  }
               }
            }
        }
        var data = Object.keys(data_helper).map(function(itm) { return data_helper[itm]; });
        // var data = Object.keys(data_helper).map(itm => data_helper[itm]);
        // var data = Object.values(data_helper);
        // console.log(data);
        var options = {coloring: 'genmon', months: months, labels: { days: true, months: true, custom: {monthLabels: "MMM 'YY"}}, tooltips: { show: true, options: {}}, legend: { show: false}};
        $("#annualCalendar").CalendarHeatmap(data, options);
   }});
}

//*****************************************************************************
// Display the Monitor Tab
//*****************************************************************************
function DisplayMonitor(){

    var url = baseurl.concat("monitor_json");
    $.ajax({dataType: "json", url: url, timeout: 4000, error: processAjaxError, success: function(result) {
        processAjaxSuccess();

        var outstr = json2html(result, "", "root");
        outstr += '<br><br>Update Generator Monitor Software:<br><br>';
        outstr += '&nbsp;&nbsp;<button id="checkNewVersion" onClick="checkNewVersion();">Upgrade to latest version</button>';

        $("#mydisplay").html(outstr);
        currentVersion = result["Monitor"]["Generator Monitor Stats"]["Generator Monitor Version"];
   }});
}

function checkNewVersion(){
    var DisplayStr = 'Checking for latest version...<br><br><div class="progress-bar"><span class="progress-bar-fill" style="width: 0%"></span></div>';
    $('.vex-dialog-buttons').html(DisplayStr);
    $('.progress-bar-fill').queue(function () {
        $(this).css('width', '100%')
    });
    var DisplayStrButtons = {
        NO: {
          text: 'Cancel',
          type: 'button',
          className: 'vex-dialog-button-secondary',
          click: function yesClick () { this.close() }
        },
        YES: {
          text: 'Upgrade',
          type: 'submit',
          className: 'vex-dialog-button-primary',
          click: function yesClick () { }
        }
    }

    var myDialog = vex.dialog.open({
        unsafeMessage: DisplayStr,
        overlayClosesOnClick: false,
        buttons: [
           DisplayStrButtons.NO,
           DisplayStrButtons.YES
        ],
        onSubmit: function(e) {
             e.preventDefault();
             updateSoftware();
             var DisplayStr1 = 'Downloading latest version...';
             var DisplayStr2 = '<div class="progress-bar"><span class="progress-bar-fill" style="width: 0%"></span></div>';
             $('.vex-dialog-message').html(DisplayStr1);
             $('.vex-dialog-buttons').html(DisplayStr2);
             $('.progress-bar-fill').queue(function () {
                  $(this).css('width', '100%')
             });
        }
    });

    // $('.vex-dialog-button-secondary').hide();
    // $('.vex-dialog-button-primary').hide();
    // var url = "https://api.github.com/repos/jgyates/genmon/releases";
    // $.ajax({dataType: "json", url: url, timeout: 4000, error: processAjaxError, success: function(result) {
    //   processAjaxSuccess();
    //   var latestVersion = result[0]["tag_name"];
    //   if (latestVersion != currentVersion) {
          // $('.vex-dialog-message').html("A new version is available.<br>Current Version:" + currentVersion+"<br>New Version:" + latestVersion);
    $('.vex-dialog-message').html("Are you sure you want to update to the latest version?");
    //      $('.vex-dialog-button-secondary').show();
    //      $('.vex-dialog-button-primary').show();
    //   } else {
    //      $('.vex-dialog-message').html("You are runnign the latest version:" + latestVersion);
    //      $('.vex-dialog-button-secondary').show();
    //   }
    // }});
}

//*****************************************************************************
// called when requesting upgrade
//*****************************************************************************
function updateSoftware(){

    // set remote command
    var url = baseurl.concat("updatesoftware");
    $.ajax({
       type: "GET",
       url: url,
       dataType: "json",
       timeout: 0,
       success: function(results){
             /// THIS IS NOT AN EXPECTED RESPONSE!!! genserv.py is expected to restart on it's own before returning a valid value;
             vex.closeAll();
             GenmonAlert("An unexepected outcome occured. Genmon might not have been updated. Please verify manually or try again!");
       },
       error: function(XMLHttpRequest, textStatus, errorThrown){
             var DisplayStr1 = 'Restarting...';
             var DisplayStr2 = '<div class="progress-bar"><span class="progress-bar-fill" style="width: 0%"></span></div>';
             $('.vex-dialog-message').html(DisplayStr1);
             $('.vex-dialog-buttons').html(DisplayStr2);
             $('.progress-bar-fill').queue(function () {
                  $(this).css('width', '100%')
             });
             setTimeout(function(){ vex.closeAll(); location.reload();  }, 10000);
       }


    });
}


//*****************************************************************************
// Display the Notification Tab
//*****************************************************************************

// Additional Carriers are listed here: https://teamunify.uservoice.com/knowledgebase/articles/57460-communication-email-to-sms-gateway-list
var textServers = {s01_email:      ["Email", "images/option1.png", ""],
                   s02_att:        ["AT&T", "images/option2.png", "@txt.att.net"],
                   s03_verizon:    ["Verizon", "images/option3.png", "@vtext.com"],
                   s04_tmobile:    ["T-Mobile USA", "images/option4.png", "@tmomail.net"],
                   s05_sprint:     ["Sprint", "images/option5.png", "@messaging.sprintpcs.com"],
                   s06_boost:      ["Boost Mobile", "images/option6.png", "@myboostmobile.com"]};

function DisplayNotifications(){
    var url = baseurl.concat("notifications");
    $.ajax({dataType: "json", url: url, timeout: 4000, error: processAjaxError, success: function(result){
        processAjaxSuccess();

        var  outstr = 'Notification Recepients:<br><br>';
        outstr += '<form id="formNotifications">';
        outstr += '<table id="allnotifications" border="0"><tbody>';

        outstr += '<tr><td></td><td></td><td align="center">Email Address:</td><td align="center">Notifications:</td></tr>';

        $.each(Object.keys(result), function(i, key) {

            var displayText = key;
            var displayKey = "s01_email";
            if (showMajorUSMobileCarrierTextEmail) {
               $.each(Object.keys(textServers), function(j, service) {
                  if ((service != "email") && (key.indexOf(textServers[service][2]) > 0)) {
                     displayKey = service;
                     displayText = key.replace(textServers[service][2], "");
                  }
               });
            }
            outstr += renderNotificationLine(i, displayKey, displayText, result[key][1]);
        });
        outstr += '</tbody></table></form><br>';
        outstr += '<button value="+Add" id="addRow">+Add</button>&nbsp;&nbsp;&nbsp;&nbsp;<button id="setnotificationsbutton" onClick="saveNotifications()">Save</button>';

        $("#mydisplay").html(outstr);
        $(".msDropDown").msDropDown();
        $(".dataMask").mask('(000) 000-0000', {placeholder: "(___) ___-____"});

        $('.notificationTypes').selectize({
            plugins: ['remove_button'],
            delimiter: ','
        });

        var rowcount = Object.keys(result).length;

        $(document).ready(function() {
           $("#addRow").click(function () {
              $("#allnotifications").each(function () {
                  var outstr = renderNotificationLine(rowcount, "", "", "")
                  if ($('tbody', this).length > 0) {
                      $('tbody', this).append(outstr);
                  } else {
                      $(this).append(outstr);
                  }
                  if (showMajorUSMobileCarrierTextEmail)
                    $("#type_"+rowcount).msDropDown();
                  $("#notif_"+rowcount).selectize({
                      plugins: ['remove_button'],
                      delimiter: ','
                    });

                  rowcount++;
                  $(".removeRow").on('click', function(){
                     $('table#allnotifications tr#row_'+$(this).attr("rowcount")).remove();
                  });
              });
           });

           $(".removeRow").on('click', function(){
              $('table#allnotifications tr#row_'+$(this).attr("rowcount")).remove();
           });
        });
   }});
}

function renderNotificationLine(rowcount, line_type, line_text, line_perms) {

   var outstr = '<tr id="row_' + rowcount + '"><td nowrap><div rowcount="' + rowcount + '" class="removeRow"><img src="images/remove.png" height="24px" width="24px"></div></td>';
   if (showMajorUSMobileCarrierTextEmail) {
     outstr += '<td nowrap><select class="msDropDown" name="type_' + rowcount + '" style="width:180px" id="type_' + rowcount + '" onChange="setNotificationFieldValidation('+rowcount+')">';
     outstr += Object.keys(textServers).sort().map(function(key) { return '<option value="'+key+'" data-image="'+textServers[key][1]+'" '+((key==line_type) ? 'selected' : '')+'>'+textServers[key][0]+'</option>'; }).join();
     outstr += '</select>&nbsp;&nbsp;</td>';
   } else {
     outstr += '<td nowrap><input type="hidden" name="type_' + rowcount + '" value="s01_email">';
   }
   outstr += '<td nowrap><input id="email_' + rowcount + '" class="notificationEmail" name="email_' + rowcount + '" type="text" value="'+line_text+'" '+ ((line_type != "s01_email") ? 'class="dataMask"' : '') +' ></td>';

   outstr += '<td width="300px" nowrap><select multiple style="width:290px" class="notificationTypes" name="notif_' + rowcount + '" id="notif_' + rowcount + '" oldValue="'+line_perms+'" placeholder="Select types of notifications...">';
   outstr += ["outage", "error", "warn", "info"].map(function(key) { return '<option value="'+key+'" '+(((line_perms == undefined) || (line_perms.indexOf(key) != -1) || (line_perms == "")) ? ' selected ' : '')+'>'+key+'</option>'; }).join();
   outstr += '</select></td>';

   return outstr;
}


function setNotificationFieldValidation(rowcount) {
    if ($("#type_"+rowcount).val() == "s01_email") {
       $("#email_"+rowcount).unmask();
    } else {
       $("#email_"+rowcount).mask('(000) 000-0000', {placeholder: "(___) ___-____"});
    }
}

//*****************************************************************************
// called when Save Notifications is clicked
//*****************************************************************************
function saveNotifications(){

    var DisplayStr = "Save notifications? Are you sure?";
    var DisplayStrAnswer = false;
    var DisplayStrButtons = {
        NO: {
          text: 'Cancel',
          type: 'button',
          className: 'vex-dialog-button-secondary',
          click: function noClick () {
            DisplayStrAnswer = false
            this.close()
          }
        },
        YES: {
          text: 'OK',
          type: 'submit',
          className: 'vex-dialog-button-primary',
          click: function yesClick () {
            DisplayStrAnswer = true
          }
        }
    }


    var blankEmails = 0;
    $.each($("input[name^='email_']"), function( index, type ){
        if ($(this).val().trim() == "") {
           blankEmails++
        }
    });
    if (blankEmails > 0) {
       GenmonAlert("Recepients cannot be blank.<br>You have "+blankEmails+" blank lines.");
       return
    }

    vex.dialog.open({
        unsafeMessage: DisplayStr,
        overlayClosesOnClick: false,
        buttons: [
           DisplayStrButtons.NO,
           DisplayStrButtons.YES
        ],
        onSubmit: function(e) {
           if (DisplayStrAnswer) {
             DisplayStrAnswer = false; // Prevent recursive calls.
             e.preventDefault();
             saveNotificationsJSON();
             var DisplayStr2 = '<div class="progress-bar"><span class="progress-bar-fill" style="width: 0%"></span></div>';
             $('.vex-dialog-buttons').html(DisplayStr2);
             $('.progress-bar-fill').queue(function () {
                  $(this).css('width', '100%')
             });
             setTimeout(function(){ vex.closeAll(); }, 10000);
           }
        }
    })
}

function saveNotificationsJSON(){
    try {
        var fields = {};

        $("input[name^='email_']").each(function() {
            var thisRow = ($(this).attr('id').split("_"))[1];
            var thisType  = $('#type_'+thisRow).val();
            var thisEmail = $(this).val();
            var thisVal   = (($('#notif_'+thisRow).val().length == 4) ? "" : $('#notif_'+thisRow).val().join(","));
            if ((showMajorUSMobileCarrierTextEmail) && (thisType != "s01_email")) {
               thisEmail = thisEmail.replace(/\D/g,'')+textServers[thisType][2];
            }
            fields[thisEmail] = thisVal;
        });
        // console.log(fields);

        // save settings
        var url = baseurl.concat("setnotifications");
        $.getJSON(  url,
                    {setnotifications: $.param(fields)},
                    function(result){
        });

    } catch(err) {
        GenmonAlert("Error: invalid selection");
    }
}

//*****************************************************************************
// Display the Settings Tab
//*****************************************************************************
function DisplaySettings(){

    var url = baseurl.concat("settings");
    $.ajax({dataType: "json", url: url, timeout: 4000, error: processAjaxError, success: function(result){
        processAjaxSuccess();

        var outstr = '<form class="idealforms" novalidate  id="formSettings">';
        var settings =  getSortedKeys(result, 2);
        for (var index = 0; index < settings.length; ++index) {
            var key = settings[index];
            if (key == "sitename") {
              outstr += '</table></fieldset><br>General Settings:<fieldset id="generalSettings"><table id="allsettings" border="0">';
              outstr += '<tr><td width="25px">&nbsp;</td><td width="300px">' + result[key][1] + '</td><td>' + printSettingsField(result[key][0], key, result[key][3], result[key][4], result[key][5]) + '</td></tr>';
            } else if (key == "nominalfrequency") {
              outstr += '</table></fieldset><br><br><table width="100%" border="0"><tr><td nowrap>Generator Model Specific Settings&nbsp;&nbsp;</td><td width="80%"><hr></td></tr></table>';
              outstr += '<fieldset id="modelSettings"><table id="allsettings" border="0">';
              outstr += '<tr><td width="25px">&nbsp;</td><td width="300px">' + result[key][1] + '</td><td>' + printSettingsField(result[key][0], key, result[key][3], result[key][4], result[key][5]) + '</td></tr>';
            } else if (key == "usehttps") {
              outstr += '</table></fieldset><br><br><table width="100%" border="0"><tr><td nowrap width="90px">';
              outstr += printSettingsField(result[key][0], key, result[key][3], "", "", "usehttpsChange(true);");
              outstr += '</td><td nowrap>&nbsp;&nbsp;Optional - Webserver Security Settings&nbsp;&nbsp;</td><td width="80%"><hr></td></tr></table>';
              outstr += '<fieldset id="securitySettings"><table id="allsettings" border="0">';
            } else if (key == "disableemail") {
              outstr += '</table></fieldset><br><br><table width="100%" border="0"><tr><td nowrap width="90px">';
              outstr += '<input id="' + key + '" name="' + key + '" type="hidden"' +
                         (((typeof result[key][3] !== 'undefined' ) && (result[key][3].toString() == "true")) ? ' value="true" ' : ' value="false" ') +
                         (((typeof result[key][3] !== 'undefined' ) && (result[key][3].toString() == "true")) ? ' oldValue="true" ' : ' oldValue="false" ') + '>';
              outstr += printSettingsField("boolean", "outboundemail", (((typeof result[key][3] !== 'undefined' ) && (result[key][3].toString() == "true")) ? false : true), "", "", "outboundEmailChange(true);");
              outstr += '</td><td nowrap>&nbsp;&nbsp;Optional - Outbound Email Settings&nbsp;&nbsp;</td><td width="80%"><hr></td></tr></table>';
              outstr += '<fieldset id="outboundEmailSettings"><table id="allsettings" border="0">';
            } else if (key == "imap_server") {
              outstr += '</table></fieldset><br><br><table width="100%" border="0"><tr><td nowrap width="90px:>';
              outstr += printSettingsField("boolean", "inboundemail", ((result[key][3] != "") ? true : false), "", "", "inboundemailChange(true);");
              outstr += '</td><td nowrap>&nbsp;&nbsp;Optional - Inbound Email Commands Processing&nbsp;&nbsp;</td><td width="80%"><hr></td></tr></table>';
              outstr += '<fieldset id="inboundEmailSettings"><table id="allsettings" border="0">';
              outstr += '<tr><td width="25px">&nbsp;</td><td width="300px">' + result[key][1] + '</td><td>' + printSettingsField(result[key][0], key, result[key][3], result[key][4], result[key][5]) + '</td></tr>';
            } else if (key == "useselfsignedcert") {
              outstr += '<tr><td width="25px">&nbsp;</td><td width="300px">' + result[key][1] + '</td><td>' + printSettingsField(result[key][0], key, result[key][3], result[key][4], result[key][5], "useselfsignedcertChange(true);") + '</td></tr>';
              outstr += '</table><fieldset id="selfsignedSettings"><table id="allsettings" border="0">';
            } else if (key == "http_user") {
              outstr += '</table></fieldset><table id="allsettings" border="0">';
              outstr += '<tr><td width="25px">&nbsp;</td><td width="300px">' + result[key][1] + '</td><td>' + printSettingsField(result[key][0], key, result[key][3], result[key][4], result[key][5], "useselfsignedcertChange(true);") + '</td></tr>';
            } else if (key == "http_port") {
              outstr += '</table></fieldset><fieldset id="noneSecuritySettings"><table id="allsettings" border="0">';
              outstr += '<tr><td width="25px">&nbsp;</td><td width="300px">' + result[key][1] + '</td><td>' + printSettingsField(result[key][0], key, result[key][3], result[key][4], result[key][5], "useselfsignedcertChange(true);") + '</td></tr>';
            } else if (key == "favicon") {
              outstr += '</table></fieldset><table id="allsettings" border="0">';
              outstr += '<tr><td width="25px">&nbsp;</td><td width="300px">' + result[key][1] + '</td><td>' + printSettingsField(result[key][0], key, result[key][3], result[key][4], result[key][5], "useselfsignedcertChange(true);") + '</td></tr>';
            } else {
              outstr += '<tr><td width="25px">&nbsp;</td><td width="300px">' + result[key][1] + '</td><td>' + printSettingsField(result[key][0], key, result[key][3], result[key][4], result[key][5]) + '</td></tr>';
            }
        }
        outstr += '</table></fieldset></form><br>';
        outstr += '<button id="setsettingsbutton" onClick="saveSettings()">Save</button>';

        $("#mydisplay").html(outstr);
        $('input').lc_switch();
        $.extend($.idealforms.rules, {
           // InternetAddress: /^[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,5}(\/.*)?$/g, /// Warning - this does nto seem to work well.
           // The rule is added as "ruleFunction:arg1:arg2"
           InternetAddress: function(input, value, arg1, arg2) {
             var regex = RegExp("^[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,5}(\/.*)?$", 'g');
             return regex.test(value);
           },
           UnixFile: function(input, value, arg1, arg2) {
             var regex = RegExp("^(\/[^\/]+)+$", 'g');
             return regex.test(value);
           },
           UnixDir: function(input, value, arg1, arg2) {
             var regex = RegExp("^(\/[^\/]+)+\/$", 'g');
             return regex.test(value);
           },
           UnixDevice: function(input, value, arg1, arg2) {
             var regex = RegExp("^\/dev(\/[^\/]+)+$", 'g');
             return regex.test(value);
           }
        });
        $.extend($.idealforms.errors, {
            InternetAddress: 'Must be a valid address from an internet server, eg. mail.google.com',
            UnixFile: 'Must be a valid UNIX file',
            UnixDir: 'Must be a valid UNIX path',
            UnixDevice: 'Must be a valid UNIX file path starting with /dev/'
        });
        $('form.idealforms').idealforms({
           tooltip: '.tooltip',
           silentLoad: true,
        });

        usehttpsChange(false);
        outboundEmailChange(false);
        inboundemailChange(false);
        useselfsignedcertChange(false);
   }});

}

function usehttpsChange(animation) {
   if ($("#usehttps").is(":checked")) {
      $("#noneSecuritySettings").hide((animation ? 300 : 0));
      $("#securitySettings").show((animation ? 300 : 0));

      if (!$("#useselfsignedcert").is(":checked")) {
         $("#selfsignedSettings").show((animation ? 300 : 0));
      }
   } else {
      $("#securitySettings").hide((animation ? 300 : 0));
      $("#noneSecuritySettings").show((animation ? 300 : 0));
   }
}

function useselfsignedcertChange(animation) {
   if ($("#useselfsignedcert").is(":checked")) {
      $("#selfsignedSettings").hide((animation ? 300 : 0));
   } else {
      $("#selfsignedSettings").show((animation ? 300 : 0));
   };
}

function outboundEmailChange(animation) {
   if($("#outboundemail").is(":checked")) {
      $("#outboundEmailSettings").show((animation ? 300 : 0));
      $("#disableemail").val("false");
   } else {
      $("#outboundEmailSettings").hide((animation ? 300 : 0));
      $("#disableemail").val("true");
   }
}

function inboundemailChange(animation) {
   if($("#inboundemail").is(":checked")) {
      $("#inboundEmailSettings").show((animation ? 300 : 0));
   } else {
      $("#inboundEmailSettings").hide((animation ? 300 : 0));
   }
}

function printSettingsField(type, key, value, tooltip, validation, callback) {
   var outstr = "";
   switch (type) {
     case "string":
     case "password":
       outstr += '<div class="field idealforms-field">' +
                 '<input id="' + key + '" style="width: 300px;" name="' + key + '" type="' + ((type == "password") ? "password" : "text") + '" ' +
                  (typeof value === 'undefined' ? '' : 'value="' + replaceAll(value, '"', '&quot;') + '" ') +
                  (typeof value === 'undefined' ? '' : 'oldValue="' + replaceAll(value, '"', '&quot;') + '" ') +
                  (typeof validation === 'undefined' ? '' : 'data-idealforms-rules="' + validation + '" ') + '>' +
                 '<span class="error" style="display: none;"></span>' +
                  (((typeof tooltip === 'undefined' ) || (tooltip.trim() == "")) ? '' : '<span class="tooltip" style="display: none;">' + replaceAll(tooltip, '"', '&quot;') + '</span>') +
                 '</div>';
       break;
     case "int":
       outstr += '<div class="field idealforms-field">' +
                 '<input id="' + key + '" style="width: 150px;" name="' + key + '" type="text" ' +
                  (typeof value === 'undefined' ? '' : 'value="' + value.toString() + '" ') +
                  (typeof value === 'undefined' ? '' : 'oldValue="' + value.toString() + '" ') +
                  (typeof validation === 'undefined' ? '' : 'data-idealforms-rules="' + validation + '" ') + '>' +
                 '<span class="error" style="display: none;"></span>' +
                  (((typeof tooltip === 'undefined' ) || (tooltip.trim() == "")) ? '' : '<span class="tooltip" style="display: none;">' + replaceAll(tooltip, '"', '&quot;') + '</span>') +
                 '</div>';
       break;
     case "boolean":
       outstr += '<div class="field idealforms-field" onmouseover="showIdealformTooltip($(this))" onmouseout="hideIdealformTooltip($(this))">' +
                 '<input id="' + key + '" name="' + key + '" type="checkbox" ' +
                  ((callback != "") ? ' data-callback="' + callback + ';" ' : "") +
                  (((typeof value !== 'undefined' ) && (value.toString() == "true")) ? ' checked ' : '') +
                  (((typeof value !== 'undefined' ) && (value.toString() == "true")) ? ' oldValue="true" ' : ' oldValue="false" ') + '>' +
                  (((typeof tooltip === 'undefined' ) || (tooltip.trim() == "")) ? '' : '<span class="tooltip" style="display: none;">' + replaceAll(tooltip, '"', '&quot;') + '</span><i class="icon"></i>') +
                 '</div>';
       break;
     case "list":
       outstr += '<div class="field idealforms-field" onmouseover="showIdealformTooltip($(this))" onmouseout="hideIdealformTooltip($(this))">' +
                 '<select id="' + key + '" style="width: 300px;" name="' + key + '" ' +
                  (typeof value === 'undefined' ? '' : 'value="' + replaceAll(value, '"', '&quot;') + '" ') +
                  (typeof value === 'undefined' ? '' : 'oldValue="' + replaceAll(value, '"', '&quot;') + '" ') + '>' +
                 $.map(validation.split(","), function( val, i ) { return '<option class="optionClass" name="'+val+'" '+((val==value) ? 'selected' : '')+'>'+val+'</option>'}).join() +
                 '</select>' +
                  (((typeof tooltip === 'undefined' ) || (tooltip.trim() == "")) ? '' : '<span class="tooltip" style="display: none;">' + replaceAll(tooltip, '"', '&quot;') + '</span><i class="icon"></i>') +
                 '</div>';
       break;
     default:
       break;
   }
   return outstr;
}

function showIdealformTooltip(obj) {
    obj.find(".tooltip").show()
}

function hideIdealformTooltip(obj) {
    obj.find(".tooltip").hide()
}

function getSortedKeys(obj, index) {
    var keys = []; for (var key in obj) keys.push(key);
    return keys.sort(function(a,b){return obj[a][index]-obj[b][index]});
}

//*****************************************************************************
// called when Save Settings is clicked
//*****************************************************************************
function saveSettings(){

    var DisplayStr = "Save settings? Are you sure?";
    var DisplayStrAnswer = false;
    var DisplayStrButtons = {
        NO: {
          text: 'Cancel',
          type: 'button',
          className: 'vex-dialog-button-secondary',
          click: function noClick () {
            DisplayStrAnswer = false
            this.close()
          }
        },
        YES: {
          text: 'OK',
          type: 'submit',
          className: 'vex-dialog-button-primary',
          click: function yesClick () {
            DisplayStrAnswer = true
          }
        }
    }

    vex.dialog.open({
        unsafeMessage: DisplayStr,
        overlayClosesOnClick: false,
        buttons: [
           DisplayStrButtons.NO,
           DisplayStrButtons.YES
        ],
        onSubmit: function(e) {
           if (DisplayStrAnswer) {
             DisplayStrAnswer = false; // Prevent recursive calls.
             e.preventDefault();
             saveSettingsJSON();
             var DisplayStr1 = 'Saving...';
             var DisplayStr2 = '<div class="progress-bar"><span class="progress-bar-fill" style="width: 0%"></span></div>';
             $('.vex-dialog-message').html(DisplayStr1);
             $('.vex-dialog-buttons').html(DisplayStr2);
             $('.progress-bar-fill').queue(function () {
                  $(this).css('width', '100%')
             });
             setTimeout(function(){
                vex.closeAll();
                if ($('#sitename').val() != $('#sitename').attr('oldValue')) { myGenerator["sitename"] = $('#sitename').val(); SetHeaderValues(); }
                if ($('#nominalRPM').val() != $('#nominalRPM').attr('oldValue')) { myGenerator["nominalRPM"] = $('#nominalRPM').val(); }
                if ($('#nominalfrequency').val() != $('#nominalfrequency').attr('oldValue')) { myGenerator["nominalfrequency"] = $('#sitename').val(); }
                if ($('#nominalKW').val() != $('#nominalKW').attr('oldValue')) { myGenerator["nominalKW"] = $('#nominalKW').val(); }
                if ($('#fueltype').val() != $('#fueltype').attr('oldValue')) { myGenerator["fueltype"] = $('#fueltype').val(); }
                if ($('#favicon').val() != $('#favicon').attr('oldValue')) { changeFavicon($('#favicon').val()); }
                if (($('#enhancedexercise').prop('checked')  === true ? "true" : "false") != $('#enhancedexercise').attr('oldValue')) { myGenerator['EnhancedExerciseEnabled'] = ($('#enhancedexercise').prop('checked')  === true ? "true" : "false") }
             }, 10000);
           }
        }
    })
}

function saveSettingsJSON() {
    try {
        var fields = {};

        $('#formSettings input').each(function() {
            var oldValue = $(this).attr('oldValue');
            var currentValue = (($(this).attr('type') == "checkbox") ? ($(this).prop('checked') === true ? "true" : "false") : $(this).val());
            if (oldValue != currentValue) {
               fields[$(this).attr('name')] = currentValue;
            }
        });
        $('#formSettings select').each(function() {
            var oldValue = $(this).attr('oldValue');
            var currentValue = $(this).val();
            if (oldValue != currentValue) {
               fields[$(this).attr('name')] = currentValue;
            }
        });

        // save settings
        var url = baseurl.concat("setsettings");
        $.getJSON(  url,
                    {setsettings: $.param(fields)},
                    function(result){
        });

    } catch(err) {
        GenmonAlert("Error: invalid selection");
    }
}

//*****************************************************************************
// DisplayRegisters - Shows the raw register data.
//*****************************************************************************
var fadeOffTime = 60;
var BaseRegistersDescription = { "0000" : "Product line",
                                 "0005" : "Exercise Time HH:MM (Read Only)",
                                 "0006" : "Exercise Time Hi Byte = Day of Week 00=Sunday 01=Monday, Low Byte = 00=quiet=no, 01=yes",
                                 "0007" : "Engine RPM",
                                 "0008" : "Engine Frequency Hz",
                                 "000a" : "Battery Voltage",
                                 "000c" : "Engine Run Hours (Nexus, EvoAC)",
                                 "000e" : "Generator Time HH:MM",
                                 "000f" : "Generator Time Hi = month, Lo = day of the month",
                                 "0010" : "Generator Time Hi Day of Week, Lo = year",
                                 "0011" : "Utility Threshold",
                                 "0012" : "Output voltage",
                                 "001a" : "Hours until next service",
                                 "002a" : "Hardware  Version (high byte), Firmware version (low byte)",
                                 "0059" : "Set Voltage from Dealer Menu (not currently used) (EvoLC)",
                                 "023b" : "Pick Up Voltage (EvoLC)",
                                 "023e" : "Exercise time duration (EvoLC)",
                                 "0054" : "Hours since generator activation (hours of protection) (EvoLC)",
                                 "005f" : "Engine Run Minutes (EvoLC)",
                                 "01f1" : "Unknown Status ",
                                 "01f2" : "Unknown Status",
                                 "01f3" : "Unknown Status (EvoAC)",
                                 "001b" : "Unknown",
                                 "001c" : "Unknown",
                                 "001d" : "Unknown",
                                 "001e" : "Unknown",
                                 "001f" : "Unknown",
                                 "0020" : "Unknown",
                                 "0021" : "Unknown",
                                 "0022" : "Unknown",
                                 "0019" : "Model Identity (EvoAC)",
                                 "0057" : "Unknown Status",
                                 "0055" : "Unknown",
                                 "0056" : "Unknown Status",
                                 "005a" : "Unknown",
                                 "000d" : "Bit changes when the controller is updating registers.",
                                 "003c" : "Raw RPM Sensor",
                                 "0058" : "CT Output (EvoLC)",
                                 "005d" : "Unknown Sensor (EvoLC)",
                                 "05ed" : "Ambient Temp Sensor (EvoLC)",
                                 "05ee" : "Battery Charger Sensor (EvoLC)",
                                 "05f5" : "Unknown Status (EvoAC, Nexus)",
                                 "05fa" : "Unknown Status (EvoAC, Nexus)",
                                 "0034" : "Unknown Sensor (Nexus, EvoAC)",
                                 "0032" : "Unknown Sensor (Nexus, EvoAC)",
                                 "0033" : "Unknown Sensor (EvoAC)",
                                 "0036" : "Unknown",
                                 "0037" : "CT Output (EvoAC)",
                                 "0038" : "Unknown Sensor (Nexus, EvoAC)",
                                 "003a" : "Unknown Sensor (Nexus, EvoAC)",
                                 "003b" : "Unknown Sensor (Nexus, EvoAC)",
                                 "002b" : "UnknownSensor (Temp?) (EvoAC)",
                                 "0208" : "Unknown (EvoAC)",
                                 "002e" : "Exercise Day",
                                 "002c" : "Exercise Time HH:MM",
                                 "002d" : "Weekly, Biweekly, Monthly Exercise (EvoAC)",
                                 "002f" : "Quite Mode (EvoAC)",
                                 "005c" : "Unknown",
                                 "0001" : "Switch, Engine and Alarm Status",
                                 "05f4" : "Current Output E1 (EvoAC)",
                                 "05f5" : "Current Output E2 (EvoAC)",
                                 "05f6" : "Current Calibration E1 (EvoAC)",
                                 "05f7" : "Current Calibration E2 (EvoAC)",
                                 "0053" : "Output relay status register (EvoLC)",
                                 "0052" : "Input status register (sensors) (Evo LC)",
                                 "0009" : "Utility Voltage",
                                 "05f1" : "Last Alarm Code (Evo)",
                                 "01f4" : "Serial Number"};

function DisplayRegistersFull()
{
    var outstr = 'Live Register View:<br><br>';
    outstr += '<center><table width="80%" border="0"><tr>';

    $.each(Object.keys(regHistory["updateTime"]).sort(), function(i, reg_key) {
        if ((i % 4) == 0){
        outstr += '</tr><tr>';
        }

        var reg_val = regHistory["_10m"][reg_key][0];

        outstr += '<td width="25%" class="registerTD">';
        outstr +=     '<table width="100%" heigth="100%" id="val_'+reg_key+'">';
        outstr +=     '<tr><td align="center" class="registerTDtitle">' + BaseRegistersDescription[reg_key] + '</td></tr>';
        outstr +=     '<tr><td align="center" class="registerTDsubtitle">(' + reg_key + ')</td></tr>';
        outstr +=     '<tr><td align="center" class="tooltip registerChart" id="content_'+reg_key+'">';
        outstr +=        ((reg_key == "01f4") ? '<span class="registerTDvalMedium">HEX:<br>' + reg_val + '</span>' : 'HEX: '+reg_val) + '<br>';
        outstr +=        ((reg_key == "01f4") ? '' : '<span class="registerTDvalSmall">DEC: ' + parseInt(reg_val, 16) + ' | HI:LO: '+parseInt(reg_val.substring(0,2), 16)+':'+parseInt(reg_val.substring(2,4), 16)+'</span>');
        outstr +=     '</td></tr>';
        outstr +=     '</table>';
        outstr += '</td>';
    });
    if ((regHistory["_10m"].length % 4) > 0) {
      for (var i = (regHistory["_10m"].length % 4); i < 4; i++) {
         outstr += '<td width="25%" class="registerTD"></td>';
      }
    }
    outstr += '</tr></table>';
    outstr += '<br><img id="print10" class="printButton" onClick="printRegisters(10)" src="images/print10.png" width="36px" height="36px">&nbsp;&nbsp;&nbsp;';
    outstr += '<img id="print60" class="printButton" onClick="printRegisters(60)" src="images/print60.png" width="36px" height="36px">&nbsp;&nbsp;&nbsp;';
    outstr += '<img id="print24" class="printButton" onClick="printRegisters(24)" src="images/print24.png" width="36px" height="36px"><br>';
    outstr += '</center>';

    $("#mydisplay").html(outstr);
    UpdateRegistersColor();
    $('.registerChart').tooltipster({
        minWidth: '280px',
        maxWidth: '280px',
        animation: 'fade',
        updateAnimation: 'fade',
        contentAsHTML: 'true',
        delay: 100,
        animationDuration: 200,
        interactive: true,
        content: '<div class="regHistoryCanvas"></div>',
        side: ['top', 'left'],
        functionReady: function(instance, helper) {
            var regId = $(helper.origin).attr('id').replace(/content_/g, '');
            instance.content('<div class="regHistoryCanvas"><table><tr><td class="regHistoryCanvasTop">' +
                             '  <div id="'+regId+'_graph1" class="regHistoryPlot"></div>' +
                             '  <div id="'+regId+'_graph2" class="regHistoryPlot"></div>' +
                             '  <div id="'+regId+'_graph3" class="regHistoryPlot"></div>' +
                             '</td></tr><tr><td class="regHistoryCanvasBottom"><center>' +
                             '  <div class="regHistory selection" onClick="$(\'.regHistory\').removeClass(\'selection\');$(this).addClass(\'selection\');$(\'#'+regId+'_graph1\').css(\'display\', \'block\');$(\'#'+regId+'_graph2\').css(\'display\', \'none\');$(\'#'+regId+'_graph3\').css(\'display\', \'none\');">10 min</div> | ' +
                             '  <div class="regHistory" onClick="$(\'.regHistory\').removeClass(\'selection\');$(this).addClass(\'selection\');$(\'#'+regId+'_graph1\').css(\'display\', \'none\');$(\'#'+regId+'_graph2\').css(\'display\', \'block\');$(\'#'+regId+'_graph3\').css(\'display\', \'none\');">1 hr</div> | ' +
                             '  <div class="regHistory" onClick="$(\'.regHistory\').removeClass(\'selection\');$(this).addClass(\'selection\');$(\'#'+regId+'_graph1\').css(\'display\', \'none\');$(\'#'+regId+'_graph2\').css(\'display\', \'none\');$(\'#'+regId+'_graph3\').css(\'display\', \'block\');">24 hr</div>' +
                             '</center></td></tr></table></div>');
            var plot_data1 = [];
            var plot_data2 = [];
            var plot_data3 = [];
            for (var i = 120; i >= 0; --i) {
               if (regHistory["_10m"][regId].length > i)
                   plot_data1.push([-i/12, parseInt(regHistory["_10m"][regId][i], 16)]);
               if (regHistory["_60m"][regId].length > i)
                   plot_data2.push([-i/2, parseInt(regHistory["_60m"][regId][i], 16)]);
               if (regHistory["_24h"][regId].length > i)
                   plot_data3.push([-i/5, parseInt(regHistory["_24h"][regId][i], 16)]);
            }
            var plot1 = $.jqplot(regId+'_graph1', [plot_data1], {
                               axesDefaults: { tickOptions: { textColor: '#999999', fontSize: '8pt' }},
                               axes: { xaxis: { label: "Time (Minutes ago)", labelOptions: { fontFamily: 'Arial', textColor: '#AAAAAA', fontSize: '9pt' }, min:-10, max:0 } }
                             });
            var plot2 = $.jqplot(regId+'_graph2', [plot_data2], {
                               axesDefaults: { tickOptions: { textColor: '#999999', fontSize: '8pt' }},
                               axes: { xaxis: { label: "Time (Minutes ago)", labelOptions: { fontFamily: 'Arial', textColor: '#AAAAAA', fontSize: '9pt' }, min:-60, max:0 } }
                             });
            var plot3 = $.jqplot(regId+'_graph3', [plot_data3], {
                               axesDefaults: { tickOptions: { textColor: '#999999', fontSize: '8pt' }},
                               axes: { xaxis: { label: "Time (Hours ago)", labelOptions: { fontFamily: 'Arial', textColor: '#AAAAAA', fontSize: '9pt' }, min:-24, max:0 } }
                             });
            $('#'+regId+'_graph2').css('display', 'none');
            $('#'+regId+'_graph3').css('display', 'none');
        }
    });

}

function UpdateRegisters(init, printToScreen)
{
    if (init) {
      var now = new moment();
      regHistory["historySince"] = now.format("D MMMM YYYY H:mm:ss");
      regHistory["count_60m"] = 0;
      regHistory["count_24h"] = 0;
    }

    var url = baseurl.concat("registers_json");
    $.ajax({dataType: "json", url: url, timeout: 4000, error: processAjaxError, success: function(RegData){
        processAjaxSuccess();

        $.each(RegData.Registers["Base Registers"], function(i, item) {
            var reg_key = Object.keys(item)[0]
            var reg_val = item[Object.keys(item)[0]];

            if ((init) || (regHistory["_10m"][reg_key] == undefined)) {
                regHistory["updateTime"][reg_key] = 0;
                regHistory["_10m"][reg_key] = [reg_val];
                regHistory["_60m"][reg_key] = [reg_val, reg_val];
                regHistory["_24h"][reg_key] = [reg_val, reg_val];
            } else {
               if (reg_val != regHistory["_10m"][reg_key][0]) {
                  regHistory["updateTime"][reg_key] = new Date().getTime();

                  if (printToScreen) {
                    var outstr  = ((reg_key == "01f4") ? '<span class="registerTDvalMedium">HEX:<br>' + reg_val + '</span>' : 'HEX: '+reg_val) + '<br>';
                        outstr += ((reg_key == "01f4") ? '' : '<span class="registerTDvalSmall">DEC: ' + parseInt(reg_val, 16) + ' | HI:LO: '+parseInt(reg_val.substring(0,2), 16)+':'+parseInt(reg_val.substring(2,4), 16)+'</span>');
                    $("#content_"+reg_key).html(outstr);
                  }
               }
            }
            regHistory["_10m"][reg_key].unshift(reg_val);
            if  (regHistory["_10m"][reg_key].length > 120) {
               regHistory["_10m"][reg_key].pop  // remove the last element
            }

            if (regHistory["count_60m"] >= 12) {
               var min = 0;
               var max = 0;
               for (var i = 1; i <12; i++) {
                   if (regHistory["_10m"][reg_key][i] > regHistory["_10m"][reg_key][max])
                      max = i;
                   if (regHistory["_10m"][reg_key][i] < regHistory["_10m"][reg_key][min])
                      min = i;
               }
               regHistory["_60m"][reg_key].unshift(regHistory["_10m"][reg_key][((min > max) ? min : max)], regHistory["_10m"][reg_key][((min > max) ? max : min)]);

               if  (regHistory["_60m"][reg_key].length > 120)
                 regHistory["_60m"][reg_key].splice(-2, 2);  // remove the last 2 element
            }

            if (regHistory["count_60m"] >= 288) {
               var min = 0;
               var max = 0;
               for (var i = 1; i <24; i++) {
                   if (regHistory["_60m"][reg_key][i] > regHistory["_60m"][reg_key][max])
                      max = i;
                   if (regHistory["_60m"][reg_key][i] < regHistory["_60m"][reg_key][min])
                      min = i;
               }
               regHistory["_24h"][reg_key].unshift(regHistory["_60m"][reg_key][((min > max) ? min : max)], regHistory["_60m"][reg_key][((min > max) ? max : min)]);

               if  (regHistory["_24h"][reg_key].length > 120)
                 regHistory["_24h"][reg_key].splice(-2, 2);  // remove the last 2 element
            }
        });
        regHistory["count_60m"] = ((regHistory["count_60m"] >= 12) ? 0 : regHistory["count_60m"]+1);
        regHistory["count_24h"] = ((regHistory["count_24h"] >= 288) ? 0 : regHistory["count_24h"]+1);

        if (printToScreen)
           UpdateRegistersColor();
    }});
}

function UpdateRegistersColor() {
    var CurrentTime = new Date().getTime();
    $.each(regHistory["updateTime"], function( reg_key, update_time ){
        var difference = CurrentTime - update_time;
        var secondsDifference = Math.floor(difference/1000);
        if ((update_time > 0) && (secondsDifference >= fadeOffTime)) {
           $("#content_"+reg_key).css("background-color", "#AAAAAA");
           $("#content_"+reg_key).css("color", "red");
        } else if ((update_time > 0) && (secondsDifference <= fadeOffTime)) {
           var hexShadeR = toHex(255-Math.floor(secondsDifference*85/fadeOffTime));
           var hexShadeG = toHex(Math.floor(secondsDifference*170/fadeOffTime));
           var hexShadeB = toHex(Math.floor(secondsDifference*170/fadeOffTime));
           $("#content_"+reg_key).css("background-color", "#"+hexShadeR+hexShadeG+hexShadeB);
           $("#content_"+reg_key).css("color", "black");
        }
    });
}

function printRegisters (type) {
    var plots = [];
    var data, labelMin, labelText, labelTitle;
    var pageHeight = 20;
    var rowHeight = 15;
    var dataDivider;

    if (type == 10) {
      data = regHistory["_10m"];
      labelTitle = "last 10 minutes";
      labelMin = -10;
      labelText = "Time (Minutes ago)";
      dataDivider = 12;
    } else if (type == 60) {
      labelTitle = "last 1 hour";
      data = regHistory["_60m"];
      labelMin = -60;
      labelText = "Time (Minutes ago)";
      dataDivider = 2;
    } else if (type == 24) {
     labelTitle = "last 24 hours";
      data = regHistory["_24h"];
      labelMin = -24;
      labelText = "Time (hours ago)";
      dataDivider = 5;
    }


    $('<div id="printRegisterFrame" style="width:1000px"></div>').appendTo("#mydisplay");

    var now = new moment();
    var outstr = '<br><center><h1>Generator Registers for '+labelTitle+'</h1><br>';
    outstr += '<h2>As of: '+now.format("D MMMM YYYY H:mm:ss")+'<br><small>(data avilable since: '+regHistory["historySince"]+')</small></h2><br>';
    outstr += '<table width="1000px" border="0"><tr>';

    $.each(Object.keys(data).sort(), function(i, reg_key) {
        var max=data[reg_key][0];
        var min=data[reg_key][0];
        for (var j = 120; j >= 0; --j) {
           if (data[reg_key][j] > max)
              max = data[reg_key][j];
           if (data[reg_key][j] < min)
              min = data[reg_key][j];
        }

        if ((i % 3) == 0){
          pageHeight += rowHeight;
          if (pageHeight < 100) {
             outstr += '</tr><tr>';
          } else {
             outstr += '</tr></table><div class="pagebreak"> </div><table width="1000px" border="0"><tr>';
             pageHeight = 0;
          }
          rowHeight = 15;
        }

        var reg_val = data[reg_key][0];

        outstr += '<td width="33%" class="registerTD">';
        outstr +=     '<table width="333px" heigth="100%" id="val_'+reg_key+'">';
        outstr +=     '<tr><td align="center" class="registerTDsubtitle">' + reg_key + '</td></tr>';
        outstr +=     '<tr><td align="center" class="registerTDtitle">' + BaseRegistersDescription[reg_key] + '</td></tr>';
        outstr +=     '<tr><td align="center" class="registerTDsubtitle">Current Value: ' + regHistory["_10m"][reg_key][0] + '</td></tr>';
        if (min != max) {
          outstr +=     '<tr><td align="center" class="registerTDsubtitle">Minimum Value: '+min+'<br>Maximum Value: '+max+'</td></tr>';
          outstr +=     '<tr><td align="center" class="regHistoryPlotCell"><div id="printPlot_'+reg_key+'"></div></td></tr>';
          plots.push(reg_key);
          rowHeight = 45;
        } else {
          outstr +=     '<tr><td align="center" class="registerTDvalMedium">no change</td></tr>';
        }
        outstr +=     '</table>';
        outstr += '</td>';
    });
    if ((Object.keys(data).length % 3) > 0) {
      for (var i = (Object.keys(data).length % 3); i < 3; i++) {
          outstr += '<td width="333px" class="registerTD"></td>';
       }
    }
    outstr += '</tr></table></center>';
    $("#printRegisterFrame").html(outstr);


    for (var i = 0; i < plots.length; i++) {
        var reg_key = plots[i];
        var plot_data = [];
        for (var j = 120; j >= 0; --j) {
           if (data[reg_key].length > j)
              plot_data.push([-j/dataDivider, parseInt(data[reg_key][j], 16)]);
        }
        var plot = $.jqplot('printPlot_'+reg_key, [plot_data], {
                               axesDefaults: { tickOptions: { textColor: '#000000', fontSize: '8pt' }},
                               axes: { xaxis: { label: labelText, labelOptions: { fontFamily: 'Arial', textColor: '#000000', fontSize: '9pt' }, min: labelMin, max:0 } }
                             });
    }

    $("#printRegisterFrame").printThis({canvas: true, importCSS: false, loadCSS: "css/print.css", pageTitle:"Genmon Registers", removeScripts: true});
    setTimeout(function(){ $("#printRegisterFrame").remove(); }, 1000);
}

function toHex(d) {
    return  ("0"+(Number(d).toString(16))).slice(-2).toUpperCase()
}

//*****************************************************************************
//  called when menu is clicked
//*****************************************************************************
function MenuClick(target)
{

        RemoveClass();  // remove class from menu items
        // add class active to the clicked item
        target.find("a").addClass(GetCurrentClass());
        // update the display
        menuElement = target.attr("id");
        window.scrollTo(0,0);
        switch (menuElement) {
            case "outage":
                GetDisplayValues(menuElement);
                break;
            case "monitor":
                DisplayMonitor();
                break;
            case "logs":
                DisplayLogs();
                break;
            case "status":
                DisplayStatusFull();
                break;
            case "maint":
                DisplayMaintenance();
                break;
            case "notifications":
                DisplayNotifications();
                break;
            case "settings":
                DisplaySettings();
                break;
            case "registers":
                DisplayRegistersFull();
                break;
            default:
                break;
        }

}

//*****************************************************************************
// removes the current class from the menu anchor list
//*****************************************************************************
function RemoveClass() {
    $("li").find("a").removeClass(GetCurrentClass());
}

//*****************************************************************************
// returns current CSS class for menu
//*****************************************************************************
function GetCurrentClass() {
    return currentClass
}

//*****************************************************************************
// escapeRegExp - helper function for replaceAll
//*****************************************************************************
function escapeRegExp(str) {
    return str.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");
}

//*****************************************************************************
// javascript implementation of java function replaceAll
//*****************************************************************************
function replaceAll(str, find, replace) {
    return str.replace(new RegExp(escapeRegExp(find), 'g'), replace);
}

//*****************************************************************************
// GetDisplayValues - updates display based on menu selection (command)
//*****************************************************************************
function GetDisplayValues(command)
{
    var url = baseurl.concat(command);
    $.ajax({dataType: "json", url: url, timeout: 4000, error: processAjaxError, success: function(result){
        processAjaxSuccess();

        // replace /n with html friendly <br/>
        var outstr = replaceAll(result,'\n','<br/>')
        // replace space with html friendly &nbsp
        outstr = replaceAll(outstr,' ','&nbsp')
        $("#mydisplay").html(outstr);

   }});

    return;
}

//*****************************************************************************
// GetGeneratorModel - Get the current Generator Model and kW Rating
//*****************************************************************************
function GetGeneratorModel()
{
    url = baseurl.concat("start_info_json");
    $.ajax({dataType: "json", url: url, timeout: 4000, error: processAjaxError, success: function(result){
      processAjaxSuccess();

      myGenerator = result;
      SetHeaderValues();
    }});
}

//*****************************************************************************
// SetHeaderValues - updates header to display site name
//*****************************************************************************
function SetHeaderValues()
{
   var HeaderStr = '<table border="0" width="100%" height="30px"><tr><td width="30px"></td><td width="90%">Generator Monitor at ' + myGenerator["sitename"] + '</td><td width="30px"><img id="registers" src="images/registers.png" width="20px" height="20px"></td></tr></table>';
   $("#myheader").html(HeaderStr);
   $("#registers").on('click',  function() {  MenuClick($(this));});
}


//*****************************************************************************
// Set Favicon
//*****************************************************************************

document.head = document.head || document.getElementsByTagName('head')[0];

function changeFavicon(src) {
   var link = document.createElement('link'),
       oldLink = document.getElementById('dynamic-favicon');
   link.id = 'dynamic-favicon';
   link.rel = 'shortcut icon';
   link.href = src;
   if (oldLink) {
       document.head.removeChild(oldLink);
   }
   document.head.appendChild(link);
}

function SetFavIcon()
{
    url = baseurl.concat("getfavicon");
    $.ajax({dataType: "json", url: url, timeout: 4000, error: processAjaxError, success: function(result){
        processAjaxSuccess();
        changeFavicon(result);
    }});
    return
}

//*****************************************************************************
// GetkWHistory - Get the history of the kW generation
//*****************************************************************************
function GetkWHistory()
{
    url = baseurl.concat("power_log_json");
    $.ajax({dataType: "json", url: url, timeout: 20000, error: processAjaxError, data: "power_log_json: 10000", success: function(result){
        processAjaxSuccess();
        kwHistory["data"] = result.map(function(itm) { return [moment(itm[0], 'MM/DD/YY HH:mm:ss').format('YYYY-MM-DD HH:mm:ss'), parseFloat(itm[1])]; }).sort().reverse();
    }});
}

//*****************************************************************************
// Show nice Alert Box (modal)
//*****************************************************************************
function GenmonAlert(msg)
{
       vex.closeAll();
       vex.dialog.alert({ unsafeMessage: '<table><tr><td valign="middle" width="200px" align="center"><img src="images/alert.png" width="64px" height="64px"></td><td valign="middle" width="70%">'+msg+'</td></tr></table>'});
}

//*****************************************************************************
// UpdateDisplay
//*****************************************************************************
function UpdateDisplay()
{
    if (menuElement == "registers") {
        UpdateRegisters(false, true);
    } else if (menuElement == "status") {
        DisplayStatusUpdate();
    } else if (menuElement == "maint") {
        DisplayMaintenanceUpdate();
    } else if (menuElement == "logs") {
        DisplayLogs();
    } else if (menuElement == "monitor") {
        DisplayMonitor();
    } else if ((menuElement != "settings") && (menuElement != "notifications")) {
        GetDisplayValues(menuElement);
    }

    if (menuElement != "registers") {  // refresh the registers every time to keep history
        UpdateRegisters(false, false);
    }
}

//*****************************************************************************
// GetBaseStatus - updates menu background color based on the state of the generator
//*****************************************************************************
function GetBaseStatus()
{
    url = baseurl.concat("gui_status_json");
    $.ajax({dataType: "json", url: url, timeout: 4000, error: processAjaxError, success: function(result){
        processAjaxSuccess();

        // should return str in this format:
        // Saturday!13!30!On!Weekly!True
        // Saturday!13!30!On!Biweekly!Falze
        // 2!13!30!On!Monthly!False
        // NOTE: Last param (True or False) is if enhanced exercise freq is enabled
        var resultsArray = result['Exercise'].split("!");

        if (resultsArray.length == 6){
            myGenerator['ExerciseDay'] = resultsArray[0];
            myGenerator['ExerciseHour'] = resultsArray[1];
            myGenerator['ExerciseMinute'] = resultsArray[2];
            myGenerator['QuietMode'] = resultsArray[3];
            myGenerator['ExerciseFrequency'] = resultsArray[4];
            myGenerator['EnhancedExerciseEnabled'] = ((resultsArray[5] === "False") ? false : true);
        }

        if (kwHistory["data"].length > 0) { /// Otherwise initialization has not finished

           if ((result['kwOutput'].replace(/kW/g, '') != 0) && (kwHistory["data"][0][1] == 0)) {
              // make sure we add a 0 before the graph goes up, to ensure the interpolation works
              kwHistory["data"].unshift([(new moment()).add(-2, "s").format("YYYY-MM-DD HH:mm:ss"), 0]);
           }

           if ((result['kwOutput'].replace(/kW/g, '') != 0) || (kwHistory["data"][0][1] != 0)) {
              kwHistory["data"].unshift([(new moment()).format("YYYY-MM-DD HH:mm:ss"), result['kwOutput'].replace(/kW/g, '')]);
           }
           if  (kwHistory["data"].length > 10000) {
              kwHistory["data"].pop  // remove the last element
           }

           if ((menuElement == "status") && ($("#gaugekW").length > 0)) {
              gaugekW.set(result['kwOutput'].replace(/kW/g, ''));
              printKwPlot(result['kwOutput'].replace(/kW/g, ''));
           }
        }

        baseState = result['basestatus'];
        // active, activealarm, activeexercise
        if (baseState != currentbaseState) {

            // it changed so remove the old class
            RemoveClass();

            if(baseState === "READY")
                currentClass = "active";
            if(baseState === "ALARM")
                currentClass = "activealarm";
            if(baseState === "EXERCISING")
                currentClass = "activeexercise";
            if(baseState === "RUNNING")
                currentClass = "activerun";
            if(baseState === "RUNNING-MANUAL")
                currentClass = "activerunmanual";
            if(baseState === "SERVICEDUE")
                currentClass = "activeservice";
            if(baseState === "OFF")
                currentClass = "activeoff";
            if(baseState === "MANUAL")
                currentClass = "activemanual";

            currentbaseState = baseState;
            // Added active to selected class
            $("#"+menuElement).find("a").addClass(GetCurrentClass());
        }
        return
   }});

    return
}

