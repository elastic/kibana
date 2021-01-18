/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
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
      { include: '@urlScheme' },
      { include: '@maybeHandlebars' },
      { include: '@whitespace' },
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
        /[^<{]+/,
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
            next: '@tryUrlAuthority',
          },
        ],
      ],
    ],

    tryUrlAuthority: [{ include: '@urlAuthority' }, { include: '@text' }],

    urlAuthority: [
      [
        /(\/\/)([a-zA-Z0-9\.\-_]+)/,
        [
          {
            token: 'delimiter.authority.url',
          },
          {
            token: 'keyword.authority.url',
            next: '@urlPath',
          },
        ],
      ],
    ],

    urlPath: [
      [
        /((\/)([^\/\?]+))+/,
        {
          token: '@rematch',
          switchTo: '@urlPathSegmentSlash',
        },
      ],
      { include: '@urlQuery' },
    ],

    urlPathSegmentSlash: [
      [
        /\/+/,
        {
          token: 'delimiter.path.url',
          next: '@urlPathSegment',
        },
      ],
    ],

    urlPathSegment: [
      [
        /[^\/\?]+/,
        {
          token: 'keyword.segment.path.url',
          next: '@urlPath',
        },
      ],
    ],

    urlQuery: [
      [
        /[\?\#]/,
        {
          token: 'delimiter.query.url',
        },
      ],
      [
        /[^#]+/,
        {
          token: 'keyword.query.url',
        },
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

    // root: [
    //   [/<style\s*>/,   { token: 'keyword', bracket: '@open'
    //                   , next: '@css_block', nextEmbedded: 'text/css' }],
    //   [/<\/style\s*>/, { token: 'keyword', bracket: '@close' }],
    // ],

    // css_block: [
    //   [/[^"<]+/, ''],
    //   [/<\/style\s*>/, { token: '@rematch', next: '@pop', nextEmbedded: '@pop' }],
    //   [/"/, 'string', '@string' ],
    //   [/</, '']
    // ],
  },
} as monaco.languages.IMonarchLanguage;
