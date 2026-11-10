/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const ASCII = {
  A_UPPER: 65,
  Z_UPPER: 90,
  A_LOWER: 97,
  Z_LOWER: 122,
} as const;

export const isWhitespace = (ch: string | undefined) =>
  ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r';

/**
 * Walks backwards from `fromIndex` until a non-whitespace character is found.
 * Returns that index, or -1 if the scan runs past the beginning.
 */
export const skipWhitespaceBackward = (text: string, fromIndex: number): number => {
  for (let index = fromIndex; index >= 0; index--) {
    if (!isWhitespace(text[index])) {
      return index;
    }
  }
  return -1;
};

export const isAsciiLetter = (ch: string | undefined): boolean => {
  if (!ch) return false;
  const code = ch.charCodeAt(0);
  return (
    (code >= ASCII.A_UPPER && code <= ASCII.Z_UPPER) ||
    (code >= ASCII.A_LOWER && code <= ASCII.Z_LOWER)
  );
};

/**
 * Returns true when `index` is positioned at the start of a line.
 * Console input is normalized to `\n` line separators.
 */
export const isStartOfLine = (text: string, index: number): boolean => {
  if (index === 0) {
    return true;
  }
  const previousChar = text[index - 1];
  return previousChar === '\n';
};

/**
 * Returns true when the character at `index` is escaped, i.e. preceded by an odd number of
 * backslashes.
 */
export const isEscaped = (text: string, index: number): boolean => {
  let precedingBackslashes = 0;
  for (let previousIndex = index - 1; text[previousIndex] === '\\'; previousIndex--) {
    precedingBackslashes++;
  }
  return precedingBackslashes % 2 === 1;
};
