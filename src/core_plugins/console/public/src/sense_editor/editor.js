let _ = require('lodash');
let ace = require('ace');
let $ = require('jquery');
let curl = require('../curl');
let RowParser = require('./row_parser');
let InputMode = require('./mode/input');
let utils = require('../utils');
let es = require('../es');
import chrome from 'ui/chrome';

import smartResize from '../smart_resize';

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

  // iterate all of the accessible properties/method, on the prototype and beyond
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
  // place holder for an action bar, needs to be set externally.
  editor.$actions = null;

  // mixin the RowParser
  editor.parser = new RowParser(editor);
  editor.resize = smartResize(editor);

  // dirty check for tokenizer state, uses a lot less cycles
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
        }
        else {
          func.apply(self, args);
        }
      });
    };
  };

  editor.setShowPrintMargin(false);
  (function (session) {
    session.setMode(new InputMode.Mode());
    session.setFoldStyle('markbeginend');
    session.setTabSize(2);
    session.setUseWrapMode(true);
  })(editor.getSession());

  editor.prevRequestStart = function (rowOrPos) {
    rowOrPos = _.isUndefined(rowOrPos) || rowOrPos == null ? editor.getCursorPosition() : rowOrPos;

    var curRow = _.isObject(rowOrPos) ? rowOrPos.row : rowOrPos;
    while (curRow > 0 && !editor.parser.isStartRequestRow(curRow, editor)) curRow--;

    return {
      row: curRow,
      column: 0
    };
  };

  editor.nextRequestStart = function (rowOrPos) {
    rowOrPos = _.isUndefined(rowOrPos) || rowOrPos == null ? editor.getCursorPosition() : rowOrPos;
    var session = editor.getSession();
    var curRow = _.isObject(rowOrPos) ? rowOrPos.row : rowOrPos;
    var maxLines = session.getLength();
    for (; curRow < maxLines - 1; curRow++) {
      if (editor.parser.isStartRequestRow(curRow, editor)) {
        break;
      }
    }
    return {
      row: curRow,
      column: 0
    };
  };

  editor.autoIndent = onceDoneTokenizing(function () {
    editor.getRequestRange(function (req_range) {
      if (!req_range) {
        return;
      }
      editor.getRequest(function (parsed_req) {
        if (parsed_req.data && parsed_req.data.length > 0) {
          var indent = parsed_req.data.length == 1; // unindent multi docs by default
          var formatted_data = utils.reformatData(parsed_req.data, indent);
          if (!formatted_data.changed) {
            // toggle.
            indent = !indent;
            formatted_data = utils.reformatData(parsed_req.data, indent);
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
      var pos = editor.getCursorPosition();
      editor.getSession().replace(requestRange, text);
      var max_row = Math.max(requestRange.start.row + text.split('\n').length - 1, 0);
      pos.row = Math.min(pos.row, max_row);
      editor.moveCursorToPosition(pos);
      // ACE UPGRADE - check if needed - at the moment the above may trigger a selection.
      editor.clearSelection();
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

  editor.getRequestRange = onceDoneTokenizing(function (row, cb) {
    if (_.isUndefined(cb)) {
      cb = row;
      row = null;
    }
    if (typeof cb !== 'function') {
      return;
    }

    if (editor.parser.isInBetweenRequestsRow(row)) {
      cb(null);
      return
    }

    var reqStart = editor.prevRequestStart(row, editor);
    var reqEnd = editor.nextRequestEnd(reqStart, editor);
    cb(new (ace.require("ace/range").Range)(
      reqStart.row, reqStart.column,
      reqEnd.row, reqEnd.column
    ));
  });

  editor.getEngulfingRequestsRange = onceDoneTokenizing(function (range, cb) {
    if (_.isUndefined(cb)) {
      cb = range;
      range = null;
    }

    range = range || editor.getSelectionRange();

    var session = editor.getSession();
    var startRow = range.start.row;
    var endRow = range.end.row;
    var maxLine = Math.max(0, session.getLength() - 1);

    // move start row to the previous request start if in body, o.w. forward
    if (editor.parser.isInBetweenRequestsRow(startRow)) {
      //for (; startRow <= endRow; startRow++) {
      //  if (editor.parser.isStartRequestRow(startRow)) {
      //    break;
      //  }
      //}
    }
    else {
      for (; startRow >= 0; startRow--) {
        if (editor.parser.isStartRequestRow(startRow)) {
          break;
        }
      }
    }

    if (startRow < 0 || startRow > endRow) {
      cb(null);
      return;
    }
    // move end row to the previous request end if between requests, o.w. walk forward
    if (editor.parser.isInBetweenRequestsRow(endRow)) {
      for (; endRow >= startRow; endRow--) {
        if (editor.parser.isEndRequestRow(endRow)) {
          break;
        }
      }
    }
    else {

      for (; endRow <= maxLine; endRow++) {
        if (editor.parser.isEndRequestRow(endRow)) {
          break;
        }
      }

    }

    if (endRow < startRow || endRow > maxLine) {
      cb(null);
      return;
    }

    var endColumn = (session.getLine(endRow) || "").replace(/\s+$/, "").length;
    cb(new (ace.require("ace/range").Range)(startRow, 0, endRow, endColumn));
  });


  editor.getRequestInRange = onceDoneTokenizing(function (range, cb) {
    var request = {
      method: "",
      data: [],
      url: null,
      range: range
    };

    var pos = range.start;
    var tokenIter = editor.iterForPosition(pos.row, pos.column, editor);
    var t = tokenIter.getCurrentToken();
    if (editor.parser.isEmptyToken(t)) {
      // if the row starts with some spaces, skip them.
      t = editor.parser.nextNonEmptyToken(tokenIter);
    }
    request.method = t.value;
    t = editor.parser.nextNonEmptyToken(tokenIter);
    if (!t || t.type == "method") {
      return null;
    }
    request.url = "";
    while (t && t.type && t.type.indexOf("url") == 0) {
      request.url += t.value;
      t = tokenIter.stepForward();
    }
    if (editor.parser.isEmptyToken(t)) {
      // if the url row ends with some spaces, skip them.
      t = editor.parser.nextNonEmptyToken(tokenIter);
    }

    var bodyStartRow = (t ? 0 : 1) + tokenIter.getCurrentTokenRow(); // artificially increase end of docs.
    var dataEndPos;
    while (bodyStartRow < range.end.row || (
      bodyStartRow == range.end.row && 0 < range.end.column
    )) {
      dataEndPos = editor.nextDataDocEnd({
        row: bodyStartRow,
        column: 0
      });
      var bodyRange = new (ace.require("ace/range").Range)(
        bodyStartRow, 0,
        dataEndPos.row, dataEndPos.column
      );
      var data = editor.getSession().getTextRange(bodyRange);
      request.data.push(data.trim());
      bodyStartRow = dataEndPos.row + 1;
    }

    cb(request);
  });

  editor.getRequestsInRange = function (range, includeNonRequestBlocks, cb) {
    if (_.isUndefined(includeNonRequestBlocks)) {
      includeNonRequestBlocks = false;
      cb = range;
      range = null;
    } else if (_.isUndefined(cb)) {
      cb = includeNonRequestBlocks;
      includeNonRequestBlocks = false;
    }

    function explicitRangeToRequests(requestsRange, tempCb) {
      if (!requestsRange) {
        tempCb([]);
        return;
      }

      var startRow = requestsRange.start.row;
      var endRow = requestsRange.end.row;

      // move to the next request start (during the second iterations this may not be exactly on a request
      var currentRow = startRow;
      for (; currentRow <= endRow; currentRow++) {
        if (editor.parser.isStartRequestRow(currentRow)) {
          break;
        }
      }

      var nonRequestPrefixBlock = null;
      if (includeNonRequestBlocks && currentRow != startRow) {
        nonRequestPrefixBlock = editor.getSession().getLines(startRow, currentRow - 1).join("\n");
      }

      if (currentRow > endRow) {
        tempCb(nonRequestPrefixBlock ? [nonRequestPrefixBlock] : []);
        return;
      }

      editor.getRequest(currentRow, function (request) {
        explicitRangeToRequests({
            start: {
              row: request.range.end.row + 1
            },
            end: {
              row: requestsRange.end.row
            }
          },
          function (rest_of_requests) {
            rest_of_requests.unshift(request);
            if (nonRequestPrefixBlock != null) {
              rest_of_requests.unshift(nonRequestPrefixBlock);
            }
            tempCb(rest_of_requests);
          }
        )
      })
    }

    editor.getEngulfingRequestsRange(range, function (requestRange) {
      explicitRangeToRequests(requestRange, cb);
    });
  };

  editor.getRequest = onceDoneTokenizing(function (row, cb) {
    if (_.isUndefined(cb)) {
      cb = row;
      row = null;
    }
    if (typeof cb !== 'function') {
      return;
    }
    if (editor.parser.isInBetweenRequestsRow(row)) {
      cb(null);
      return;
    }
    editor.getRequestRange(row, function (range) {
      editor.getRequestInRange(range, cb);
    });
  });

  editor.moveToPreviousRequestEdge = onceDoneTokenizing(function () {
    var pos = editor.getCursorPosition();
    for (pos.row--; pos.row > 0 && !editor.parser.isRequestEdge(pos.row); pos.row--) {
    }
    editor.moveCursorTo(pos.row, 0);
  });

  editor.moveToNextRequestEdge = onceDoneTokenizing(function (moveOnlyIfNotOnEdge) {
    var pos = editor.getCursorPosition();
    var maxRow = editor.getSession().getLength();
    if (!moveOnlyIfNotOnEdge) {
      pos.row++;
    }
    for (; pos.row < maxRow && !editor.parser.isRequestEdge(pos.row); pos.row++) {
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
      if ((curRowMode & editor.parser.MODE.REQUEST_END) > 0) {
        break;
      }
      if (curRow != pos.row && (curRowMode & editor.parser.MODE.REQUEST_START) > 0) {
        break;
      }
    }

    var column = (session.getLine(curRow) || "").replace(/\s+$/, "").length;

    return {
      row: curRow,
      column: column
    };
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
      if ((curRowMode & editor.parser.MODE.MULTI_DOC_CUR_DOC_END) > 0) {
        break;
      }
      if (curRow != pos.row && (curRowMode & editor.parser.MODE.REQUEST_START) > 0) {
        break;
      }
    }

    var column = (session.getLine(curRow) || "").length;

    return {
      row: curRow,
      column: column
    };
  };

  // overwrite the actual aceEditor's onPaste method
  var origOnPaste = editor.__ace.onPaste;
  editor.__ace.onPaste = function (text) {
    if (text && curl.detectCURL(text)) {
      editor.handleCURLPaste(text);
      return;
    }
    origOnPaste.call(this, text);
  };

  editor.handleCURLPaste = function (text) {
    var curlInput = curl.parseCURL(text);

    editor.insert(curlInput);
  };

  editor.highlightCurrentRequestsAndUpdateActionBar = onceDoneTokenizing(function () {
    var session = editor.getSession();
    editor.getEngulfingRequestsRange(function (new_current_req_range) {
      if (new_current_req_range == null && CURRENT_REQ_RANGE == null) {
        return;
      }
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

  editor.getRequestsAsCURL = function (range, cb) {
    if (_.isUndefined(cb)) {
      cb = range;
      range = null;
    }

    if (_.isUndefined(cb)) {
      cb = $.noop;
    }

    editor.getRequestsInRange(range, true, function (requests) {

      var result = _.map(requests, function requestToCurl(req) {

        if (typeof req === "string") {
          // no request block
          return req;
        }

        var
          es_path = req.url,
          es_method = req.method,
          es_data = req.data;

        const elasticsearchBaseUrl = chrome.getInjected('elasticsearchUrl');
        var url = es.constructESUrl(elasticsearchBaseUrl, es_path);

        var ret = 'curl -X' + es_method + ' "' + url + '"';
        if (es_data && es_data.length) {
          ret += " -H 'Content-Type: application/json' -d'\n";
          var data_as_string = utils.collapseLiteralStrings(es_data.join("\n"))
          // since Sense doesn't allow single quote json string any single qoute is within a string.
          ret += data_as_string.replace(/'/g, '\\"');
          if (es_data.length > 1) {
            ret += "\n";
          } // end with a new line
          ret += "'";
        }
        return ret;
      });

      cb(result.join("\n"));
    });
  };

  editor.getSession().on('tokenizerUpdate', function () {
    editor.highlightCurrentRequestsAndUpdateActionBar();
  });

  editor.getSession().selection.on('changeCursor', function () {
    editor.highlightCurrentRequestsAndUpdateActionBar();
  });

  editor.updateActionsBar = (function () {
    var set = function (top) {
      if (top == null) {
        editor.$actions.css('visibility', 'hidden');
      }
      else {
        editor.$actions.css({
          top: top,
          visibility: 'visible'
        });
      }
    };

    var hide = function () {
      set();
    };

    return function () {
      if (!editor.$actions) {
        return;
      }
      if (CURRENT_REQ_RANGE) {
        // elements are positioned relative to the editor's container
        // pageY is relative to page, so subtract the offset
        // from pageY to get the new top value
        var offsetFromPage = editor.$el.offset().top;
        var startRow = CURRENT_REQ_RANGE.start.row;
        var startColumn = CURRENT_REQ_RANGE.start.column;
        var session = editor.session;
        var firstLine = session.getLine(startRow);

        if (firstLine.length > session.getWrapLimit() - 5) {
          // overlap first row
          if (startRow > 0) {
            startRow--;
          }
          else {
            startRow++;
          }
        }


        var topOfReq = editor.renderer.textToScreenCoordinates(startRow, startColumn).pageY - offsetFromPage;

        if (topOfReq >= 0) {
          return set(topOfReq);
        }

        var bottomOfReq = editor.renderer.textToScreenCoordinates(
            CURRENT_REQ_RANGE.end.row,
            CURRENT_REQ_RANGE.end.column
          ).pageY - offsetFromPage;

        if (bottomOfReq >= 0) {
          return set(0);
        }
      }

      hide();
    }
  }());

  editor.getSession().on("changeScrollTop", editor.updateActionsBar);

  return editor;
}

module.exports = SenseEditor;
