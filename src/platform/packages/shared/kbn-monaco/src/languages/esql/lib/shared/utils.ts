/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { monaco } from '../../../../monaco_imports';

// From Monaco position to linear offset
export function monacoPositionToOffset(expression: string, position: monaco.Position): number {
  const lines = expression.split(/\n/);
  let offset = 0;

  for (let i = 0; i < position.lineNumber - 1; i++) {
    offset += lines[i].length + 1; // +1 for the newline character
  }

  // one-based to zero-based indexing
  offset += position.column - 1;

  return offset;
}

/**
 * Given an offset range, returns a monaco IRange object.
 *
 * IMPORTANT NOTE:
 * offset ranges are ZERO-based and NOT end-inclusive — [start, end)
 * monaco ranges are ONE-based and ARE end-inclusive — [start, end]
 */
export const offsetRangeToMonacoRange = (
  expression: string,
  range: { start: number; end: number }
):
  | {
      startColumn: number;
      endColumn: number;
      startLineNumber: number;
      endLineNumber: number;
    }
  | undefined => {
  if (range.start === range.end) {
    return;
  }

  let startColumn = NaN;
  let endColumn = 0;
  let startOfCurrentLine = 0;
  let currentLine = 1;

  // find the line and start column
  for (let i = 0; i < expression.length; i++) {
    if (expression[i] === '\n') {
      currentLine++;
      startOfCurrentLine = i + 1;
    }

    if (i === range.start) {
      startColumn = i + 1 - startOfCurrentLine;
      endColumn = startColumn + range.end - range.start - 1;
      break;
    }
  }

  if (isNaN(startColumn)) {
    return;
  }

  return {
    startLineNumber: currentLine,
    endLineNumber: currentLine,
    startColumn,
    endColumn,
  };
};
