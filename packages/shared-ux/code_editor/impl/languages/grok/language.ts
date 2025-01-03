/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { monaco } from '@kbn/monaco';

export const languageConfiguration: monaco.languages.LanguageConfiguration = {
  brackets: [
    ['{', '}'],
    ['[', ']'],
    ['(', ')'],
  ],

  autoClosingPairs: [
    { open: '{', close: '}' },
    { open: '[', close: ']' },
    { open: '(', close: ')' },
    { open: '"', close: '"' },
    { open: "'", close: "'" },
  ],

  surroundingPairs: [
    { open: '{', close: '}' },
    { open: '[', close: ']' },
    { open: '(', close: ')' },
    { open: '"', close: '"' },
    { open: "'", close: "'" },
  ],
};

export const lexerRules: monaco.languages.IMonarchLanguage = {
  // special grok symbols []()?:|
  grokRegexSymbols: /[\[\]()?:|]/,

  tokenizer: {
    root: [
      // %{SYNTAX}
      [/(%\{)([^:}]+)(})/, ['string.openGrok', 'variable.syntax', 'string.closeGrok']],

      // %{SYNTAX:ID}
      [
        /(%\{)([^:}]+)(:)([^:}]+)(})/,
        [
          'string.openGrok',
          'variable.syntax',
          'string.separator',
          'variable.id',
          'string.closeGrok',
        ],
      ],

      // %{SYNTAX:ID:TYPE}
      [
        /(%\{)([^:}]+)(:)([^:}]+)(:)([^:}]+)(})/,
        [
          'string.openGrok',
          'variable.syntax',
          'string.separator',
          'variable.id',
          'string.separator',
          'variable.type',
          'string.closeGrok',
        ],
      ],

      [/(\\)(@grokRegexSymbols)/, ['string.escape.grokEscape', 'source.grokEscaped']], // highlight escape symbol and don't highlight escaped symbol
      [/@grokRegexSymbols/, 'regexp.grokRegex'], // highlight special grok symbols
    ],
  },
};
