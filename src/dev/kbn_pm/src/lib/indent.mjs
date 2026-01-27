/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const NON_WS_RE = /\S/;

/**
 * @param {string} line
 */
const nonWsStart = (line) => line.match(NON_WS_RE)?.index ?? line.length;

/**
 * Dedent the string, trimming all empty lines from the beggining of
 * `txt` and finding the first line with non-whitespace characters, then
 * subtracting the indent from that line from all subsequent lines
 * @param {TemplateStringsArray | string} txts
 * @param {...any} vars
 */
export function dedent(txts, ...vars) {
  /** @type {string[]} */
  const lines = (
    Array.isArray(txts) ? txts.reduce((acc, txt, i) => `${acc}${vars[i - 1]}${txt}`) : txts
  ).split('\n');

  while (lines.length && lines[0].trim() === '') {
    lines.shift();
  }

  /** @type {number | undefined} */
  let depth;
  return lines
    .map((l) => {
      if (depth === undefined) {
        depth = nonWsStart(l);
      }

      return l.slice(Math.min(nonWsStart(l), depth));
    })
    .join('\n');
}

/**
 * @param {number} width
 * @param {string} txt
 * @returns {string}
 */
export const indent = (width, txt) =>
  txt
    .split('\n')
    .map((l) => `${' '.repeat(width)}${l}`)
    .join('\n');
