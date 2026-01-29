/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

function isWordBoundary(line: string, index: number, isBefore: boolean): boolean {
  if (isBefore) {
    // Check character before the match
    if (index === 0) return true; // Beginning of line
    const charBefore = line[index - 1];
    return charBefore === ' ' || charBefore === '\n';
  } else {
    // Check character after the match
    if (index >= line.length) return true; // End of line
    const charAfter = line[index];
    return charAfter === ' ' || charAfter === '\n';
  }
}

export function findCommandPositions(query: string, command: string) {
  const lines = query.split('\n');
  const positions: Array<{ lineNumber: number; startColumn: number }> = [];
  const searchString = command.toLowerCase();
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lowerCaseLine = line.toLowerCase();
    let searchIndex = 0;

    // Find all occurrences of the command in this line
    while (searchIndex < lowerCaseLine.length) {
      const fromIndex = lowerCaseLine.indexOf(searchString, searchIndex);
      if (fromIndex === -1) break;

      // Check if this is a whole word match (not part of another word)
      const charBeforeIndex = fromIndex;
      const charAfterIndex = fromIndex + searchString.length;
      const isBeforeBoundary = isWordBoundary(line, charBeforeIndex, true);
      const isAfterBoundary = isWordBoundary(line, charAfterIndex, false);

      if (isBeforeBoundary && isAfterBoundary) {
        positions.push({ lineNumber: i + 1, startColumn: fromIndex + 1 }); // +1 to convert to 1-based column index in monaco
      }

      searchIndex = fromIndex + 1;
    }
  }

  return positions;
}
