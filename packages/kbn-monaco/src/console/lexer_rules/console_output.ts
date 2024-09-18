/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
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
      matchTokensWithEOL('comment.default', /# .+?(?=\s+\[\b1\d{2}(?: \w+)*\]$)/, 'root', 'status'),
      matchTokensWithEOL('comment.success', /# .+?(?=\s+\[\b2\d{2}(?: \w+)*\]$)/, 'root', 'status'),
      matchTokensWithEOL('comment.primary', /# .+?(?=\s+\[\b3\d{2}(?: \w+)*\]$)/, 'root', 'status'),
      matchTokensWithEOL('comment.warning', /# .+?(?=\s+\[\b4\d{2}(?: \w+)*\]$)/, 'root', 'status'),
      matchTokensWithEOL('comment.danger', /# .+?(?=\s+\[\b5\d{2}(?: \w+)*\]$)/, 'root', 'status'),
      ...consoleSharedLexerRules.tokenizer.comments,
    ],
    status: [
      // Status codes 100 – 199
      matchTokensWithEOL('status.default', /\[\b1\d{2}(?: \w+)*\]$/, 'root'),
      // Status codes 200 – 299
      matchTokensWithEOL('status.success', /\[\b2\d{2}(?: \w+)*\]$/, 'root'),
      // Status codes 300 – 399
      matchTokensWithEOL('status.primary', /\[\b3\d{2}(?: \w+)*\]$/, 'root'),
      // Status codes 400 – 499
      matchTokensWithEOL('status.warning', /\[\b4\d{2}(?: \w+)*\]$/, 'root'),
      // Status codes 500 – 599
      matchTokensWithEOL('status.danger', /\[\b5\d{2}(?: \w+)*\]$/, 'root'),
    ],
  },
};
