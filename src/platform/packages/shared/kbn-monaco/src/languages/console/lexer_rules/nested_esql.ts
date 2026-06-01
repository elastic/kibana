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
import { languageTolerantRules } from './constants';
import { remapStringsToNestedState } from './utils/remap_strings_to_nested_state';
import type { monaco } from '../../../monaco_imports';
import { ESQL_LANG_ID } from '../../esql/lib/constants';

/*
 * This rule is used inside json root to start an esql highlighting sequence.
 * Triple-quoted strings use nextEmbedded to delegate to the @elastic/monaco-esql grammar.
 * Single-quoted strings cannot use nextEmbedded because JSON escape sequences (e.g. `\"`)
 * cause the embedded grammar to be popped and re-entered from its root state. The
 * @elastic/monaco-esql root starts in firstCommandName, which only matches /[a-zA-Z]+/ —
 * no underscores — so any identifier after an escaped quote would be miscoloured. Instead,
 * single-quoted strings use a direct state transition and inline the ES|QL rules so that
 * escape sequences are handled by the outer Console grammar before ES|QL rules ever see them.
 */
export const buildEsqlStartRule = (tripleQuotes: boolean, esqlRoot: string = 'esql_root') => {
  return [
    tripleQuotes ? /("query")(\s*?)(:)(\s*?)(""")/ : /("query")(\s*?)(:)(\s*?)(")/,
    [
      'variable',
      'whitespace',
      'punctuation.colon',
      'whitespace',
      tripleQuotes
        ? { token: 'punctuation', next: `${esqlRoot}_triple_quotes`, nextEmbedded: ESQL_LANG_ID }
        : { token: 'punctuation', next: `@${esqlRoot}_single_quotes` },
    ],
  ];
};

/*
 * This function creates a group of rules needed for esql highlighting in console.
 * It reuses the tokenizer rules from esql_lexer_rules (a flat, self-contained set
 * compatible with the Console tokenizer context), but keywords and functions are
 * sourced from @kbn/esql-language so they stay in sync automatically.
 */
export const buildEsqlRules = (
  esqlRoot: string = 'esql_root'
): Record<string, monaco.languages.IMonarchLanguageRule[]> => {
  const { root, comment, numbers, strings, string: esqlString } = esqlLexerRules.tokenizer;

  // Remap transitions in `strings` to point to `@esql_string` to avoid
  // conflict with the console's JSON `@string` state.
  const remappedStrings = remapStringsToNestedState(strings, '@esql_string');

  return {
    [`${esqlRoot}_triple_quotes`]: [
      // End esql highlighting and return to the previous tokenizer state.
      [/"""/, { token: 'punctuation', next: '@pop', nextEmbedded: '@pop' }],
    ],
    [`${esqlRoot}_single_quotes`]: [
      // A JSON-escaped quoted string: \"...\". Tokenised as a string so it renders
      // the same colour as double-quoted strings in triple-quote mode.
      [/\\"[^"]*\\"/, 'string'],
      [/@escapes/, 'string.escape'],
      // the rule to end esql highlighting and get back to the previous tokenizer state
      [
        /"/, // Unescaped quote
        {
          token: 'punctuation',
          next: '@pop',
        },
      ],
      ...languageTolerantRules,
      ...root,
      ...numbers,
      ...remappedStrings,
      [/./, 'text'],
    ],
    esql_string: [
      // If we see the JSON boundary closing quote while inside an unclosed ES|QL string,
      // pop out of the ES|QL string without consuming the quote.
      [/(?=""")/, { token: '', next: '@pop' }],
      [/(?=")/, { token: '', next: '@pop' }],
      ...(Array.isArray(esqlString) ? esqlString : []),
    ],
    comment,
  };
};

/*
 * These language attributes need to be added to the console language definition for esql tokenizer
 * to work correctly.
 */
export const esqlLanguageAttributes = { keywords, builtinFunctions };
