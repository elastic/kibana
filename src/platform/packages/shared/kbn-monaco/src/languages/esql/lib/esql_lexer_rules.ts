/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EsqlCommandNames } from '@kbn/esql-language/src/commands/definitions/generated/commands/commands';
import { esqlFunctionNames } from '@kbn/esql-language/src/commands/definitions/generated/function_names';
import type { monaco } from '../../../monaco_imports';

const brackets = [
  { open: '[', close: ']', token: 'delimiter.square' },
  { open: '(', close: ')', token: 'delimiter.parenthesis' },
];

// These clause keywords are not exported as a list from @kbn/esql-language. They are kept here
// to ensure single-quoted and triple-quoted ES|QL strings in Console share the same highlighting.
const CLAUSE_KEYWORDS = ['by', 'on', 'with', 'metadata'];

export const keywords = [...Object.values(EsqlCommandNames), ...CLAUSE_KEYWORDS];

export const builtinFunctions = esqlFunctionNames;

// These ESQL lexer rules are only used for highlighting nested ESQL in Console requests
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
            '@builtinFunctions': 'keyword',
            '@default': 'identifier',
          },
        },
      ],
      [/[()]/, '@brackets'],
      [/\/\/.*$/, 'comment'],
      [/\/\*/, 'comment', '@comment'],

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
