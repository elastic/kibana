/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { ANTLRErrorListener, Recognizer, RecognitionException } from 'antlr4ts';
import type { EditorError } from '../../../types';
import { createError } from '../ast/ast_errors';

export class ESQLErrorListener implements ANTLRErrorListener<any> {
  private errors: EditorError[] = [];

  syntaxError(
    recognizer: Recognizer<any, any>,
    offendingSymbol: any,
    line: number,
    column: number,
    message: string,
    error: RecognitionException | undefined
  ): void {
    const higherLevelError = error ? createError(error) : undefined;
    const textMessage =
      higherLevelError?.text && higherLevelError.text !== error?.message
        ? higherLevelError.text
        : `SyntaxError: ${message}`;

    let endColumn = column + 1;
    let startColumn = column;

    if (higherLevelError) {
      startColumn = higherLevelError.location.min + 1;
      endColumn = higherLevelError.location.max + 1;
    } else if (offendingSymbol?._text) {
      endColumn = column + offendingSymbol._text.length;
    }

    this.errors.push({
      startLineNumber: line,
      endLineNumber: line,
      startColumn,
      endColumn,
      message: textMessage,
      severity: 8, // monaco.MarkerSeverity.Error,
    });
  }

  getErrors(): EditorError[] {
    return this.errors;
  }
}
