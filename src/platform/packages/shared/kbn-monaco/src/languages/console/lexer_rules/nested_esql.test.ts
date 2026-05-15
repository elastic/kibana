/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { keywords, builtinFunctions } from '../../esql/lib/esql_lexer_rules';
import { ESQL_LANG_ID } from '../../esql/lib/constants';
import { buildEsqlStartRule, buildEsqlRules, esqlLanguageAttributes } from './nested_esql';
import { languageTolerantRules } from './constants';

describe('Console nested ES|QL lexer rules', () => {
  describe('buildEsqlStartRule', () => {
    it('builds a start rule for single quotes (no nextEmbedded)', () => {
      const rule = buildEsqlStartRule(false);
      expect(rule[0]).toEqual(/("query")(\s*?)(:)(\s*?)(")/);
      expect(rule[1]).toEqual([
        'variable',
        'whitespace',
        'punctuation.colon',
        'whitespace',
        { token: 'punctuation', next: '@esql_root_single_quotes' },
      ]);
    });

    it('builds a start rule for triple quotes (nextEmbedded)', () => {
      const rule = buildEsqlStartRule(true);
      expect(rule[0]).toEqual(/("query")(\s*?)(:)(\s*?)(""")/);
      expect(rule[1]).toEqual([
        'variable',
        'whitespace',
        'punctuation.colon',
        'whitespace',
        { token: 'punctuation', next: 'esql_root_triple_quotes', nextEmbedded: ESQL_LANG_ID },
      ]);
    });

    it('accepts a custom root state name', () => {
      const rule = buildEsqlStartRule(true, 'custom_root');
      const action = (rule[1] as Array<Record<string, unknown> | string>)[4];
      if (typeof action === 'string') throw new Error('Expected an action object');
      expect(action.next).toEqual('custom_root_triple_quotes');
      expect(action.nextEmbedded).toEqual(ESQL_LANG_ID);
    });
  });

  describe('buildEsqlRules', () => {
    it('builds esql rules with default root name', () => {
      const rules = buildEsqlRules();
      expect(rules).toHaveProperty('esql_root_triple_quotes');
      expect(rules).toHaveProperty('esql_root_single_quotes');
      expect(rules).toHaveProperty('esql_string');
      expect(rules).toHaveProperty('comment');
    });

    it('triple quotes state only has the closing delimiter rule (delegates to embedded grammar)', () => {
      const rules = buildEsqlRules();
      const tripleQuotesRules = rules.esql_root_triple_quotes;
      expect(tripleQuotesRules).toHaveLength(1);
      expect(tripleQuotesRules[0]).toEqual([
        /"""/,
        { token: 'punctuation', next: '@pop', nextEmbedded: '@pop' },
      ]);
    });

    it('single quotes state includes language tolerant rules and ES|QL root rules', () => {
      const rules = buildEsqlRules();
      const singleQuotesRules = rules.esql_root_single_quotes;
      // languageTolerantRules are included (after the escape and closing quote rules)
      expect(singleQuotesRules).toContainEqual(languageTolerantRules[0]);
      expect(singleQuotesRules).toContainEqual(languageTolerantRules[1]);
      expect(singleQuotesRules).toContainEqual(languageTolerantRules[2]);
    });

    it('builds esql rules with custom root name', () => {
      const rules = buildEsqlRules('custom_root');
      expect(rules).toHaveProperty('custom_root_triple_quotes');
      expect(rules).toHaveProperty('custom_root_single_quotes');
    });

    it('esql_string has lookahead pop rules before the original string rules', () => {
      const rules = buildEsqlRules();
      const stringState = rules.esql_string;
      expect(stringState[0]).toEqual([/(?=""")/, { token: '', next: '@pop' }]);
      expect(stringState[1]).toEqual([/(?=")/, { token: '', next: '@pop' }]);
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
