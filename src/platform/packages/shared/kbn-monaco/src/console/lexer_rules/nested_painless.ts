/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { lexerRules as painlessLexerRules } from '../../painless/lexer_rules';

/*
 * This rule is used inside json root to start a painless highlighting sequence
 */
export const buildPainlessStartRule = (painlessRoot: string = 'painless_root') => {
  return [
    /("(?:[^"]*_)?script"|"inline"|"source")(\s*?)(:)(\s*?)(""")/,
    [
      'variable',
      'whitespace',
      'punctuation.colon',
      'whitespace',
      {
        token: 'punctuation',
        next: `@${painlessRoot}`,
      },
    ],
  ];
};

/*
 * This function creates a group of rules needed for painless highlighting in console.
 * It reuses the lexer rules from the "painless" language, but since not all rules are referenced in the root
 * tokenizer and to avoid conflicts with existing console rules, only selected rules are used.
 */
export const buildPainlessRules = (painlessRoot: string = 'painless_root') => {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  const { root, comment, string_dq, string_sq } = painlessLexerRules.tokenizer;
  return {
    [painlessRoot]: [
      // the rule to end painless highlighting and get back to the previous tokenizer state
      [
        /"""/,
        {
          token: 'punctuation',
          next: '@pop',
        },
      ],
      ...root,
    ],
    comment,
    string_dq,
    string_sq,
  };
};

/*
 * These language attributes need to be added to the console language definition for painless tokenizer
 * to work correctly.
 */
export const painlessLanguageAttributes = {
  keywords: painlessLexerRules.keywords,
  primitives: painlessLexerRules.primitives,
  constants: painlessLexerRules.constants,
  operators: painlessLexerRules.operators,
  symbols: painlessLexerRules.symbols,
  digits: painlessLexerRules.digits,
  octaldigits: painlessLexerRules.octaldigits,
  binarydigits: painlessLexerRules.binarydigits,
  hexdigits: painlessLexerRules.hexdigits,
};
