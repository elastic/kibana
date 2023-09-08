/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ANTLRErrorListener, Recognizer } from 'antlr4ts';
import type { EditorError } from '../types';

export class ANTLREErrorListener implements ANTLRErrorListener<any> {
  private errors: EditorError[] = [];

  syntaxError(
    recognizer: Recognizer<any, any>,
    offendingSymbol: any,
    line: number,
    column: number,
    message: string
  ): void {
    let endColumn = column + 1;

    if (offendingSymbol?._text) {
      endColumn = column + offendingSymbol._text.length;
    }

    this.errors.push({
      startLineNumber: line,
      endLineNumber: line,
      startColumn: column,
      endColumn,
      message,
    });
  }

  getErrors(): EditorError[] {
    return this.errors;
  }
}
