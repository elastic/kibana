/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getLocation } from 'jsonc-parser';

/**
 * Returns the JQ-style dot-notation path (e.g. `.hits.hits[0]._source.name`)
 * for the JSON element at the given character offset within `text`.
 *
 * Multi-response output has `# N: METHOD PATH [STATUS]` header lines between
 * JSON blocks. This function isolates the relevant block before calling
 * `getLocation` so the headers don't confuse the parser.
 *
 * Returns `'.'` when the cursor is at the root level.
 */
export function getJsonPathAtPosition(text: string, offset: number): string {
  const { json, relativeOffset } = findJsonBlockAtOffset(text, offset);
  const { path } = getLocation(json, relativeOffset);
  if (!path.length) return '.';
  return path.reduce<string>((acc, segment) => {
    return typeof segment === 'number' ? `${acc}[${segment}]` : `${acc}.${segment}`;
  }, '');
}

/**
 * Splits a multi-response output by `# N:` header lines and returns the JSON
 * block that contains `offset`, together with the offset relative to that block.
 */
function findJsonBlockAtOffset(
  text: string,
  offset: number
): { json: string; relativeOffset: number } {
  const headerPositions: number[] = [];
  if (text.startsWith('#')) {
    headerPositions.push(0);
  }
  let idx = text.indexOf('\n#');
  while (idx !== -1) {
    headerPositions.push(idx + 1);
    idx = text.indexOf('\n#', idx + 1);
  }

  if (headerPositions.length === 0) {
    return { json: text, relativeOffset: offset };
  }

  let blockStart = 0;
  let blockEnd = text.length;

  for (const headerPos of headerPositions) {
    const headerLineEnd = text.indexOf('\n', headerPos);
    const contentStart = headerLineEnd === -1 ? text.length : headerLineEnd + 1;

    if (contentStart <= offset) {
      blockStart = contentStart;
    } else if (blockEnd === text.length) {
      blockEnd = headerPos;
    }
  }

  return {
    json: text.slice(blockStart, blockEnd),
    relativeOffset: Math.max(0, offset - blockStart),
  };
}
