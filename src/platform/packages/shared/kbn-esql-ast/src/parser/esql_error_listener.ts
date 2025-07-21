/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as antlr from 'antlr4';
import { getPosition } from './helpers';
import type { EditorError } from '../types';

// These will need to be manually updated whenever the relevant grammar changes.
const SYNTAX_ERRORS_TO_IGNORE = [`mismatched input '<EOF>' expecting {'row', 'from', 'show'}`];

export class ESQLErrorListener extends antlr.ErrorListener<antlr.Token | null> {
  protected errors: EditorError[] = [];

  syntaxError(
    recognizer: antlr.Recognizer<any>,
    offendingSymbol: antlr.Token | null,
    line: number,
    column: number,
    message: string,
    error: antlr.RecognitionException | undefined
  ): void {
    // Remove any DEV_ tokens from the error message
    message = message.replace(/,{0,1}(?<!\s)\s*DEV_\w+\s*/g, '');

    // Remove any trailing commas from the error message... this handles
    // cases where the dev token was at the start of a list
    // e.g. "mismatched input 'PROJECT' expecting {, 'enrich', 'dissect', 'eval', 'grok'}"
    message = message.replace(/{, /g, '{');

    if (SYNTAX_ERRORS_TO_IGNORE.includes(message)) {
      return;
    }

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
