/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { lexerRules as sqlLexerRules, keywords, builtinFunctions } from '../../sql/lexer_rules';
/*
 * This rule is used inside json root to start a sql highlighting sequence
 */
export const buildSqlStartRule = (sqlRoot: string = 'sql_root') => {
  return [
    /("query")(\s*?)(:)(\s*?)(""")/,
    [
      'variable',
      'whitespace',
      'punctuation.colon',
      'whitespace',
      {
        token: 'punctuation',
        next: `@${sqlRoot}`,
      },
    ],
  ];
};

/*
 * This function creates a group of rules needed for sql highlighting in console.
 * It reuses the lexer ruls from the "sql" language, but since not all rules are referenced in the root
 * tokenizer and to avoid conflicts with existing console rules, only selected rules are used.
 */
export const buildSqlRules = (sqlRoot: string = 'sql_root') => {
  const { root, comment, numbers } = sqlLexerRules.tokenizer;
  return {
    [sqlRoot]: [
      // the rule to end sql highlighting and get back to the previous tokenizer state
      [
        /"""/,
        {
          token: 'punctuation',
          next: '@pop',
        },
      ],
      ...root,
      ...numbers,
    ],
    comment,
  };
};

/*
 * These language attributes need to be added to the console language definition for sql tokenizer
 * to work correctly.
 */
export const sqlLanguageAttributes = { keywords, builtinFunctions };
