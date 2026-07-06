/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { monaco } from '../../../monaco_imports';

// A regex character class that represents all valid identifier characters, including unicode.
// This allows for normal identifiers plus non-ASCII (e.g., accents, Cyrillic, CJK).
const ALPHANUM_UNICODE = '[a-zA-Z0-9_$\\u0080-\\uFFFF]';

// A regex character class for letters and unicode, but no numbers.
const ALPHA_UNICODE = '[a-zA-Z_\\u0080-\\uFFFF]';

export const languageTolerantRules: monaco.languages.IMonarchLanguageRule[] = [
  // Catch words with apostrophes (e.g., d'été, isn't) so they don't trigger string states
  [new RegExp(`${ALPHANUM_UNICODE}+'${ALPHANUM_UNICODE}+`), 'identifier'],

  // Catch words with non-ASCII characters (e.g. accents, Cyrillic, CJK)
  // so they are treated as identifiers instead of invalid tokens.
  [new RegExp(`${ALPHANUM_UNICODE}*[\\u0080-\\uFFFF]${ALPHANUM_UNICODE}*`), 'identifier'],

  // Catch words that start with a number but contain letters/unicode (e.g. 1aB8, 6e).
  // Without this, the lexer splits them into a number (e.g. 1) and an identifier (aB8),
  // which results in incorrect coloring in the console.
  [new RegExp(`\\d+${ALPHA_UNICODE}${ALPHANUM_UNICODE}*`), 'identifier'],
];
