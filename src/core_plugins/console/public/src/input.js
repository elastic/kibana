let ace = require('ace');
let $ = require('jquery');
let ZeroClipboard = require('zeroclip');
let ext_searchbox = require('ace/ext-searchbox');
let Autocomplete = require('./autocomplete');
let mappings = require('./mappings');
let output = require('./output');
let SenseEditor = require('./sense_editor/editor');
let settings = require('./settings');
let storage = require('./storage');
let utils = require('./utils');
let es = require('./es');
let history = require('./history');
import uiModules from 'ui/modules';

var $el = $('#editor');
var input = new SenseEditor($el);
uiModules.get('app/sense').setupResizeCheckerForRootEditors($el, input, output);

input.autocomplete = new Autocomplete(input);

input.$actions = $("#editor_actions");

input.commands.addCommand({
  name: 'auto indent request',
  bindKey: {win: 'Ctrl-I', mac: 'Command-I'},
  exec: function () {
    input.autoIndent();
  }
});
input.commands.addCommand({
  name: 'move to previous request start or end',
  bindKey: {win: 'Ctrl-Up', mac: 'Command-Up'},
  exec: function () {
    input.moveToPreviousRequestEdge()
  }
});
input.commands.addCommand({
  name: 'move to next request start or end',
  bindKey: {win: 'Ctrl-Down', mac: 'Command-Down'},
  exec: function () {
    input.moveToNextRequestEdge()
  }
});


/**
 * COPY AS CURL
 *
 * Since the copy functionality is powered by a flash movie (via ZeroClipboard)
 * the only way to trigger the copy is with a litteral mouseclick from the user.
 *
 * The original shortcut will now just open the menu and highlight the
 *
 */
var $copyAsCURL = $('#copy_as_curl');
var zc = (function setupZeroClipboard() {
  var zc = new ZeroClipboard($copyAsCURL); // the ZeroClipboard instance

  zc.on('wrongflash noflash', function () {
    if (!storage.get('flash_warning_shown')) {
      alert('Console needs flash version 10.0 or greater in order to provide "Copy as cURL" functionality');
      storage.set('flash_warning_shown', 'true');
    }
    $copyAsCURL.hide();
  });

  zc.on('ready', function () {
    function setupCopyButton(cb) {
      cb = typeof cb === 'function' ? cb : $.noop;
      $copyAsCURL.css('visibility', 'hidden');
      input.getRequestsAsCURL(function (curl) {
        $copyAsCURL.attr('data-clipboard-text', curl);
        $copyAsCURL.css('visibility', 'visible');
        cb();
      });
    }

    input.$actions.on('mouseenter', function () {
      if (!$(this).hasClass('open')) {
        setupCopyButton();
      }
    });
  });

  zc.on('complete', function () {
    $copyAsCURL.click();
    input.focus();
  });

  return zc;
}());

/**
 * Setup the "send" shortcut
 */

var CURRENT_REQ_ID = 0;

function sendCurrentRequestToES() {

  var req_id = ++CURRENT_REQ_ID;

  input.getRequestsInRange(function (requests) {
    if (req_id != CURRENT_REQ_ID) {
      return;
    }
    output.update('');

    if (requests.length == 0) {
      return;
    }

    var isMultiRequest = requests.length > 1;
    var finishChain = function () { /* noop */ };

    var isFirstRequest = true;

    var sendNextRequest = function () {
      if (req_id != CURRENT_REQ_ID) {
        return;
      }
      if (requests.length == 0) {
        finishChain();
        return;
      }
      var req = requests.shift();
      var es_path = req.url;
      var es_method = req.method;
      var es_data = req.data.join("\n");
      if (es_data) {
        es_data += "\n";
      } //append a new line for bulk requests.

      es.send(es_method, es_path, es_data).always(function (dataOrjqXHR, textStatus, jqXhrORerrorThrown) {
        if (req_id != CURRENT_REQ_ID) {
          return;
        }
        var xhr;
        if (dataOrjqXHR.promise) {
          xhr = dataOrjqXHR;
        }
        else {
          xhr = jqXhrORerrorThrown;
        }
        function modeForContentType(contentType) {
          if (contentType.indexOf("text/plain") >= 0) {
            return "ace/mode/text";
          }
          else if (contentType.indexOf("application/yaml") >= 0) {
            return "ace/mode/yaml";
          }
          return null;
        }

        if (typeof xhr.status == "number" &&
            // things like DELETE index where the index is not there are OK.
          ((xhr.status >= 200 && xhr.status < 300) || xhr.status == 404)
        ) {
          // we have someone on the other side. Add to history
          history.addToHistory(es_path, es_method, es_data);


          let value = xhr.responseText;
          let mode = modeForContentType(xhr.getAllResponseHeaders("Content-Type") || "");

          if (mode === null || mode === "application/json") {
            // assume json - auto pretty
            try {
              value = JSON.stringify(JSON.parse(value), null, 2);
            }
            catch (e) {

            }
          }

          if (isMultiRequest) {
            value = "# " + req.method + " " + req.url + "\n" + value;
          }
          if (isFirstRequest) {
            output.update(value, mode);
          }
          else {
            output.append("\n" + value);
          }
          isFirstRequest = false;
          // single request terminate via sendNextRequest as well
          sendNextRequest();
        }
        else {
          let value, mode;
          if (xhr.responseText) {
            value = xhr.responseText; // ES error should be shown
            mode = modeForContentType(xhr.getAllResponseHeaders("Content-Type") || "");
            if (value[0] == "{") {
              try {
                value = JSON.stringify(JSON.parse(value), null, 2);
              }
              catch (e) {
              }
            }
          } else {
            value = "Request failed to get to the server (status code: " + xhr.status + ")";
            mode = 'ace/mode/text';
          }
          if (isMultiRequest) {
            value = "# " + req.method + " " + req.url + "\n" + value;
          }
          if (isFirstRequest) {
            output.update(value, mode);
          }
          else {
            output.append("\n" + value);
          }
          finishChain();
        }
      });
    };

    sendNextRequest();
  });
}


input.commands.addCommand({
  name: 'send to elasticsearch',
  bindKey: {win: 'Ctrl-Enter', mac: 'Command-Enter'},
  exec: sendCurrentRequestToES
});


/**
 * Init the editor
 */
if (settings) {
  settings.applyCurrentSettings(input);
}
input.focus();
input.highlightCurrentRequestsAndUpdateActionBar();

input.sendCurrentRequestToES = sendCurrentRequestToES;
require('./input_resize')(input, output);

module.exports = input;
