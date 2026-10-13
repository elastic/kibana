/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import stripAnsi from 'strip-ansi';

// selects any code point that is NOT allowed by https://www.w3.org/TR/xml/#NT-Char. A single
// character class keeps matching linear: a repeated alternation backtracks per character and
// overflows the V8 stack on multi-MB inputs containing astral (surrogate pair) characters.
const invalidXmlCharsRE = /[^\x09\x0A\x0D\x20-\uD7FF\uE000-\uFFFD\u{10000}-\u{10FFFF}]/gu;

export function escapeCdata(input: string) {
  return stripAnsi(input).replace(invalidXmlCharsRE, '');
}
