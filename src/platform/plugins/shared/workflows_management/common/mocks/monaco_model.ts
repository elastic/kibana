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
 * @returns The mock monaco model with getValue, getLineCount, getOffsetAt, getPositionAt, getLineContent, getLineMaxColumn, getWordUntilPosition, getWordAtPosition, pushEditOperations methods
 */
export function createFakeMonacoModel(value: string, cursorOffset: number = 0) {
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
    getOffsetAt: (pos: typeof position) => {
      let offset = 0;
      for (let i = 0; i < pos.lineNumber - 1; i++) {
        offset += lines[i].length + 1; // +1 for newline
      }
      offset += pos.column - 1; // Convert to 0-based
      return offset;
    },
    getPositionAt: (offset: number) => {
      // Simple implementation: convert offset to line/column
      let currentOffset2 = 0;
      for (let i = 0; i < lines.length; i++) {
        const lineLength = lines[i].length + 1; // +1 for newline
        if (currentOffset2 + lineLength > offset) {
          return {
            lineNumber: i + 1,
            column: offset - currentOffset2 + 1,
          };
        }
        currentOffset2 += lineLength;
      }
      return { lineNumber: lines.length, column: lines[lines.length - 1].length + 1 };
    },
    getLineContent: (lineNumber: number) => lines[lineNumber - 1] || '',
    getLineMaxColumn: (lineNumber: number) => {
      const line = lines[lineNumber - 1] || '';
      return line.length + 1;
    },
    getWordUntilPosition: (pos: typeof position) => {
      const line = lines[pos.lineNumber - 1];
      if (!line) {
        return {
          word: '',
          startColumn: pos.column,
          endColumn: pos.column,
        };
      }

      // Word boundary pattern - matches Monaco's default word pattern
      const wordPattern =
        /(-?\d*\.?\d+)|([^\`\~\!\@\#\%\^\&\*\(\)\-\=\+\[\{\]\}\\\|\;\:\'\"\,\.\<\>\/\?\s]+)/g;

      let match;
      let word = '';
      let startColumn = pos.column;

      // Find all word matches in the line
      while ((match = wordPattern.exec(line))) {
        const matchStart = match.index + 1; // Convert to 1-based
        const matchEnd = matchStart + match[0].length;

        // Check if cursor position is within or after this word
        if (matchStart <= pos.column && pos.column <= matchEnd) {
          // Cursor is inside the word, return the part up to cursor
          word = match[0].substring(0, pos.column - matchStart);
          startColumn = matchStart;
          break;
        }
      }

      return {
        word,
        startColumn,
        endColumn: pos.column,
      };
    },
    getWordAtPosition: (pos: typeof position) => {
      const line = lines[pos.lineNumber - 1];
      if (!line) {
        return null;
      }

      // Word boundary pattern - matches Monaco's default word pattern
      const wordPattern =
        /(-?\d*\.?\d+)|([^\`\~\!\@\#\%\^\&\*\(\)\-\=\+\[\{\]\}\\\|\;\:\'\"\,\.\<\>\/\?\s]+)/g;

      let match;

      // Find all word matches in the line
      while ((match = wordPattern.exec(line))) {
        const matchStart = match.index + 1; // Convert to 1-based
        const matchEnd = matchStart + match[0].length;

        // Check if cursor position is within this word
        if (matchStart <= pos.column && pos.column <= matchEnd) {
          return {
            word: match[0],
            startColumn: matchStart,
            endColumn: matchEnd,
          };
        }
      }

      // No word found at position
      return null;
    },
    pushEditOperations: jest.fn(),
  };
}
