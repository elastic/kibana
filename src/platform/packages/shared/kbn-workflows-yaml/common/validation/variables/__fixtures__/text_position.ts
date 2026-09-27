/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Offset to 1-based line/column, computed independently of the `LineCounter` the
 * validators use, so position assertions stay an actual check.
 */
export function positionAt(text: string, offset: number): { lineNumber: number; column: number } {
  const lines = text.split('\n');
  let consumed = 0;
  for (let i = 0; i < lines.length; i++) {
    const lineLength = lines[i].length + 1; // +1 for the newline
    if (consumed + lineLength > offset) {
      return { lineNumber: i + 1, column: offset - consumed + 1 };
    }
    consumed += lineLength;
  }
  return { lineNumber: lines.length, column: lines[lines.length - 1].length + 1 };
}
