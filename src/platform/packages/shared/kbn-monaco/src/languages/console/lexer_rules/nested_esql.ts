/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  lexerRules as esqlLexerRules,
  keywords,
  builtinFunctions,
} from '../../esql/lib/esql_lexer_rules';
/*
 * This rule is used inside json root to start an esql highlighting sequence
 */
export const buildEsqlStartRule = (tripleQuotes: boolean, esqlRoot: string = 'esql_root') => {
  return [
    tripleQuotes ? /("query")(\s*?)(:)(\s*?)(""")/ : /("query")(\s*?)(:)(\s*?)(")/,
    [
      'variable',
      'whitespace',
      'punctuation.colon',
      'whitespace',
      {
        token: 'punctuation',
        next: tripleQuotes ? `@${esqlRoot}_triple_quotes` : `@${esqlRoot}_single_quotes`,
      },
    ],
  ];
};

/*
 * This function creates a group of rules needed for sql highlighting in console.
 * It reuses the lexer rules from the "esql" language, but since not all rules are referenced in the root
 * tokenizer and to avoid conflicts with existing console rules, only selected rules are used.
 */
export const buildEsqlRules = (esqlRoot: string = 'esql_root') => {
  const { root, comment, numbers, strings } = esqlLexerRules.tokenizer;
  return {
    [`${esqlRoot}_triple_quotes`]: [
      // the rule to end esql highlighting and get back to the previous tokenizer state
      [
        /"""/,
        {
          token: 'punctuation',
          next: '@pop',
        },
      ],
      ...root,
      ...numbers,
      ...strings,
    ],
    [`${esqlRoot}_single_quotes`]: [
      [/@escapes/, 'string.escape'],
      // the rule to end esql highlighting and get back to the previous tokenizer state
      [
        /"/, // Unescaped quote
        {
          token: 'punctuation',
          next: '@pop',
        },
      ],
      ...root,
      ...numbers,
      ...strings,
    ],
    comment,
  };
};

/*
 * These language attributes need to be added to the console language definition for esql tokenizer
 * to work correctly.
 */
export const esqlLanguageAttributes = { keywords, builtinFunctions };
