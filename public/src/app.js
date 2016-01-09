var $ = require('jquery');

let curl = require('./curl');
let history = require('./history');
let input = require('./input');
let mappings = require('./mappings');
let output = require('./output');
let es = require('./es');
let utils = require('./utils');
let _ = require('lodash');
const chrome = require('ui/chrome');

const defaultServerUrl = chrome.getInjected('defaultServerUrl');

$(document.body).removeClass('fouc');

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

  if (sourceLocation == "stored") {
    if (previousSaveState) {
      resetToValues(previousSaveState.server, previousSaveState.content);
    }
    else {
      resetToValues(defaultServerUrl);
      input.autoIndent();
    }
  }
  else if (/^https?:\/\//.test(sourceLocation)) {
    var loadFrom = {url: sourceLocation, dataType: "text", kbnXsrfToken: false};
    if (/https?:\/\/api.github.com/.test(sourceLocation)) {
      loadFrom.headers = {Accept: "application/vnd.github.v3.raw"};
    }
    $.ajax(loadFrom).done(function (data) {
      resetToValues(defaultServerUrl, data);
      input.moveToNextRequestEdge(true);
      input.highlightCurrentRequestsAndUpdateActionBar();
      input.updateActionsBar();
    });
  }
  else if (previousSaveState) {
    resetToValues(previousSaveState.server);
  }
  else {
    resetToValues(defaultServerUrl);
  }
  input.moveToNextRequestEdge(true);
}

function setupAutosave() {
  var timer;
  var saveDelay = 500;

  input.getSession().on("change", function onChange(e) {
    if (timer) {
      timer = clearTimeout(timer);
    }
    timer = setTimeout(saveCurrentState, saveDelay);
  });

  es.addServerChangeListener(saveCurrentState);
}

function saveCurrentState() {
  try {
    var content = input.getValue();
    var server = es.getBaseUrl();
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

function resize() {
  input.resize();
  output.resize();
}

resize();
$(window).resize((event) => {
  if (event.target === window) resize();
});

loadSavedState();
setupAutosave();
