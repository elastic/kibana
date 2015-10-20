/**
 * ELASTICSEARCH CONFIDENTIAL
 * _____________________________
 *
 *  [2014] Elasticsearch Incorporated All Rights Reserved.
 *
 * NOTICE:  All information contained herein is, and remains
 * the property of Elasticsearch Incorporated and its suppliers,
 * if any.  The intellectual and technical concepts contained
 * herein are proprietary to Elasticsearch Incorporated
 * and its suppliers and may be covered by U.S. and Foreign Patents,
 * patents in process, and are protected by trade secret or copyright law.
 * Dissemination of this information or reproduction of this material
 * is strictly forbidden unless prior written permission is obtained
 * from Elasticsearch Incorporated.
 */

var $ = require('jquery');

let curl = require('./curl');
let $helpPopup = require('./help_popup');
let history = require('./history');
let input = require('./input');
let mappings = require('./mappings');
let output = require('./output');
let miscInputs = require('./misc_inputs');
let es = require('./es');
let utils = require('./utils');
let _ = require('lodash');
let ga = require('analytics');


$(document.body).removeClass('fouc');

var $esServer = miscInputs.$esServer;

var marvelOpts = localStorage.getItem('marvelOpts');
if (marvelOpts) {
  try {
    marvelOpts = JSON.parse(marvelOpts);
    if (marvelOpts.version && marvelOpts.report) {
      ga.pageview();
    }
  } catch (e) {
    marvelOpts = {status: 'trial'};
  } // Meh! Who cares...
}
else {
  marvelOpts = {status: 'trial'};
}

// set the value of the server and/or the input and clear the output
function resetToValues(server, content) {
  if (server != null) {
    es.setBaseUrl(server);
  }
  if (content != null) {
    input.update(content);
  }
  output.update("");
}

function loadSavedState() {
  var sourceLocation = utils.getUrlParam('load_from') || "stored";
  var previousSaveState = history.getSavedEditorState();

  var defaultHost = "localhost:9200";
  if (document.location.pathname && document.location.pathname.indexOf("_plugin") == 1) {
    // running as an ES plugin. Always assume we are using that elasticsearch
    defaultHost = document.location.host;
  }

  if (sourceLocation == "stored") {
    if (previousSaveState) {
      resetToValues(previousSaveState.server, previousSaveState.content);
    }
    else {
      resetToValues(defaultHost);
      input.autoIndent();
    }
  }
  else if (/^https?:\/\//.test(sourceLocation)) {
    var loadFrom = {url: sourceLocation, dataType: "text"};
    if (/https?:\/\/api.github.com/.test(sourceLocation)) {
      loadFrom.headers = {Accept: "application/vnd.github.v3.raw"};
    }
    $.ajax(loadFrom).done(function (data) {
      resetToValues(defaultHost, data);
      input.moveToNextRequestEdge(true);
      input.highlightCurrentRequestsAndUpdateActionBar();
      input.updateActionsBar();
    });
  }
  else if (previousSaveState) {
    resetToValues(previousSaveState.server);
  }
  else {
    resetToValues(defaultHost);
  }
  input.moveToNextRequestEdge(true);
}

function setupAutosave() {
  var timer;
  var saveDelay = 500;

  function doSave() {
    saveCurrentState();
  }

  input.getSession().on("change", function onChange(e) {
    if (timer) {
      timer = clearTimeout(timer);
    }
    timer = setTimeout(doSave, saveDelay);
  });
}

function saveCurrentState() {
  try {
    var content = input.getValue();
    var server = $esServer.val();
    history.updateCurrentState(server, content);
  }
  catch (e) {
    console.log("Ignoring saving error: " + e);
  }
}

// stupid simple restore function, called when the user
// chooses to restore a request from the history
// PREVENTS history from needing to know about the input
history.restoreFromHistory = function applyHistoryElem(req) {
  var session = input.getSession();
  var pos = input.getCursorPosition();
  var prefix = "";
  var suffix = "\n";
  if (input.parser.isStartRequestRow(pos.row)) {
    pos.column = 0;
    suffix += "\n";
  }
  else if (input.parser.isEndRequestRow(pos.row)) {
    var line = session.getLine(pos.row);
    pos.column = line.length;
    prefix = "\n\n";
  }
  else if (input.parser.isInBetweenRequestsRow(pos.row)) {
    pos.column = 0;
  }
  else {
    pos = input.nextRequestEnd(pos);
    prefix = "\n\n";
  }

  var s = prefix + req.method + " " + req.endpoint;
  if (req.data) {
    s += "\n" + req.data;
  }

  s += suffix;

  session.insert(pos, s);
  input.clearSelection();
  input.moveCursorTo(pos.row + prefix.length, 0);
  input.focus();
};

(function stuffThatsTooHardWithCSS() {
  var delay = null;

  function update() {
    if (delay) {
      delay = clearTimeout(delay);
    }

    input.resize(true);
    output.resize(true);
  }

  update();

  // and when the window resizes (once every 30 ms)
  $(window)
    .resize(function (event) {
      if (!delay && event.target === window) {
        delay = setTimeout(update, 30);
      }
    });
}());

/**
 * Display the welcome popup if it has not been shown yet
 */
if (!localStorage.getItem("version_welcome_shown")) {
  let $welcomePopup = require('./welcome_popup');
  $welcomePopup.on('shown', function () {
    localStorage.setItem("version_welcome_shown", '@@SENSE_REVISION');
  });
  $welcomePopup.one('hidden', function () {
    loadSavedState();
    setupAutosave();
  });
  $welcomePopup.modal('show');
}
else {
  loadSavedState();
  setupAutosave();
}

if (marvelOpts.status && marvelOpts.version && marvelOpts.report) {
  ga.pageview();
}
