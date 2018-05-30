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

const MODE = {
  REQUEST_START: 2,
  IN_REQUEST: 4,
  MULTI_DOC_CUR_DOC_END: 8,
  REQUEST_END: 16,
  BETWEEN_REQUESTS: 32

};

function RowParser(editor) {
  const defaultEditor = editor;

  this.getRowParseMode = function (row) {
    if (row === null || typeof row === 'undefined') {
      row = editor.getCursorPosition().row;
    }

    const session = editor.getSession();
    if (row >= session.getLength() || row < 0) {
      return MODE.BETWEEN_REQUESTS;
    }
    const mode = session.getState(row);
    if (!mode) {
      return MODE.BETWEEN_REQUESTS;
    } // shouldn't really happen

    if (mode !== 'start') {
      return MODE.IN_REQUEST;
    }
    let line = (session.getLine(row) || '').trim();
    if (!line || line[0] === '#') {
      return MODE.BETWEEN_REQUESTS;
    } // empty line or a comment waiting for a new req to start

    if (line.indexOf('}', line.length - 1) >= 0) {
      // check for a multi doc request (must start a new json doc immediately after this one end.
      row++;
      if (row < session.getLength()) {
        line = (session.getLine(row) || '').trim();
        if (line.indexOf('{') === 0) { // next line is another doc in a multi doc
          return MODE.MULTI_DOC_CUR_DOC_END | MODE.IN_REQUEST;
        }

      }
      return MODE.REQUEST_END | MODE.MULTI_DOC_CUR_DOC_END; // end of request
    }

    // check for single line requests
    row++;
    if (row >= session.getLength()) {
      return MODE.REQUEST_START | MODE.REQUEST_END;
    }
    line = (session.getLine(row) || '').trim();
    if (line.indexOf('{') !== 0) { // next line is another request
      return MODE.REQUEST_START | MODE.REQUEST_END;
    }

    return MODE.REQUEST_START;
  };

  this.rowPredicate = function (row, editor, value) {
    const mode = this.getRowParseMode(row, editor);
    return (mode & value) > 0;
  };

  this.isEndRequestRow = function (row, _e) {
    const editor = _e || defaultEditor;
    return this.rowPredicate(row, editor, MODE.REQUEST_END);
  };

  this.isRequestEdge = function (row, _e) {
    const editor = _e || defaultEditor;
    return this.rowPredicate(row, editor, MODE.REQUEST_END | MODE.REQUEST_START);
  };

  this.isStartRequestRow = function (row, _e) {
    const editor = _e || defaultEditor;
    return this.rowPredicate(row, editor, MODE.REQUEST_START);
  };

  this.isInBetweenRequestsRow = function (row, _e) {
    const editor = _e || defaultEditor;
    return this.rowPredicate(row, editor, MODE.BETWEEN_REQUESTS);
  };

  this.isInRequestsRow = function (row, _e) {
    const editor = _e || defaultEditor;
    return this.rowPredicate(row, editor, MODE.IN_REQUEST);
  };

  this.isMultiDocDocEndRow = function (row, _e) {
    const editor = _e || defaultEditor;
    return this.rowPredicate(row, editor, MODE.MULTI_DOC_CUR_DOC_END);
  };

  this.isEmptyToken = function (tokenOrTokenIter) {
    const token = tokenOrTokenIter && tokenOrTokenIter.getCurrentToken ? tokenOrTokenIter.getCurrentToken() : tokenOrTokenIter;
    return !token || token.type === 'whitespace';
  };

  this.isUrlOrMethodToken = function (tokenOrTokenIter) {
    const t = tokenOrTokenIter.getCurrentToken ? tokenOrTokenIter.getCurrentToken() : tokenOrTokenIter;
    return t && t.type && (t.type === 'method' || t.type.indexOf('url') === 0);
  };


  this.nextNonEmptyToken = function (tokenIter) {
    let t = tokenIter.stepForward();
    while (t && this.isEmptyToken(t)) t = tokenIter.stepForward();
    return t;
  };

  this.prevNonEmptyToken = function (tokenIter) {
    let t = tokenIter.stepBackward();
    // empty rows return null token.
    while ((t || tokenIter.getCurrentTokenRow() > 0) && this.isEmptyToken(t)) t = tokenIter.stepBackward();
    return t;
  };
}

RowParser.prototype.MODE = MODE;

export default RowParser;
