/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { monaco } from '../../../monaco_imports';

// From Monaco position to linear offset
export function monacoPositionToOffset(expression: string, position: monaco.Position): number {
  const lines = expression.split(/\n/);
  let offset = 0;

  for (let i = 0; i < position.lineNumber - 1; i++) {
    offset += lines[i].length + 1; // +1 for the newline character
  }

  offset += position.column - 1;

  return offset;
}

/**
 * Given an offset range, returns a monaco IRange object.
 * @param expression
 * @param range
 * @returns
 */
export const offsetRangeToMonacoRange = (
  expression: string,
  range: { start: number; end: number }
): {
  startColumn: number;
  endColumn: number;
  startLineNumber: number;
  endLineNumber: number;
} => {
  let startColumn = 0;
  let endColumn = 0;
  // How far we are past the last newline character
  let currentOffset = 0;

  let startLineNumber = 1;
  let endLineNumber = 1;
  let currentLine = 1;

  for (let i = 0; i < expression.length; i++) {
    if (expression[i] === '\n') {
      currentLine++;
      currentOffset = i + 1;
    }

    if (i === range.start) {
      startLineNumber = currentLine;
      startColumn = i - currentOffset;
    }

    if (i === range.end) {
      endLineNumber = currentLine;
      endColumn = i - currentOffset;
      break; // No need to continue once we find the end position
    }
  }

  // Handle the case where the start offset is past the end of the string
  if (range.start >= expression.length) {
    startLineNumber = currentLine;
    startColumn = range.start - currentOffset;
  }

  // Handle the case where the end offset is at the end or past the end of the string
  if (range.end >= expression.length) {
    endLineNumber = currentLine;
    endColumn = range.end - currentOffset;
  }

  return {
    startColumn,
    endColumn,
    startLineNumber,
    endLineNumber,
  };
};
