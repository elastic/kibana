define([
  'curl',
  'help_popup',
  'history',
  'input',
  'jquery',
  'mappings',
  'output',
  'misc_inputs',
  'utils'
  ],
  function (curl, $helpPopup, history, input, $, mappings, output, miscInputs, utils) {
    'use strict';

    $(document.body).removeClass('fouc');

    var $esServer = miscInputs.$esServer;
    var $send = miscInputs.$send;

    function submitCurrentRequestToES(cb) {
      cb = typeof cb === 'function' ? cb : $.noop;

      input.getCurrentRequest(function (req) {
        if (!req) return;

        $("#notification").text("Calling ES....").css("visibility", "visible");

        var es_server = $esServer.val();
        var es_url = req.url;
        var es_method = req.method;
        var es_data = req.data.join("\n");
        if (es_data) es_data += "\n"; //append a new line for bulk requests.

        utils.callES(es_server, es_url, es_method, es_data, null, function (xhr, status) {
            $("#notification").text("").css("visibility", "hidden");
            if (typeof xhr.status == "number" &&
              ((xhr.status >= 400 && xhr.status < 600) ||
                (xhr.status >= 200 && xhr.status < 300)
                )) {
              // we have someone on the other side. Add to history
              history.addToHistory(es_server, es_url, es_method, es_data);


              var value = xhr.responseText;
              try {
                value = JSON.stringify(JSON.parse(value), null, 3);
              }
              catch (e) {

              }
              cb(value);
            }
            else {
              cb("Request failed to get to the server (status code: " + xhr.status + "):" + xhr.responseText);
            }

          }
        );
        saveCurrentState();
      });
    }

    // set the value of the server and/or the input and clear the output
    function resetToValues(server, content) {
      if (server != null) {
        $esServer.val(server);
        mappings.notifyServerChange(server);
      }
      if (content != null) {
        input.update(content);
      }
      output.update("");
    }

    (function loadSavedState() {
      var sourceLocation = utils.getUrlParam('load_from') || "stored";
      var previousSaveState = history.getSavedEditorState();

      if (sourceLocation == "stored") {
        if (previousSaveState) {
          resetToValues(previousSaveState.server, previousSaveState.content);
        } else {
          input.autoIndent();
        }
      } else if (/^https?:\/\//.exec(sourceLocation)) {
        $.get(sourceLocation, null, function (data) {
          resetToValues(null, data);
          input.highlightCurrentRequestAndUpdateActionBar();
          input.updateActionsBar();
        });
      } else if (previousSaveState) {
        resetToValues(previousSaveState.server);
      }

      if (document.location.pathname && document.location.pathname.indexOf("_plugin") == 1) {
        // running as an ES plugin. Always assume we are using that elasticsearch
        resetToValues(document.location.host);
      }
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
      if (req.data) s += "\n" + req.data;

      s += suffix;

      session.insert(pos, s);
      input.clearSelection();
      input.moveCursorTo(pos.row + prefix.length, 0);
      input.focus();
    };

    /**
     * Make the editor resizeable
     */
    input.$el.resizable({
      autoHide: false,
      handles: 'e',
      start: function (e, ui) {
        $(".ui-resizable-e").addClass("active");
      },
      stop: function (e, ui) {
        $(".ui-resizable-e").removeClass("active");
        var parent = ui.element.parent();
        var editorSize = ui.element.outerWidth();
        output.$el.css("left", editorSize + 20);
        input.$actions.css("margin-right", -editorSize + 3);
        input.resize(true);
        output.resize(true);
      }
    });

    /**
     * Setup the "send" shortcut
     */
    input.commands.addCommand({
      name: 'send to elasticsearch',
      bindKey: {win: 'Ctrl-Enter', mac: 'Command-Enter'},
      exec: function () {
        output.update('');
        submitCurrentRequestToES(function (resp) {
          output.update(resp);
        });
      }
    });

    $send.click(function () {
      submitCurrentRequestToES(function (resp) {
        output.update(resp);
      });
      return false;
    });

    /*
     * initialize navigation menu
     */

    $.get('../common/marvelLinks.json', function(marvelLinks) {
      var linkMenu = $("#nav_btn ul");
      _.map(marvelLinks.links, function (link) {
        var li =$('<li><a></a></li>');
        var a = li.find('a');
        a.attr('href', link.url);
        a.text(link.name);
        if (a[0].href != window.location.href)
          li.appendTo(linkMenu);
      });
    });

    /**
     * Display the welcome popul if it has not been shown yet
     */
    if (!localStorage.getItem("version_welcome_shown")) {
      require(['welcome_popup'], function ($welcomePopup) {
        $welcomePopup.one('shown', function () {
          localStorage.setItem("version_welcome_shown", SENSE_VERSION);
        });
        $welcomePopup.modal('show');
      });
    }

  });
