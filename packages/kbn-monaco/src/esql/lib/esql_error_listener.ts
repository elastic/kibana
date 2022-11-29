/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ANTLRErrorListener, Recognizer } from 'antlr4ts';

export interface SyntaxError {
  startLineNumber: number;
  startColumn: number;
  endLineNumber: number;
  endColumn: number;
  message: string;
}

export class ESQLErrorListener implements ANTLRErrorListener<any> {
  private errors: SyntaxError[] = [];

  syntaxError(
    recognizer: Recognizer<any, any>,
    offendingSymbol: any | undefined,
    line: number,
    column: number,
    message: string
  ): void {
    let endColumn = column + 1;

    if (offendingSymbol?.text) {
      endColumn = column + offendingSymbol.text.length;
    }

    this.errors.push({
      startLineNumber: line,
      endLineNumber: line,
      startColumn: column,
      endColumn,
      message,
    });
  }

  getErrors(): SyntaxError[] {
    return this.errors;
  }
}
