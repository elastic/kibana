/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CoreEditor, Token } from '../types';
import { TokenIterator } from './token_iterator';

export const MODE = {
  REQUEST_START: 2,
  IN_REQUEST: 4,
  MULTI_DOC_CUR_DOC_END: 8,
  REQUEST_END: 16,
  BETWEEN_REQUESTS: 32,
};

// eslint-disable-next-line import/no-default-export
export default class RowParser {
  constructor(private readonly editor: CoreEditor) {}

  MODE = MODE;

  getRowParseMode(lineNumber = this.editor.getCurrentPosition().lineNumber) {
    const linesCount = this.editor.getLineCount();
    if (lineNumber > linesCount || lineNumber < 1) {
      return MODE.BETWEEN_REQUESTS;
    }
    const mode = this.editor.getLineState(lineNumber);

    if (!mode) {
      return MODE.BETWEEN_REQUESTS;
    } // shouldn't really happen
    // If another "start" mode is added here because we want to allow for new language highlighting
    // please see https://github.com/elastic/kibana/pull/51446 for a discussion on why
    // should consider a different approach.
    if (mode !== 'start' && mode !== 'start-sql') {
      return MODE.IN_REQUEST;
    }
    let line = (this.editor.getLineValue(lineNumber) || '').trim();

    // Check if the line has variables, depending on the request type, (e.g. single line, multi doc requests) return the correct mode
    if (line && /(\${\w+})/.test(line)) {
      lineNumber++;
      line = (this.editor.getLineValue(lineNumber) || '').trim();

      if (line.startsWith('{')) {
        return MODE.REQUEST_START;
      }
      // next line is another request
      // eslint-disable-next-line no-bitwise
      return MODE.REQUEST_START | MODE.REQUEST_END;
    }
    if (!line || line.startsWith('#') || line.startsWith('//') || line.startsWith('/*')) {
      return MODE.BETWEEN_REQUESTS;
    } // empty line or a comment waiting for a new req to start

    // Check for multi doc requests
    if (line.endsWith('}') && !this.isRequestLine(line)) {
      // check for a multi doc request must start a new json doc immediately after this one end.
      lineNumber++;
      if (lineNumber < linesCount + 1) {
        line = (this.editor.getLineValue(lineNumber) || '').trim();
        if (line.indexOf('{') === 0) {
          // next line is another doc in a multi doc
          // eslint-disable-next-line no-bitwise
          return MODE.MULTI_DOC_CUR_DOC_END | MODE.IN_REQUEST;
        }
      }
      // eslint-disable-next-line no-bitwise
      return MODE.REQUEST_END | MODE.MULTI_DOC_CUR_DOC_END; // end of request
    }

    // check for single line requests
    lineNumber++;
    if (lineNumber >= linesCount + 1) {
      // eslint-disable-next-line no-bitwise
      return MODE.REQUEST_START | MODE.REQUEST_END;
    }
    line = (this.editor.getLineValue(lineNumber) || '').trim();
    if (line.indexOf('{') !== 0) {
      // next line is another request
      // eslint-disable-next-line no-bitwise
      return MODE.REQUEST_START | MODE.REQUEST_END;
    }

    return MODE.REQUEST_START;
  }

  rowPredicate(lineNumber: number | undefined, editor: CoreEditor, value: number) {
    const mode = this.getRowParseMode(lineNumber);
    // eslint-disable-next-line no-bitwise
    return (mode & value) > 0;
  }

  isEndRequestRow(row?: number, _e?: CoreEditor) {
    const editor = _e || this.editor;
    return this.rowPredicate(row, editor, MODE.REQUEST_END);
  }

  isRequestEdge(row?: number, _e?: CoreEditor) {
    const editor = _e || this.editor;
    // eslint-disable-next-line no-bitwise
    return this.rowPredicate(row, editor, MODE.REQUEST_END | MODE.REQUEST_START);
  }

  isStartRequestRow(row?: number, _e?: CoreEditor) {
    const editor = _e || this.editor;
    return this.rowPredicate(row, editor, MODE.REQUEST_START);
  }

  isInBetweenRequestsRow(row?: number, _e?: CoreEditor) {
    const editor = _e || this.editor;
    return this.rowPredicate(row, editor, MODE.BETWEEN_REQUESTS);
  }

  isInRequestsRow(row?: number, _e?: CoreEditor) {
    const editor = _e || this.editor;
    return this.rowPredicate(row, editor, MODE.IN_REQUEST);
  }

  isMultiDocDocEndRow(row?: number, _e?: CoreEditor) {
    const editor = _e || this.editor;
    return this.rowPredicate(row, editor, MODE.MULTI_DOC_CUR_DOC_END);
  }

  isEmptyToken(tokenOrTokenIter: TokenIterator | Token | null) {
    const token =
      tokenOrTokenIter && (tokenOrTokenIter as TokenIterator).getCurrentToken
        ? (tokenOrTokenIter as TokenIterator).getCurrentToken()
        : tokenOrTokenIter;
    return !token || (token as Token).type === 'whitespace';
  }

  isUrlOrMethodToken(tokenOrTokenIter: TokenIterator | Token) {
    const t = (tokenOrTokenIter as TokenIterator)?.getCurrentToken() ?? (tokenOrTokenIter as Token);
    return t && t.type && (t.type === 'method' || t.type.indexOf('url') === 0);
  }

  nextNonEmptyToken(tokenIter: TokenIterator) {
    let t = tokenIter.stepForward();
    while (t && this.isEmptyToken(t)) {
      t = tokenIter.stepForward();
    }
    return t;
  }

  prevNonEmptyToken(tokenIter: TokenIterator) {
    let t = tokenIter.stepBackward();
    // empty rows return null token.
    while ((t || tokenIter.getCurrentPosition().lineNumber > 1) && this.isEmptyToken(t))
      t = tokenIter.stepBackward();
    return t;
  }

  isCommentToken(token: Token | null) {
    return (
      token &&
      token.type &&
      (token.type === 'comment.punctuation' ||
        token.type === 'comment.line' ||
        token.type === 'comment.block')
    );
  }

  isRequestLine(line: string) {
    const methods = ['GET', 'POST', 'PUT', 'DELETE', 'HEAD', 'PATCH', 'OPTIONS'];
    return methods.some((m) => line.startsWith(m));
  }
}
