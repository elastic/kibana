define([
  '_',
  'ace',
  'curl',
  'jquery',
  'sense_editor/row_parser',
  'sense_editor/mode/sense',
  'utils'
], function (_, ace, curl, $, RowParser, SenseMode, utils) {
  'use strict';

  function isInt(x) {
    return !isNaN(parseInt(x, 10));
  }

  function createInstance($el) {
    var aceEditor = ace.edit($el[0]);

    // we must create a custom class for each instance, so that the prototype
    // can be the unique aceEditor it extends
    var CustomSenseEditor = function () {
    };
    CustomSenseEditor.prototype = {};

    function bindProp(key) {
      Object.defineProperty(CustomSenseEditor.prototype, key, {
        get: function () {
          return aceEditor[key];
        },
        set: function (val) {
          aceEditor[key] = val;
        }
      });
    }

    // itterate all of the accessible properties/method, on the prototype and beyond
    for (var key in aceEditor) {
      switch (typeof aceEditor[key]) {
        case 'function':
          CustomSenseEditor.prototype[key] = _.bindKey(aceEditor, key);
          break;
        default:
          bindProp(key);
          break;
      }
    }

    var editor = new CustomSenseEditor();
    editor.__ace = aceEditor;
    return editor;
  }

  function SenseEditor($el) {
    var editor = createInstance($el);
    var CURRENT_REQ_RANGE = null;

    editor.$el = $el;
    editor.$actions = $("#editor_actions");

    // mixin the RowParser
    editor.parser = new RowParser(editor);

    // dirty check for tokenizer state, uses a lot less cylces
    // than listening for tokenizerUpdate
    var onceDoneTokenizing = function (func, cancelAlreadyScheduledCalls) {
      var session = editor.getSession();
      var timer = false;
      var checkInterval = 25;

      return function () {
        var self = this;
        var args = [].slice.call(arguments, 0);

        if (cancelAlreadyScheduledCalls) {
          timer = clearTimeout(timer);
        }

        setTimeout(function check() {
          if (session.bgTokenizer.running) {
            timer = setTimeout(check, checkInterval);
          } else {
            func.apply(self, args);
          }
        });
      };
    };

    editor.setShowPrintMargin(false);
    (function (session) {
      session.setMode(new SenseMode.Mode());
      session.setFoldStyle('markbeginend');
      session.setTabSize(2);
      session.setUseWrapMode(true);
    })(editor.getSession());

    editor.prevRequestStart = function (pos) {
      pos = pos || editor.getCursorPosition();
      var curRow = pos.row;
      while (curRow > 0 && !editor.parser.isStartRequestRow(curRow, editor)) curRow--;

      return { row: curRow, column: 0};
    };

    editor.autoIndent = onceDoneTokenizing(function () {
      editor.getCurrentRequestRange(function (req_range) {
        if (!req_range) return;
        editor.getCurrentRequest(function (parsed_req) {
          if (parsed_req.data && parsed_req.data.length > 0) {
            var indent = parsed_req.data.length == 1; // unindent multi docs by default
            var formatted_data = utils.reformatData(parsed_req.data, indent);
            if (!formatted_data.changed) {
              // toggle.
              formatted_data = utils.reformatData(parsed_req.data, !indent);
            }
            parsed_req.data = formatted_data.data;

            editor.replaceRequestRange(parsed_req, req_range);
          }
        });
      });
    }, true);

    editor.update = function (data, callback) {
      callback = typeof callback === 'function' ? callback : null;
      var session = editor.getSession();

      session.setValue(data);
      if (callback) {
        // force update of tokens, but not on this thread to allow for ace rendering.
        setTimeout(function () {
          var i;
          for (i = 0; i < session.getLength(); i++) {
            session.getTokens(i);
          }
          callback();
        });
      }

    };

    editor.replaceRequestRange = function (newRequest, requestRange) {
      var text = utils.textFromRequest(newRequest);
      if (requestRange) {
        editor.getSession().replace(requestRange, text);
      }
      else {
        // just insert where we are
        editor.insert(text);
      }
    };

    editor.iterForCurrentLoc = function () {
      var pos = editor.getCursorPosition();
      return editor.iterForPosition(pos.row, pos.column, editor);
    };

    editor.iterForPosition = function (row, column) {
      return new (ace.require("ace/token_iterator").TokenIterator)(editor.getSession(), row, column);
    };

    editor.getCurrentRequestRange = onceDoneTokenizing(function (cb) {
      if (typeof cb !== 'function') return;

      if (editor.parser.isInBetweenRequestsRow(null)) {
        cb(null);
        return
      }

      var reqStart = editor.prevRequestStart(null, editor);
      var reqEnd = editor.nextRequestEnd(reqStart, editor);
      cb(new (ace.require("ace/range").Range)(
        reqStart.row, reqStart.column,
        reqEnd.row, reqEnd.column
      ));
    });

    editor.getCurrentRequest = onceDoneTokenizing(function (cb) {
      if (typeof cb !== 'function') return;
      if (editor.parser.isInBetweenRequestsRow(null)) {
        cb(null);
        return;
      }

      var request = {
        method: "",
        data: [],
        url: null
      };

      editor.getCurrentRequestRange(function (currentReqRange) {
        var pos = currentReqRange.start;
        var tokenIter = editor.iterForPosition(pos.row, pos.column, editor);
        var t = tokenIter.getCurrentToken();
        request.method = t.value;
        t = editor.parser.nextNonEmptyToken(tokenIter);
        if (!t || t.type == "method") return null;
        request.url = "";
        while (t && t.type && t.type.indexOf("url") == 0) {
          request.url += t.value;
          t = tokenIter.stepForward();
        }

        var bodyStartRow = (t ? 0 : 1) + tokenIter.getCurrentTokenRow(); // artificially increase end of docs.
        var bodyStartColumn = 0;
        var dataEndPos;
        while (bodyStartRow < currentReqRange.end.row
          || (
          bodyStartRow == currentReqRange.end.row
            && bodyStartColumn < currentReqRange.end.column
          )
          ) {
          dataEndPos = editor.nextDataDocEnd({ row: bodyStartRow, column: bodyStartColumn});
          var bodyRange = new (ace.require("ace/range").Range)(
            bodyStartRow, bodyStartColumn,
            dataEndPos.row, dataEndPos.column
          );
          var data = editor.getSession().getTextRange(bodyRange);
          request.data.push(data.trim());
          bodyStartRow = dataEndPos.row + 1;
          bodyStartColumn = 0;
        }

        cb(request);
      });
    });

    editor.moveToPreviousRequestEdge = onceDoneTokenizing(function () {
      var pos = editor.getCursorPosition();
      for (pos.row--; pos.row > 0 && !editor.parser.isRequestEdge(pos.row); pos.row--) {
      }
      editor.moveCursorTo(pos.row, 0);
    });

    editor.moveToNextRequestEdge = onceDoneTokenizing(function () {
      var pos = editor.getCursorPosition();
      var maxRow = editor.getSession().getLength();
      for (pos.row++; pos.row < maxRow && !editor.parser.isRequestEdge(pos.row); pos.row++) {
      }
      editor.moveCursorTo(pos.row, 0);
    });

    editor.nextRequestEnd = function (pos) {
      pos = pos || editor.getCursorPosition();
      var session = editor.getSession();
      var curRow = pos.row;
      var maxLines = session.getLength();
      for (; curRow < maxLines - 1; curRow++) {
        var curRowMode = editor.parser.getRowParseMode(curRow, editor);
        if ((curRowMode & RowParser.MODE_REQUEST_END) > 0) break;
        if (curRow != pos.row && (curRowMode & RowParser.MODE_REQUEST_START) > 0) break;
      }

      var column = (session.getLine(curRow) || "").length;

      return { row: curRow, column: column};
    };

    editor.nextDataDocEnd = function (pos) {
      pos = pos || editor.getCursorPosition();
      var session = editor.getSession();
      var curRow = pos.row;
      var maxLines = session.getLength();
      for (; curRow < maxLines - 1; curRow++) {
        var curRowMode = editor.parser.getRowParseMode(curRow, editor);
        if ((curRowMode & RowParser.REQUEST_END) > 0) {
          break;
        }
        if ((curRowMode & RowParser.MODE_MULTI_DOC_CUR_DOC_END) > 0) break;
        if (curRow != pos.row && (curRowMode & RowParser.MODE_REQUEST_START) > 0) break;
      }

      var column = (session.getLine(curRow) || "").length;

      return { row: curRow, column: column };
    };

    // overwrite the actual aceEditor's onPaste method
    var origOnPaste = editor.__ace.onPaste;
    editor.__ace.onPaste = function (text) {
      if (text && curl.detectCURL(text)) {
        editor.handleCURLPaste(text);
        return;
      }
      origOnPaste.call(null, text);
    };

    editor.handleCURLPaste = function (text) {
      var curlInput = curl.parseCURL(text);
      if ($("#es_server").val()) curlInput.server = null; // do not override server

      if (!curlInput.method) curlInput.method = "GET";

      editor.insert(utils.textFromRequest(curlInput));
    };

    editor.highlightCurrentRequestAndUpdateActionBar = onceDoneTokenizing(function () {
      var session = editor.getSession();
      editor.getCurrentRequestRange(function (new_current_req_range) {
        if (new_current_req_range == null && CURRENT_REQ_RANGE == null) return;
        if (new_current_req_range != null && CURRENT_REQ_RANGE != null &&
          new_current_req_range.start.row == CURRENT_REQ_RANGE.start.row &&
          new_current_req_range.end.row == CURRENT_REQ_RANGE.end.row
          ) {
          // same request, now see if we are on the first line and update the action bar
          var cursorRow = editor.getCursorPosition().row;
          if (cursorRow == CURRENT_REQ_RANGE.start.row) {
            editor.updateActionsBar();
          }
          return; // nothing to do..
        }

        if (CURRENT_REQ_RANGE) {
          session.removeMarker(CURRENT_REQ_RANGE.marker_id);
        }

        CURRENT_REQ_RANGE = new_current_req_range;
        if (CURRENT_REQ_RANGE) {
          CURRENT_REQ_RANGE.marker_id = session.addMarker(CURRENT_REQ_RANGE, "ace_snippet-marker", "fullLine");
        }
        editor.updateActionsBar();
      });
    }, true);

    editor.getCurrentRequestAsCURL = function (cb) {
      cb = typeof cb === 'function' ? cb : $.noop;
      editor.getCurrentRequest(function (req) {
        if (!req) return;

        var es_server = $("#es_server").val(),
          es_url = req.url,
          es_method = req.method,
          es_data = req.data;

        var url = utils.constructESUrl(es_server, es_url);

        var curl = 'curl -X' + es_method + ' "' + url + '"';
        if (es_data && es_data.length) {
          curl += " -d'\n";
          // since Sense doesn't allow single quote json string any single qoute is within a string.
          curl += es_data.join("\n").replace(/'/g, '\\"');
          if (es_data.length > 1) curl += "\n"; // end with a new line
          curl += "'";
        }

        cb(curl);
      });
    };

    editor.getSession().on('tokenizerUpdate', function (e) {
      editor.highlightCurrentRequestAndUpdateActionBar();
    });

    editor.getSession().selection.on('changeCursor', function (e) {
      editor.highlightCurrentRequestAndUpdateActionBar();
    });

    editor.updateActionsBar = function () {
      var editor_actions = $("#editor_actions");

      if (CURRENT_REQ_RANGE) {
        var row = CURRENT_REQ_RANGE.start.row;
        var column = CURRENT_REQ_RANGE.start.column;
        var session = editor.session;
        var firstLine = session.getLine(row);
        var offset = 0;
        if (firstLine.length > session.getScreenWidth() - 5) {
          // overlap first row
          if (row > 0) row--; else row++;
        }
        var screen_pos = editor.renderer.textToScreenCoordinates(row, column);
        offset += screen_pos.pageY;
        var end_offset = editor.renderer.textToScreenCoordinates(CURRENT_REQ_RANGE.end.row,
          CURRENT_REQ_RANGE.end.column).pageY;

        offset = Math.min(end_offset, Math.max(offset, 47));
        if (offset >= 47) {
          editor_actions.css("top", Math.max(offset, 47));
          editor_actions.css('visibility', 'visible');
        }
        else {
          editor_actions.css("top", 0);
          editor_actions.css('visibility', 'hidden');
        }
      }
      else {
        editor_actions.css("top", 0);
        editor_actions.css('visibility', 'hidden');
      }
    };

    editor.getSession().on("changeScrollTop", editor.updateActionsBar);

    return editor;
  }

  return SenseEditor;
})