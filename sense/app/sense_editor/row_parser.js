define([], function () {
  'use strict';

  function RowParser(editor) {
    var defaultEditor = editor;

    this.getRowParseMode = function (row) {
      if (row == null || typeof row == "undefined") row = editor.getCursorPosition().row;

      var session = editor.getSession();
      if (row >= session.getLength()) return RowParser.MODE_BETWEEN_REQUESTS;
      var mode = session.getState(row);
      if (!mode)
        return RowParser.MODE_BETWEEN_REQUESTS; // shouldn't really happen

      if (mode !== "start") return RowParser.MODE_IN_REQUEST;
      var line = (session.getLine(row) || "").trim();
      if (!line || line[0] === '#') return RowParser.MODE_BETWEEN_REQUESTS; // empty line or a comment waiting for a new req to start

      if (line.indexOf("}", line.length - 1) >= 0) {
        // check for a multi doc request (must start a new json doc immediately after this one end.
        row++;
        if (row < session.getLength()) {
          line = (session.getLine(row) || "").trim();
          if (line.indexOf("{") === 0) { // next line is another doc in a multi doc
            return RowParser.MODE_MULTI_DOC_CUR_DOC_END | RowParser.MODE_IN_REQUEST;
          }

        }
        return RowParser.MODE_REQUEST_END | RowParser.MODE_MULTI_DOC_CUR_DOC_END; // end of request
      }

      // check for single line requests
      row++;
      if (row >= session.getLength()) {
        return RowParser.MODE_REQUEST_START | RowParser.MODE_REQUEST_END;
      }
      line = (session.getLine(row) || "").trim();
      if (line.indexOf("{") !== 0) { // next line is another request
        return RowParser.MODE_REQUEST_START | RowParser.MODE_REQUEST_END;
      }

      return RowParser.MODE_REQUEST_START;
    }

    this.rowPredicate = function (row, editor, value) {
      var mode = this.getRowParseMode(row, editor);
      return (mode & value) > 0;
    }

    this.isEndRequestRow = function (row, _e) {
      var editor = _e || defaultEditor;
      return this.rowPredicate(row, editor, RowParser.MODE_REQUEST_END);
    };

    this.isRequestEdge = function (row, _e) {
      var editor = _e || defaultEditor;
      return this.rowPredicate(row, editor, RowParser.MODE_REQUEST_END | RowParser.MODE_REQUEST_START);
    };

    this.isStartRequestRow = function (row, _e) {
      var editor = _e || defaultEditor;
      return this.rowPredicate(row, editor, RowParser.MODE_REQUEST_START);
    };

    this.isInBetweenRequestsRow = function (row, _e) {
      var editor = _e || defaultEditor;
      return this.rowPredicate(row, editor, RowParser.MODE_BETWEEN_REQUESTS);
    };

    this.isInRequestsRow = function (row, _e) {
      var editor = _e || defaultEditor;
      return this.rowPredicate(row, editor, RowParser.MODE_IN_REQUEST);
    };

    this.isMultiDocDocEndRow = function (row, _e) {
      var editor = _e || defaultEditor;
      return this.rowPredicate(row, editor, RowParser.MODE_MULTI_DOC_CUR_DOC_END);
    };

    this.isEmptyToken = function (tokenOrTokenIter) {
      var token = tokenOrTokenIter && tokenOrTokenIter.getCurrentToken ? tokenOrTokenIter.getCurrentToken() : tokenOrTokenIter;
      return !token || token.type == "whitespace"
    };

    this.isUrlOrMethodToken = function (tokenOrTokenIter) {
      var t = tokenOrTokenIter.getCurrentToken ? tokenOrTokenIter.getCurrentToken() : tokenOrTokenIter;
      return t && t.type && (t.type == "method" || t.type.indexOf("url") === 0);
    };


    this.nextNonEmptyToken = function (tokenIter) {
      var t = tokenIter.stepForward();
      while (t && this.isEmptyToken(t)) t = tokenIter.stepForward();
      return t;
    };

    this.prevNonEmptyToken = function (tokenIter) {
      var t = tokenIter.stepBackward();
      // empty rows return null token.
      while ((t || tokenIter.getCurrentTokenRow() > 0) && this.isEmptyToken(t)) t = tokenIter.stepBackward();
      return t;
    };
  }

  RowParser.MODE_REQUEST_START = 2;
  RowParser.MODE_IN_REQUEST = 4;
  RowParser.MODE_MULTI_DOC_CUR_DOC_END = 8;
  RowParser.MODE_REQUEST_END = 16;
  RowParser.MODE_BETWEEN_REQUESTS = 32;

  return RowParser;
})