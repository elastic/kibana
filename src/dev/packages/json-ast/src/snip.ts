/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

type Snip = [start: number, end: number] | [start: number, end: number, replacement: string];

/**
 * Replace or remove specific points of the source code
 */
export function snip(source: string, snips: Snip[]) {
  const queue = snips
    .map((s): Snip => {
      if (s[0] > s[1]) {
        throw new Error(`snips can not be reversed, received [${s}]`);
      }
      return s;
    })
    // sort snips by their starting position
    .sort((a, b) => a[0] - b[0])
    // merge snips that overlap
    .reduce((acc: Snip[], s) => {
      const prev = acc.at(-1);
      if (!prev || prev[1] < s[0]) {
        return [...acc, s];
      }

      if (prev[2] || s[2]) {
        throw new Error('snip() does not support replacement snips which overlap');
      }

      const merged: Snip = [Math.min(prev[0], s[0]), Math.max(prev[1], s[1])];
      return [...acc.slice(0, -1), merged];
    }, []);

  let offset = 0;
  let snipped = source;
  for (const [start, end, replacement = ''] of queue) {
    snipped = snipped.slice(0, start + offset) + replacement + snipped.slice(end + offset);
    const origLen = end - start;
    offset += replacement.length - origLen;
  }

  return snipped;
}
