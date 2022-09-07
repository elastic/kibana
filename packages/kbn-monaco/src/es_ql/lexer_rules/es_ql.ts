/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { monaco } from '../../monaco_imports';

const brackets = [
  { open: '[', close: ']', token: 'delimiter.square' },
  { open: '(', close: ')', token: 'delimiter.parenthesis' },
];

const keywords = ['from', 'limit', 'project'];
const builtinFunctions: string[] = [
  // TODO fill once endpoint supports them
];

export const lexerRules = {
  defaultToken: 'invalid',
  ignoreCase: true,
  tokenPostfix: '',
  keywords,
  builtinFunctions,
  brackets,
  tokenizer: {
    root: [
      [
        /[a-zA-Z_$][a-zA-Z0-9_$]*\b/,
        {
          cases: {
            '@keywords': 'keyword',
            '@builtinFunctions': 'identifier',
            '@default': 'identifier',
          },
        },
      ],
      [/[()]/, '@brackets'],
      [/--.*$/, 'comment'],
      [/\/\*/, 'comment', '@comment'],
      [/\/.*$/, 'comment'],

      [/".*?"/, 'string'],

      [/'.*?'/, 'constant'],
      [/`.*?`/, 'string'],
      // whitespace
      [/[ \t\r\n]+/, { token: '@whitespace' }],
      [/[+-]?\\d+(?:(?:\\.\\d*)?(?:[eE][+-]?\\d+)?)?\\b/, 'entity.name.function'],
      [/⇐|<⇒|\*|\.|\:\:|\+|\-|\/|\/\/|%|&|\^|~|<|>|<=|=>|==|!=|<>|=/, 'keyword.operator'],
      [/[\(]/, 'paren.lparen'],
      [/[\)]/, 'paren.rparen'],
      [/\s+/, 'text'],
    ],
    numbers: [
      [/0[xX][0-9a-fA-F]*/, 'number'],
      [/[$][+-]*\d*(\.\d*)?/, 'number'],
      [/((\d+(\.\d*)?)|(\.\d+))([eE][\-+]?\d+)?/, 'number'],
    ],
    strings: [
      [/N'/, { token: 'string', next: '@string' }],
      [/'/, { token: 'string', next: '@string' }],
    ],
    string: [
      [/[^']+/, 'string'],
      [/''/, 'string'],
      [/'/, { token: 'string', next: '@pop' }],
    ],
    comment: [
      [/[^\/*]+/, 'comment'],
      [/\*\//, 'comment', '@pop'],
      [/[\/*]/, 'comment'],
    ],
  },
} as monaco.languages.IMonarchLanguage;
