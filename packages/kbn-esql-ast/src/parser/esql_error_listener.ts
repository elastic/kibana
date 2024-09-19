/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Recognizer, RecognitionException } from 'antlr4';
import { ErrorListener } from 'antlr4';
import { getPosition } from './helpers';
import type { EditorError } from '../types';

const REPLACE_DEV = /,{0,1}(?<!\s)\s*DEV_\w+\s*/g;
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
    // Remove any DEV_ tokens from the error message
    message = message.replace(REPLACE_DEV, '');

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
