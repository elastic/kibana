/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

const _ = require('lodash');
const ace = require('brace');
const $ = require('jquery');
const curl = require('../curl');
const RowParser = require('./row_parser');
const InputMode = require('./mode/input');
const utils = require('../utils');
const es = require('../es');
const chrome = require('ui/chrome');

const smartResize = require('../smart_resize');

function createInstance($el) {
  const aceEditor = ace.edit($el[0]);

  // we must create a custom class for each instance, so that the prototype
  // can be the unique aceEditor it extends
  const CustomSenseEditor = function() {};
  CustomSenseEditor.prototype = {};

  function bindProp(key) {
    Object.defineProperty(CustomSenseEditor.prototype, key, {
      get: function() {
        return aceEditor[key];
      },
      set: function(val) {
        aceEditor[key] = val;
      },
    });
  }

  // iterate all of the accessible properties/method, on the prototype and beyond
  // eslint-disable-next-line guard-for-in
  for (const key in aceEditor) {
    switch (typeof aceEditor[key]) {
      case 'function':
        CustomSenseEditor.prototype[key] = _.bindKey(aceEditor, key);
        break;
      default:
        bindProp(key);
        break;
    }
  }

  const editor = new CustomSenseEditor();
  editor.__ace = aceEditor;
  return editor;
}

