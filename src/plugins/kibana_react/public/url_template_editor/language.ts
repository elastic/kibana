/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

/**
 * This file is adapted from: https://github.com/microsoft/monaco-languages/blob/master/src/handlebars/handlebars.ts
 * License: https://github.com/microsoft/monaco-languages/blob/master/LICENSE.md
 */

import { monaco } from '@kbn/monaco';

export const conf: monaco.languages.LanguageConfiguration = {
  wordPattern: /(-?\d*\.\d\w*)|([^\`\~\!\@\$\^\&\*\(\)\=\+\[\{\]\}\\\|\;\:\'\"\,\.\<\>\/\s]+)/g,

  comments: {
    blockComment: ['{{!--', '--}}'],
  },

  brackets: [
    ['<', '>'],
    ['{{', '}}'],
    ['{', '}'],
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
    { open: '<', close: '>' },
    { open: '"', close: '"' },
    { open: "'", close: "'" },
  ],
};

export const language: monaco.languages.IMonarchLanguage = {
  // Set defaultToken to invalid to see what you do not tokenize yet.
  defaultToken: 'invalid',
  tokenPostfix: '',
  brackets: [
    {
      token: 'delimiter.double',
      open: '{{',
      close: '}}',
    },
    {
      token: 'delimiter.triple',
      open: '{{{',
      close: '}}}',
    },
  ],

  tokenizer: {
    root: [
      { include: '@maybeHandlebars' },
      { include: '@whitespace' },
      { include: '@urlScheme' },
      { include: '@urlAuthority' },
      { include: '@urlParamKey' },
      { include: '@urlParamValue' },
      { include: '@text' },
    ],

    maybeHandlebars: [
      [
        /\{\{/,
        {
          token: '@rematch',
          switchTo: '@handlebars.root',
        },
      ],
    ],

    whitespace: [[/[ \t\r\n]+/, '']],

    text: [
      [
        /[^<{\?\&]+/,
        {
          token: 'text',
          next: '@popall',
        },
      ],
    ],

    rematchAsRoot: [
      [
        /.+/,
        {
          token: '@rematch',
          switchTo: '@root',
        },
      ],
    ],

    urlScheme: [
      [
        /([a-zA-Z0-9\+\.\-]{1,10})(:)/,
        [
          {
            token: 'keyword.scheme.url',
          },
          {
            token: 'delimiter.scheme.url',
          },
        ],
      ],
    ],

    urlAuthority: [
      [
        /(\/\/)([a-zA-Z0-9\.\-_]+)/,
        [
          {
            token: 'delimiter.authority.url',
          },
          {
            token: 'keyword.authority.url',
            // next: '@urlPath',
          },
        ],
      ],
    ],

    urlParamKey: [
      [
        /([\?\&])([a-zA-Z0-9_\-]+)/,
        [
          {
            token: 'delimiter.key.query.url',
          },
          {
            token: 'label.key.query.url',
          },
        ],
      ],
    ],

    urlParamValue: [
      [
        /(\=)([^\?\&\{}]+)/,
        [
          {
            token: 'delimiter.value.query.url',
          },
          {
            token: 'variable.value.query.url',
          },
        ],
      ],
    ],

    handlebars: [
      [
        /\{\{\{?/,
        {
          token: '@brackets',
          bracket: '@open',
        },
      ],
      [
        /\}\}\}?/,
        {
          token: '@brackets',
          bracket: '@close',
          switchTo: '@$S2.$S3',
        },
      ],
      { include: 'handlebarsExpression' },
    ],

    handlebarsExpression: [
      [/"[^"]*"/, 'string.handlebars'],
      [/[#/][^\s}]+/, 'keyword.helper.handlebars'],
      [/else\b/, 'keyword.helper.handlebars'],
      [/[\s]+/],
      [/[^}]/, 'variable.parameter.handlebars'],
    ],
  },
} as monaco.languages.IMonarchLanguage;
