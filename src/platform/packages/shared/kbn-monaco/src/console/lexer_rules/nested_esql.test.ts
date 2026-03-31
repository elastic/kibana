/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { lexerRules, keywords, builtinFunctions } from '../../esql/lib/esql_lexer_rules';
import type { monaco } from '../../monaco_imports';

const getNextState = (
  action: monaco.languages.IMonarchLanguageAction | undefined
): string | undefined => {
  if (!action || typeof action !== 'object' || !('next' in action)) return undefined;
  return typeof action.next === 'string' ? action.next : undefined;
};

const isRuleWithNextState = (
  rule: monaco.languages.IMonarchLanguageRule,
  next: string
): boolean => {
  if (!Array.isArray(rule) || rule.length < 2) return false;
  const action = rule[1];
  return getNextState(typeof action === 'string' ? undefined : action) === next;
};

jest.mock('../../esql/lib/esql_lexer_rules', () => {
  const actual = jest.requireActual('../../esql/lib/esql_lexer_rules');
  return {
    ...actual,
    lexerRules: {
      ...actual.lexerRules,
      tokenizer: {
        ...actual.lexerRules.tokenizer,
        strings: [
          ...actual.lexerRules.tokenizer.strings,
          // A string rule that shouldn't be remapped to cover the branch
          [/ignore/, 'string'],
          // A rule without a next state
          [/ignore2/, { token: 'string' }],
          // Not an array rule
          'ignore3',
        ],
      },
    },
  };
});

import { languageTolerantRules } from './constants';
import { buildEsqlStartRule, buildEsqlRules, esqlLanguageAttributes } from './nested_esql';

describe('Console nested ES|QL lexer rules', () => {
  describe('buildEsqlStartRule', () => {
    it('builds a start rule for single quotes', () => {
      const rule = buildEsqlStartRule(false);
      expect(rule[0]).toEqual(/("query")(\s*?)(:)(\s*?)(")/);
      expect(rule[1]).toEqual([
        'variable',
        'whitespace',
        'punctuation.colon',
        'whitespace',
        {
          token: 'punctuation',
          next: '@esql_root_single_quotes',
        },
      ]);
    });

    it('builds a start rule for triple quotes', () => {
      const rule = buildEsqlStartRule(true);
      expect(rule[0]).toEqual(/("query")(\s*?)(:)(\s*?)(""")/);
      expect(rule[1]).toEqual([
        'variable',
        'whitespace',
        'punctuation.colon',
        'whitespace',
        {
          token: 'punctuation',
          next: '@esql_root_triple_quotes',
        },
      ]);
    });

    it('accepts a custom root state name', () => {
      const rule = buildEsqlStartRule(true, 'custom_root');
      const action = (rule[1] as Array<monaco.languages.IMonarchLanguageAction | string>)[4];
      expect(getNextState(typeof action === 'string' ? undefined : action)).toEqual(
        '@custom_root_triple_quotes'
      );
    });
  });

  describe('buildEsqlRules', () => {
    it('builds esql rules with default root name', () => {
      const rules = buildEsqlRules();
      expect(rules).toHaveProperty('esql_root_triple_quotes');
      expect(rules).toHaveProperty('esql_root_single_quotes');
      expect(rules).toHaveProperty('esql_string');
      expect(rules).toHaveProperty('comment');

      // Verify the language tolerant rules are present at the beginning (after the pop rule)
      const tripleQuotesRules = rules.esql_root_triple_quotes;
      expect(tripleQuotesRules[1]).toEqual(languageTolerantRules[0]);
      expect(tripleQuotesRules[2]).toEqual(languageTolerantRules[1]);
      expect(tripleQuotesRules[3]).toEqual(languageTolerantRules[2]);

      // Verify strings were remapped
      const hasRemappedStringRule = tripleQuotesRules.some((r) =>
        isRuleWithNextState(r, '@esql_string')
      );
      if (lexerRules.tokenizer.strings && lexerRules.tokenizer.strings.length > 0) {
        expect(hasRemappedStringRule).toBe(true);
      }
    });

    it('builds esql rules with custom root name', () => {
      const rules = buildEsqlRules('custom_root');
      expect(rules).toHaveProperty('custom_root_triple_quotes');
      expect(rules).toHaveProperty('custom_root_single_quotes');
    });

    it('remaps string states correctly', () => {
      const rules = buildEsqlRules();
      const stringState = rules.esql_string;

      // Should have lookahead pop rules at the start
      expect(stringState[0]).toEqual([/(?=""")/, { token: '', next: '@pop' }]);
      expect(stringState[1]).toEqual([/(?=")/, { token: '', next: '@pop' }]);

      // Should contain the original string rules
      expect(stringState.length).toBeGreaterThan(2);
    });
  });

  describe('esqlLanguageAttributes', () => {
    it('exports keywords and builtinFunctions', () => {
      expect(esqlLanguageAttributes.keywords).toEqual(keywords);
      expect(esqlLanguageAttributes.builtinFunctions).toEqual(builtinFunctions);
    });
  });
});