export default function SenseEditor($el) {
  const editor = createInstance($el);
  let CURRENT_REQ_RANGE = null;

  editor.$el = $el;
  // place holder for an action bar, needs to be set externally.
  editor.$actions = null;

  // mixin the RowParser
  editor.parser = new RowParser(editor);
  editor.resize = smartResize(editor);

  // dirty check for tokenizer state, uses a lot less cycles
  // than listening for tokenizerUpdate
  const onceDoneTokenizing = function(callback, cancelAlreadyScheduledCalls) {
    const session = editor.getSession();
    let timer = false;
    const checkInterval = 25;

    return function() {
      const self = this;
      const args = [].slice.call(arguments, 0);

      if (cancelAlreadyScheduledCalls) {
        timer = clearTimeout(timer);
      }

      setTimeout(function check() {
        // If the bgTokenizer doesn't exist, we can assume that the underlying editor has been
        // torn down, e.g. by closing the History tab, and we don't need to do anything further.
        if (session.bgTokenizer) {
          // Wait until the bgTokenizer is done running before executing the callback.
          if (session.bgTokenizer.running) {
            timer = setTimeout(check, checkInterval);
          } else {
            callback.apply(self, args);
          }
        }
      });
    };
  };

  editor.setShowPrintMargin(false);
  (function(session) {
    session.setMode(new InputMode.Mode());
    session.setFoldStyle('markbeginend');
    session.setTabSize(2);
    session.setUseWrapMode(true);
  })(editor.getSession());

  editor.prevRequestStart = function(rowOrPos) {
    rowOrPos = _.isUndefined(rowOrPos) || rowOrPos === null ? editor.getCursorPosition() : rowOrPos;

    let curRow = _.isObject(rowOrPos) ? rowOrPos.row : rowOrPos;
    while (curRow > 0 && !editor.parser.isStartRequestRow(curRow, editor)) curRow--;

    return {
      row: curRow,
      column: 0,
    };
  };

  editor.nextRequestStart = function(rowOrPos) {
    rowOrPos = _.isUndefined(rowOrPos) || rowOrPos === null ? editor.getCursorPosition() : rowOrPos;
    const session = editor.getSession();
    let curRow = _.isObject(rowOrPos) ? rowOrPos.row : rowOrPos;
    const maxLines = session.getLength();
    for (; curRow < maxLines - 1; curRow++) {
      if (editor.parser.isStartRequestRow(curRow, editor)) {
        break;
      }
    }
    return {
      row: curRow,
      column: 0,
    };
  };

  editor.autoIndent = onceDoneTokenizing(function() {
    editor.getRequestRange(function(reqRange) {
      if (!reqRange) {
        return;
      }
      editor.getRequest(function(parsedReq) {
        if (parsedReq.data && parsedReq.data.length > 0) {
          let indent = parsedReq.data.length === 1; // unindent multi docs by default
          let formattedData = utils.reformatData(parsedReq.data, indent);
          if (!formattedData.changed) {
            // toggle.
            indent = !indent;
            formattedData = utils.reformatData(parsedReq.data, indent);
          }
          parsedReq.data = formattedData.data;

          editor.replaceRequestRange(parsedReq, reqRange);
        }
      });
    });
  }, true);

  editor.update = function(data, callback) {
    callback = typeof callback === 'function' ? callback : null;
    const session = editor.getSession();

    session.setValue(data);
    if (callback) {
      // force update of tokens, but not on this thread to allow for ace rendering.
      setTimeout(function() {
        let i;
        for (i = 0; i < session.getLength(); i++) {
          session.getTokens(i);
        }
        callback();
      });
    }
  };

  editor.replaceRequestRange = function(newRequest, requestRange) {
    const text = utils.textFromRequest(newRequest);
    if (requestRange) {
      const pos = editor.getCursorPosition();
      editor.getSession().replace(requestRange, text);
      const maxRow = Math.max(requestRange.start.row + text.split('\n').length - 1, 0);
      pos.row = Math.min(pos.row, maxRow);
      editor.moveCursorToPosition(pos);
      // ACE UPGRADE - check if needed - at the moment the above may trigger a selection.
      editor.clearSelection();
    } else {
      // just insert where we are
      editor.insert(text);
    }
  };

  editor.iterForCurrentLoc = function() {
    const pos = editor.getCursorPosition();
    return editor.iterForPosition(pos.row, pos.column, editor);
  };

  editor.iterForPosition = function(row, column) {
    return new (ace.acequire('ace/token_iterator')).TokenIterator(editor.getSession(), row, column);
  };

  editor.getRequestRange = onceDoneTokenizing(function(row, cb) {
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

    const reqStart = editor.prevRequestStart(row, editor);
    const reqEnd = editor.nextRequestEnd(reqStart, editor);
    cb(
      new (ace.acequire('ace/range')).Range(
        reqStart.row,
        reqStart.column,
        reqEnd.row,
        reqEnd.column
      )
    );
  });

  editor.getEngulfingRequestsRange = onceDoneTokenizing(function(range, cb) {
    if (_.isUndefined(cb)) {
      cb = range;
      range = null;
    }

    range = range || editor.getSelectionRange();

    const session = editor.getSession();
    let startRow = range.start.row;
    let endRow = range.end.row;
    const maxLine = Math.max(0, session.getLength() - 1);

    // move start row to the previous request start if in body, o.w. forward
    if (editor.parser.isInBetweenRequestsRow(startRow)) {
      //for (; startRow <= endRow; startRow++) {
      //  if (editor.parser.isStartRequestRow(startRow)) {
      //    break;
      //  }
      //}
    } else {
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
    } else {
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

    const endColumn = (session.getLine(endRow) || '').replace(/\s+$/, '').length;
    cb(new (ace.acequire('ace/range')).Range(startRow, 0, endRow, endColumn));
  });

  editor.getRequestInRange = onceDoneTokenizing(function(range, cb) {
    if (!range) {
      return;
    }
    const request = {
      method: '',
      data: [],
      url: null,
      range: range,
    };

    const pos = range.start;
    const tokenIter = editor.iterForPosition(pos.row, pos.column, editor);
    let t = tokenIter.getCurrentToken();
    if (editor.parser.isEmptyToken(t)) {
      // if the row starts with some spaces, skip them.
      t = editor.parser.nextNonEmptyToken(tokenIter);
    }
    request.method = t.value;
    t = editor.parser.nextNonEmptyToken(tokenIter);
    if (!t || t.type === 'method') {
      return null;
    }
    request.url = '';
    while (t && t.type && t.type.indexOf('url') === 0) {
      request.url += t.value;
      t = tokenIter.stepForward();
    }
    if (editor.parser.isEmptyToken(t)) {
      // if the url row ends with some spaces, skip them.
      t = editor.parser.nextNonEmptyToken(tokenIter);
    }

    let bodyStartRow = (t ? 0 : 1) + tokenIter.getCurrentTokenRow(); // artificially increase end of docs.
    let dataEndPos;
    while (
      bodyStartRow < range.end.row ||
      (bodyStartRow === range.end.row && 0 < range.end.column)
    ) {
      dataEndPos = editor.nextDataDocEnd({
        row: bodyStartRow,
        column: 0,
      });
      const bodyRange = new (ace.acequire('ace/range')).Range(
        bodyStartRow,
        0,
        dataEndPos.row,
        dataEndPos.column
      );
      const data = editor.getSession().getTextRange(bodyRange);
      request.data.push(data.trim());
      bodyStartRow = dataEndPos.row + 1;
    }

    cb(request);
  });

  editor.getRequestsInRange = function(range, includeNonRequestBlocks, cb) {
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

      const startRow = requestsRange.start.row;
      const endRow = requestsRange.end.row;

      // move to the next request start (during the second iterations this may not be exactly on a request
      let currentRow = startRow;
      for (; currentRow <= endRow; currentRow++) {
        if (editor.parser.isStartRequestRow(currentRow)) {
          break;
        }
      }

      let nonRequestPrefixBlock = null;
      if (includeNonRequestBlocks && currentRow !== startRow) {
        nonRequestPrefixBlock = editor
          .getSession()
          .getLines(startRow, currentRow - 1)
          .join('\n');
      }

      if (currentRow > endRow) {
        tempCb(nonRequestPrefixBlock ? [nonRequestPrefixBlock] : []);
        return;
      }

      editor.getRequest(currentRow, function(request) {
        if (!request) {
          return;
        }
        explicitRangeToRequests(
          {
            start: {
              row: request.range.end.row + 1,
            },
            end: {
              row: requestsRange.end.row,
            },
          },
          function(restOfRequests) {
            restOfRequests.unshift(request);
            if (nonRequestPrefixBlock !== null) {
              restOfRequests.unshift(nonRequestPrefixBlock);
            }
            tempCb(restOfRequests);
          }
        );
      });
    }

    editor.getEngulfingRequestsRange(range, function(requestRange) {
      explicitRangeToRequests(requestRange, cb);
    });
  };

  editor.getRequest = onceDoneTokenizing(function(row, cb) {
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
    editor.getRequestRange(row, function(range) {
      editor.getRequestInRange(range, cb);
    });
  });

  editor.moveToPreviousRequestEdge = onceDoneTokenizing(function() {
    const pos = editor.getCursorPosition();
    for (pos.row--; pos.row > 0 && !editor.parser.isRequestEdge(pos.row); pos.row--) {
      // loop for side effects
    }
    editor.moveCursorTo(pos.row, 0);
  });

  editor.moveToNextRequestEdge = onceDoneTokenizing(function(moveOnlyIfNotOnEdge) {
    const pos = editor.getCursorPosition();
    const maxRow = editor.getSession().getLength();
    if (!moveOnlyIfNotOnEdge) {
      pos.row++;
    }
    for (; pos.row < maxRow && !editor.parser.isRequestEdge(pos.row); pos.row++) {
      // loop for side effects
    }
    editor.moveCursorTo(pos.row, 0);
  });

  editor.nextRequestEnd = function(pos) {
    pos = pos || editor.getCursorPosition();
    const session = editor.getSession();
    let curRow = pos.row;
    const maxLines = session.getLength();
    for (; curRow < maxLines - 1; curRow++) {
      const curRowMode = editor.parser.getRowParseMode(curRow, editor);
      if ((curRowMode & editor.parser.MODE.REQUEST_END) > 0) {
        break;
      }
      if (curRow !== pos.row && (curRowMode & editor.parser.MODE.REQUEST_START) > 0) {
        break;
      }
    }

    const column = (session.getLine(curRow) || '').replace(/\s+$/, '').length;

    return {
      row: curRow,
      column: column,
    };
  };

  editor.nextDataDocEnd = function(pos) {
    pos = pos || editor.getCursorPosition();
    const session = editor.getSession();
    let curRow = pos.row;
    const maxLines = session.getLength();
    for (; curRow < maxLines - 1; curRow++) {
      const curRowMode = editor.parser.getRowParseMode(curRow, editor);
      if ((curRowMode & RowParser.REQUEST_END) > 0) {
        break;
      }
      if ((curRowMode & editor.parser.MODE.MULTI_DOC_CUR_DOC_END) > 0) {
        break;
      }
      if (curRow !== pos.row && (curRowMode & editor.parser.MODE.REQUEST_START) > 0) {
        break;
      }
    }

    const column = (session.getLine(curRow) || '').length;

    return {
      row: curRow,
      column: column,
    };
  };

  // overwrite the actual aceEditor's onPaste method
  const origOnPaste = editor.__ace.onPaste;
  editor.__ace.onPaste = function(text) {
    if (text && curl.detectCURL(text)) {
      editor.handleCURLPaste(text);
      return;
    }
    origOnPaste.call(this, text);
  };

  editor.handleCURLPaste = function(text) {
    const curlInput = curl.parseCURL(text);

    editor.insert(curlInput);
  };

  editor.highlightCurrentRequestsAndUpdateActionBar = onceDoneTokenizing(function() {
    const session = editor.getSession();
    editor.getEngulfingRequestsRange(function(newCurrentReqRange) {
      if (newCurrentReqRange === null && CURRENT_REQ_RANGE === null) {
        return;
      }
      if (
        newCurrentReqRange !== null &&
        CURRENT_REQ_RANGE !== null &&
        newCurrentReqRange.start.row === CURRENT_REQ_RANGE.start.row &&
        newCurrentReqRange.end.row === CURRENT_REQ_RANGE.end.row
      ) {
        // same request, now see if we are on the first line and update the action bar
        const cursorRow = editor.getCursorPosition().row;
        if (cursorRow === CURRENT_REQ_RANGE.start.row) {
          editor.updateActionsBar();
        }
        return; // nothing to do..
      }

      if (CURRENT_REQ_RANGE) {
        session.removeMarker(CURRENT_REQ_RANGE.marker_id);
      }

      CURRENT_REQ_RANGE = newCurrentReqRange;
      if (CURRENT_REQ_RANGE) {
        CURRENT_REQ_RANGE.marker_id = session.addMarker(
          CURRENT_REQ_RANGE,
          'ace_snippet-marker',
          'fullLine'
        );
      }
      editor.updateActionsBar();
    });
  }, true);

  editor.getRequestsAsCURL = function(range, cb) {
    if (_.isUndefined(cb)) {
      cb = range;
      range = null;
    }

    if (_.isUndefined(cb)) {
      cb = $.noop;
    }

    editor.getRequestsInRange(range, true, function(requests) {
      const result = _.map(requests, function requestToCurl(req) {
        if (typeof req === 'string') {
          // no request block
          return req;
        }

        const esPath = req.url;
        const esMethod = req.method;
        const esData = req.data;

        // this is the first url defined in elasticsearch.hosts
        const elasticsearchBaseUrl = chrome.getInjected('elasticsearchUrl');
        const url = es.constructESUrl(elasticsearchBaseUrl, esPath);

        let ret = 'curl -X' + esMethod + ' "' + url + '"';
        if (esData && esData.length) {
          ret += " -H 'Content-Type: application/json' -d'\n";
          const dataAsString = utils.collapseLiteralStrings(esData.join('\n'));
          // since Sense doesn't allow single quote json string any single qoute is within a string.
          ret += dataAsString.replace(/'/g, '\\"');
          if (esData.length > 1) {
            ret += '\n';
          } // end with a new line
          ret += "'";
        }
        return ret;
      });

      cb(result.join('\n'));
    });
  };

  editor.getSession().on('tokenizerUpdate', function() {
    editor.highlightCurrentRequestsAndUpdateActionBar();
  });

  editor.getSession().selection.on('changeCursor', function() {
    editor.highlightCurrentRequestsAndUpdateActionBar();
  });

  editor.updateActionsBar = (function() {
    const set = function(top) {
      if (top === null) {
        editor.$actions.css('visibility', 'hidden');
      } else {
        editor.$actions.css({
          top: top,
          visibility: 'visible',
        });
      }
    };

    const hide = function() {
      set();
    };

    return function() {
      if (!editor.$actions) {
        return;
      }
      if (CURRENT_REQ_RANGE) {
        // elements are positioned relative to the editor's container
        // pageY is relative to page, so subtract the offset
        // from pageY to get the new top value
        const offsetFromPage = editor.$el.offset().top;
        const startRow = CURRENT_REQ_RANGE.start.row;
        const startColumn = CURRENT_REQ_RANGE.start.column;
        const session = editor.session;
        const firstLine = session.getLine(startRow);
        const maxLineLength = session.getWrapLimit() - 5;
        const isWrapping = firstLine.length > maxLineLength;
        const getScreenCoords = row =>
          editor.renderer.textToScreenCoordinates(row, startColumn).pageY - offsetFromPage;
        const topOfReq = getScreenCoords(startRow);

        if (topOfReq >= 0) {
          let offset = 0;
          if (isWrapping) {
            // Try get the line height of the text area in pixels.
            const textArea = editor.$el.find('textArea');
            const hasRoomOnNextLine = session.getLine(startRow + 1).length < maxLineLength;
            if (textArea && hasRoomOnNextLine) {
              // Line height + the number of wraps we have on a line.
              offset += session.getRowLength(startRow) * textArea.height();
            } else {
              if (startRow > 0) {
                set(getScreenCoords(startRow - 1, startColumn));
                return;
              }
              set(getScreenCoords(startRow + 1, startColumn));
              return;
            }
          }
          set(topOfReq + offset);
          return;
        }

        const bottomOfReq =
          editor.renderer.textToScreenCoordinates(
            CURRENT_REQ_RANGE.end.row,
            CURRENT_REQ_RANGE.end.column
          ).pageY - offsetFromPage;

        if (bottomOfReq >= 0) {
          set(0);
          return;
        }
      }

      hide();
    };
  })();

  editor.getSession().on('changeScrollTop', editor.updateActionsBar);

  return editor;
}
