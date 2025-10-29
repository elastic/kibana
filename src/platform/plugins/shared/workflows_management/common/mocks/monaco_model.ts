/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Simple mock for monaco model, partially compatible with the real model to be use in tests
 * @param value - The content to create the model from
 * @param cursorOffset - The offset of the cursor in the model
 * @returns The mock monaco model with getValue, getLineCount, getOffsetAt, getPositionAt, getLineContent, getWordUntilPosition, getWordAtPosition, pushEditOperations methods
 */
export function createMockMonacoTextModel(value: string, cursorOffset: number) {
  const lines = value.split('\n');
  let position = { lineNumber: 1, column: 1 };

  // Calculate line and column from offset
  let currentOffset = 0;
  for (let i = 0; i < lines.length; i++) {
    const lineLength = lines[i].length + 1; // +1 for newline
    if (currentOffset + lineLength > cursorOffset) {
      position = {
        lineNumber: i + 1,
        column: cursorOffset - currentOffset + 1,
      };
      break;
    }
    currentOffset += lineLength;
  }

  return {
    getValue: () => value,
    getLineCount: () => lines.length,
    getOffsetAt: (pos: typeof position) => cursorOffset,
    getPositionAt: (offset: number) => {
      // Simple implementation: convert offset to line/column
      const currentOffset2 = 0;
      for (let i = 0; i < lines.length; i++) {
        const lineLength = lines[i].length + 1; // +1 for newline
        if (currentOffset2 + lineLength > offset) {
          return {
            lineNumber: i + 1,
            column: offset - currentOffset2 + 1,
          };
        }
        currentOffset += lineLength;
      }
      return { lineNumber: lines.length, column: lines[lines.length - 1].length + 1 };
    },
    getLineContent: (lineNumber: number) => lines[lineNumber - 1] || '',
    getWordUntilPosition: (pos: typeof position) => ({
      word: '',
      startColumn: pos.column,
      endColumn: pos.column,
    }),
    getWordAtPosition: (pos: typeof position) => ({
      word: '',
      startColumn: pos.column,
      endColumn: pos.column,
    }),
    pushEditOperations: jest.fn(),
  };
}
