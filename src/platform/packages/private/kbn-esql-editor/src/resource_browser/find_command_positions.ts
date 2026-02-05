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
    if (index === 0) return true;
    const charBefore = line[index - 1];
    return isEmptyChar(charBefore);
  }

  if (index >= line.length) return true;
  const charAfter = line[index];
  return isEmptyChar(charAfter);
}

function isEmptyChar(char: string): boolean {
  return char === ' ' || char === '\n' || char === '\t';
}

export interface CommandPosition {
  lineNumber: number;
  startColumn: number;
}

export function findFirstCommandPosition(
  query: string,
  command: string
): CommandPosition | undefined {
  if (!query || !command) return;

  // We only need the first FROM/TS (no nested-query awareness).
  const lines = query.split('\n');
  const searchString = command.toLowerCase();

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lowerCaseLine = line.toLowerCase();
    let searchIndex = 0;

    while (searchIndex < lowerCaseLine.length) {
      const cmdIndex = lowerCaseLine.indexOf(searchString, searchIndex);
      if (cmdIndex === -1) break;

      const beforeBoundary = isWordBoundary(line, cmdIndex, true);
      const afterBoundary = isWordBoundary(line, cmdIndex + searchString.length, false);

      if (beforeBoundary && afterBoundary) {
        return { lineNumber: i + 1, startColumn: cmdIndex + 1 };
      }

      searchIndex = cmdIndex + 1;
    }
  }
}
