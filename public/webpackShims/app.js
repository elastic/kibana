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

var $ = require('vendor/jquery');
$(require('./modals.html')).appendTo('body');

define([
    'curl',
    'help_popup',
    'history',
    'input',
    'vendor/jquery',
    'mappings',
    'output',
    'misc_inputs',
    'es',
    'utils',
    'vendor/_',
    'analytics'
  ],
  function (curl, $helpPopup, history, input, $, mappings, output, miscInputs, es, utils, _, ga) {
    'use strict';

    $(document.body).removeClass('fouc');

    var $esServer = miscInputs.$esServer;
    var $send = miscInputs.$send;

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

    var CURRENT_REQ_ID = 0;

    function submitCurrentRequestToES() {

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

        saveCurrentState();

        $("#notification").text("Calling ES....").css("visibility", "visible");

        var finishChain = function () {
          $("#notification").text("").css("visibility", "hidden");
        };

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
            if (typeof xhr.status == "number" &&
              ((xhr.status >= 400 && xhr.status < 600) ||
              (xhr.status >= 200 && xhr.status < 300)
              )) {
              // we have someone on the other side. Add to history
              history.addToHistory(es.getBaseUrl(), es_path, es_method, es_data);


              var value = xhr.responseText;
              var mode = null;
              var contentType = xhr.getAllResponseHeaders("Content-Type") || "";
              if (contentType.indexOf("text/plain") >= 0) {
                mode = "ace/mode/text";
              }
              else if (contentType.indexOf("application/yaml") >= 0) {
                mode = "ace/mode/yaml"
              }
              else {
                // assume json - auto pretty
                try {
                  value = JSON.stringify(JSON.parse(value), null, 3);
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
              var value = "Request failed to get to the server (status code: " + xhr.status + "):" + xhr.responseText;
              if (isMultiRequest) {
                value = "# " + req.method + " " + req.url + "\n" + value;
              }
              if (isFirstRequest) {
                output.update(value, 'ace/mode/text');
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
      var $editors = input.$el.parent().add(output.$el.parent());
      var $resizer = miscInputs.$resizer;
      var $header = miscInputs.$header;

      var delay;
      var headerHeight;
      var resizerHeight;

      $resizer
        .html('&#xFE19;') // vertical elipses
        .css('vertical-align', 'middle');

      function update() {
        var newHeight;

        if (delay) {
          delay = clearTimeout(delay);
        }

        newHeight = $header.outerHeight();
        if (headerHeight != newHeight) {
          headerHeight = newHeight;
          $editors.css('top', newHeight + 10);
        }

        newHeight = $resizer.height();
        if (resizerHeight != newHeight) {
          resizerHeight = newHeight;
          $resizer.css('line-height', newHeight + 'px');
        }
        input.resize(true);
        output.resize(true);
      }

      // update at key moments in the loading process
      $(update);


      // and when the window resizes (once every 30 ms)
      $(window)
        .resize(function (event) {
          if (!delay && event.target === window) {
            delay = setTimeout(update, 30);
          }
        });

    }());

    /**
     * Setup the "send" shortcut
     */
    input.commands.addCommand({
      name: 'send to elasticsearch',
      bindKey: {win: 'Ctrl-Enter', mac: 'Command-Enter'},
      exec: submitCurrentRequestToES
    });

    $send.click(function () {
      input.focus();
      submitCurrentRequestToES();
      return false;
    });

    /**
     * Display the welcome popup if it has not been shown yet
     */
    if (!localStorage.getItem("version_welcome_shown")) {
      require(['welcome_popup'], function ($welcomePopup) {
        $welcomePopup.on('shown', function () {
          localStorage.setItem("version_welcome_shown", '@@MARVEL_REVISION');
        });
        $welcomePopup.one('hidden', function () {
          loadSavedState();
          setupAutosave();
        });
        $welcomePopup.modal('show');

      });
    }
    else {
      loadSavedState();
      setupAutosave();
    }

    if (marvelOpts.status && marvelOpts.version && marvelOpts.report) {
      ga.pageview();
    }

  });
