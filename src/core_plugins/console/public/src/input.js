let $ = require('jquery');
require('ace');
require('ace/ext-searchbox');
let Autocomplete = require('./autocomplete');
let SenseEditor = require('./sense_editor/editor');
let settings = require('./settings');
let utils = require('./utils');
let es = require('./es');
let history = require('./history');
import { uiModules } from 'ui/modules';

let input;
export function initializeInput($el, $actionsEl, $copyAsCurlEl, output) {
  input = new SenseEditor($el);

  // this may not exist if running from tests
  let appSense = uiModules.get('app/sense');
  appSense.setupResizeCheckerForRootEditors($el, input, output);

  input.autocomplete = new Autocomplete(input);

  input.$actions = $actionsEl;

  input.commands.addCommand({
    name: 'auto indent request',
    bindKey: { win: 'Ctrl-I', mac: 'Command-I' },
    exec: function () {
      input.autoIndent();
    }
  });
  input.commands.addCommand({
    name: 'move to previous request start or end',
    bindKey: { win: 'Ctrl-Up', mac: 'Command-Up' },
    exec: function () {
      input.moveToPreviousRequestEdge()
    }
  });
  input.commands.addCommand({
    name: 'move to next request start or end',
    bindKey: { win: 'Ctrl-Down', mac: 'Command-Down' },
    exec: function () {
      input.moveToNextRequestEdge()
    }
  });


  /**
   * COPY AS CURL
   */
  (function setupClipboard() {
      function copyText(text) {
        var node = $(`<textarea style="height:1px"></textarea`)
        .val(text)
        .appendTo(document.body)
        .select();
        document.execCommand('copy');
        node.remove()
      }

      if (!document.queryCommandSupported('copy')) {
        $copyAsCurlEl.hide();
        return;
      }

      $copyAsCurlEl.click(() => {
        copyText($copyAsCurlEl.attr('data-clipboard-text'))
      });

      input.$actions.on('mouseenter', function () {
        if ($(this).hasClass('open')) return;
        input.getRequestsAsCURL(text => {
          $copyAsCurlEl.attr('data-clipboard-text', text);
        });
      });
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
        var es_data = utils.collapseLiteralStrings(req.data.join("\n"));
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
                value = utils.expandLiteralStrings(JSON.stringify(JSON.parse(value), null, 2));
              }
              catch (e) {

              }
            }

            var warnings = xhr.getResponseHeader("warning");
            if (warnings) {
              var deprecationMessages = utils.extractDeprecationMessages(warnings);
              value = deprecationMessages.join("\n") + "\n" + value;
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
    bindKey: { win: 'Ctrl-Enter', mac: 'Command-Enter' },
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

  return input;
}

export default function getInput() {
  return input;
}
