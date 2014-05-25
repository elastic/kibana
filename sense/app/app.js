define([
  'curl',
  'help_popup',
  'history',
  'input',
  'jquery',
  'mappings',
  'output',
  'misc_inputs',
  'es',
  'utils',
  '_',
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
      } // Meh! Who cares...
    }

    function submitCurrentRequestToES(cb) {
      cb = typeof cb === 'function' ? cb : $.noop;

      input.getCurrentRequest(function (req) {
        output.update('');

        if (!req) {
          return;
        }

        $("#notification").text("Calling ES....").css("visibility", "visible");

        var es_path = req.url;
        var es_method = req.method;
        var es_data = req.data.join("\n");
        if (es_data) {
          es_data += "\n";
        } //append a new line for bulk requests.

        es.send(es_method, es_path, es_data, null, function (xhr, status) {
            $("#notification").text("").css("visibility", "hidden");
            if (typeof xhr.status == "number" &&
              ((xhr.status >= 400 && xhr.status < 600) ||
                (xhr.status >= 200 && xhr.status < 300)
                )) {
              // we have someone on the other side. Add to history
              history.addToHistory(es.getBaseUrl(), es_path, es_method, es_data);


              var value = xhr.responseText;
              var mode = "ace/mode/json";
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

              output.update(value, mode);

            }
            else {
              cb("Request failed to get to the server (status code: " + xhr.status + "):" + xhr.responseText, 'ace/mode/text');
            }

          }
        );
        saveCurrentState();
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

    (function loadSavedState() {
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
        var loadFrom = { url: sourceLocation, dataType: "text" };
        if (/https?:\/\/api.github.com/.test(sourceLocation)) {
          loadFrom.headers = { Accept: "application/vnd.github.v3.raw" };
        }
        $.ajax(loadFrom).done(function (data) {
          resetToValues(defaultHost, data);
          input.moveToNextRequestEdge(true);
          input.highlightCurrentRequestAndUpdateActionBar();
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
    }());

    (function setupAutosave() {
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
    }());

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

        delay = clearTimeout(delay);

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
      }

      // update at key moments in the loading process
      $(update);
      $(window).load(update);

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

    /*
     * initialize navigation menu
     */
    $.get('../common/marvelLinks.json', function (marvelLinks) {
      var linkMenu = $("#nav_btn ul");
      _.map(marvelLinks.links, function (link) {
        var li = $('<li><a></a></li>');
        var a = li.find('a');
        a.attr('href', link.url);
        a.text(link.name);
        if (a[0].href != window.location.href) {
          li.appendTo(linkMenu);
        }
      });
    });

    /**
     * Display the welcome popup if it has not been shown yet
     */
    if (!localStorage.getItem("version_welcome_shown")) {
      require(['welcome_popup'], function ($welcomePopup) {
        $welcomePopup.one('shown', function () {
          localStorage.setItem("version_welcome_shown", '@@MARVEL_REVISION');
        });
        $welcomePopup.modal('show');
      });
    }

    mappings.onInitComplete();

  });
