/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { monaco } from '@kbn/monaco';

export const languageConfiguration: monaco.languages.LanguageConfiguration = {
  brackets: [
    ['{', '}'],
    ['[', ']'],
  ],
  autoClosingPairs: [
    { open: '{', close: '}' },
    { open: '[', close: ']' },
    { open: '"', close: '"', notIn: ['string'] },
  ],
  comments: {
    lineComment: '//',
    blockComment: ['/*', '*/'],
  },
};

export const lexerRules: monaco.languages.IMonarchLanguage = {
  defaultToken: '',
  tokenPostfix: '',
  escapes: /\\(?:[abfnrtv\\"']|x[0-9A-Fa-f]{1,4}|u[0-9A-Fa-f]{4}|U[0-9A-Fa-f]{8})/,
  digits: /-?(?:0|[1-9]\d*)(?:(?:\.\d+)?(?:[eE][+-]?\d+)?)?/,
  symbols: /[,:]+/,
  tokenizer: {
    root: [
      [/(@digits)n?/, 'number'],
      [/(@symbols)n?/, 'delimiter'],

      { include: '@keyword' },
      { include: '@url' },
      { include: '@whitespace' },
      { include: '@brackets' },
      { include: '@keyName' },
      { include: '@string' },
    ],

    keyword: [[/(?:true|false|null)\b/, 'keyword']],

    url: [
      [
        /(https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|www\.[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9]+\.[^\s]{2,}|www\.[a-zA-Z0-9]+\.[^\s]{2,})/,
        'string',
      ],
    ],

    keyName: [[/(?:[^,\{\[\}\]\s]+|"(?:[^"\\]|\\.)*")\s*(?=:)/, 'variable']],

    brackets: [[/{/, '@push'], [/}/, '@pop'], [/[[(]/], [/[\])]/]],

    whitespace: [
      [/[ \t\r\n]+/, ''],
      [/\/\*/, 'comment', '@comment'],
      [/\/\/.*$/, 'comment'],
    ],

    comment: [
      [/[^\/*]+/, 'comment'],
      [/\*\//, 'comment', '@pop'],
      [/[\/*]/, 'comment'],
    ],

    string: [
      [/(?:[^,\{\[\}\]\s]+|"(?:[^"\\]|\\.)*")\s*/, 'string'],
      [/"""/, 'string', '@stringLiteral'],
      [/"/, 'string', '@stringDouble'],
    ],

    stringDouble: [
      [/[^\\"]+/, 'string'],
      [/@escapes/, 'string.escape'],
      [/\\./, 'string.escape.invalid'],
      [/"/, 'string', '@pop'],
    ],

    stringLiteral: [
      [/"""/, 'string', '@pop'],
      [/\\""""/, 'string', '@pop'],
      [/./, 'string'],
    ],
  },
} as monaco.languages.IMonarchLanguage;
