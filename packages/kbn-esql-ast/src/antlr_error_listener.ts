/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { Recognizer, RecognitionException } from 'antlr4';
import { ErrorListener } from 'antlr4';
import type { EditorError } from './types';
import { getPosition } from './ast_position_utils';

export class ESQLErrorListener extends ErrorListener<any> {
  protected errors: EditorError[] = [];

  syntaxError(
    recognizer: Recognizer<any>,
    offendingSymbol: any,
    line: number,
    column: number,
    message: string,
    error: RecognitionException | undefined
  ): void {
    const textMessage = `SyntaxError: ${message}`;

    const tokenPosition = getPosition(offendingSymbol);
    const startColumn = offendingSymbol && tokenPosition ? tokenPosition.min + 1 : column + 1;
    const endColumn = offendingSymbol && tokenPosition ? tokenPosition.max + 1 : column + 2;

    this.errors.push({
      startLineNumber: line,
      endLineNumber: line,
      startColumn,
      endColumn,
      message: textMessage,
      severity: 'error',
    });
  }

  getErrors(): EditorError[] {
    return this.errors;
  }
}
