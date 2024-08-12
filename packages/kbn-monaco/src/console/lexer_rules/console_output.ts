/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  consoleSharedLanguageConfiguration,
  consoleSharedLexerRules,
  matchTokensWithEOL,
} from './shared';
import { monaco } from '../../monaco_imports';

export const consoleOutputLanguageConfiguration: monaco.languages.LanguageConfiguration = {
  ...consoleSharedLanguageConfiguration,
};

export const consoleOutputLexerRules: monaco.languages.IMonarchLanguage = {
  ...consoleSharedLexerRules,
  tokenizer: {
    ...consoleSharedLexerRules.tokenizer,
    comments: [
      // Line comment indicated by #
      // Everything after the # character is matched, stopping right before the status code and status text at the end if they are present
      matchTokensWithEOL('comment', /# .+?(?=\s+\d{3}(?: \w+)*$)/, 'root', 'status'),
      ...consoleSharedLexerRules.tokenizer.comments,
    ],
    status: [
      // Following HTTP response status codes conventions
      // Informational responses (status codes 100 – 199)
      matchTokensWithEOL('status.info', /\b1\d{2}(?: \w+)*$/, 'root'),
      // Successful responses (status codes 200 – 299)
      matchTokensWithEOL('status.success', /\b2\d{2}(?: \w+)*$/, 'root'),
      // Redirection messages (status codes 300 – 399)
      matchTokensWithEOL('status.redirect', /\b3\d{2}(?: \w+)*$/, 'root'),
      // Client error responses (status codes 400 – 499)
      matchTokensWithEOL('status.warning', /\b4\d{2}(?: \w+)*$/, 'root'),
      // Server error responses (status codes 500 – 599)
      matchTokensWithEOL('status.error', /\b5\d{2}(?: \w+)*$/, 'root'),
    ],
  },
};
