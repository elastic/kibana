/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { Recognizer, RecognitionException } from 'antlr4';
import { ErrorListener } from 'antlr4';
import type { MonacoEditorError } from '../types';

export class ANTLRErrorListener extends ErrorListener<any> {
  protected errors: MonacoEditorError[] = [];

  syntaxError(
    recognizer: Recognizer<any>,
    offendingSymbol: any,
    line: number,
    column: number,
    message: string,
    error: RecognitionException | undefined
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
      severity: 8,
    });
  }

  getErrors(): MonacoEditorError[] {
    return this.errors;
  }
}
