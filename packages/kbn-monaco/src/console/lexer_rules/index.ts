/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { monaco } from '../../monaco_imports';

export const languageConfiguration: monaco.languages.LanguageConfiguration = {};

export const lexerRules: monaco.languages.IMonarchLanguage = {
  defaultToken: 'invalid',
  regex_method: /get|post|put|patch|delete/,
  regex_url: /.*$/,
  // C# style strings
  escapes: /\\(?:[abfnrtv\\"']|x[0-9A-Fa-f]{1,4}|u[0-9A-Fa-f]{4}|U[0-9A-Fa-f]{8})/,
  ignoreCase: true,
  tokenizer: {
    root: [
      // whitespace
      { include: '@rule_whitespace' },
      // start a multi-line comment
      { include: '@rule_start_multi_comment' },
      // a one-line comment
      [/\/\/.*$/, 'comment'],
      // method
      [/@regex_method/, 'keyword'],
      // url
      [/@regex_url/, 'identifier'],
    ],
    rule_whitespace: [[/[ \t\r\n]+/, 'WHITESPACE']],
    rule_start_multi_comment: [[/\/\*/, 'comment', '@rule_multi_comment']],
    rule_multi_comment: [
      // match everything on a single line inside the comment except for chars / and *
      [/[^\/*]+/, 'comment'],
      // start a nested comment by going 1 level down
      [/\/\*/, 'comment', '@push'],
      // match the closing of the comment and return 1 level up
      ['\\*/', 'comment', '@pop'],
      // match individual chars inside a multi-line comment
      [/[\/*]/, 'comment'],
    ],
    string: [
      [/[^\\"]+/, 'string'],
      [/@escapes/, 'string.escape'],
      [/\\./, 'string.escape.invalid'],
      [/"/, { token: 'string.quote', bracket: '@close', next: '@pop' }],
    ],
  },
};
