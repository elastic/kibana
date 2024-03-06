/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { Recognizer, RecognitionException } from 'antlr4';
import { ANTLRErrorListener } from '../../../common/error_listener';
import { getPosition } from '../ast/ast_position_utils';

export class ESQLErrorListener extends ANTLRErrorListener {
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
    const startColumn = tokenPosition?.min + 1 || column;
    const endColumn = tokenPosition?.max + 1 || column + 1;

    this.errors.push({
      startLineNumber: line,
      endLineNumber: line,
      startColumn,
      endColumn,
      message: textMessage,
      severity: 8, // monaco.MarkerSeverity.Error,
    });
  }
}
