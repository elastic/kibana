/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ANTLRErrorListener, RecognitionException, Recognizer } from 'antlr4ts';

export interface PainlessError {
  startLineNumber: number;
  startColumn: number;
  endLineNumber: number;
  endColumn: number;
  message: string;
}

export class PainlessErrorListener implements ANTLRErrorListener<any> {
  private errors: PainlessError[] = [];

  syntaxError(
    recognizer: Recognizer<any, any>,
    offendingSymbol: any,
    line: number,
    column: number,
    message: string,
    e: RecognitionException | undefined
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

  getErrors(): PainlessError[] {
    return this.errors;
  }
}
