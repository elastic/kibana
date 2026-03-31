/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { keywords, builtinFunctions } from '../../sql/lexer_rules';
import type { monaco } from '../../monaco_imports';

const getNextState = (
  action: monaco.languages.IMonarchLanguageAction | undefined
): string | undefined => {
  if (!action || typeof action !== 'object' || !('next' in action)) return undefined;
  return typeof action.next === 'string' ? action.next : undefined;
};

jest.mock('../../sql/lexer_rules', () => {
  const actual = jest.requireActual('../../sql/lexer_rules');
  return {
    ...actual,
    lexerRules: {
      ...actual.lexerRules,
      tokenizer: {
        ...actual.lexerRules.tokenizer,
        strings: [
          ...(actual.lexerRules.tokenizer.strings || []),
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
import { buildSqlStartRule, buildSqlRules, sqlLanguageAttributes } from './nested_sql';

describe('Console nested SQL lexer rules', () => {
  describe('buildSqlStartRule', () => {
    it('builds a start rule for triple quotes', () => {
      const rule = buildSqlStartRule();
      expect(rule[0]).toEqual(/("query")(\s*?)(:)(\s*?)(""")/);
      expect(rule[1]).toEqual([
        'variable',
        'whitespace',
        'punctuation.colon',
        'whitespace',
        {
          token: 'punctuation',
          next: '@sql_root',
        },
      ]);
    });

    it('accepts a custom root state name', () => {
      const rule = buildSqlStartRule('custom_sql_root');
      const action = (rule[1] as Array<monaco.languages.IMonarchLanguageAction | string>)[4];
      expect(getNextState(typeof action === 'string' ? undefined : action)).toEqual(
        '@custom_sql_root'
      );
    });
  });

  describe('buildSqlRules', () => {
    it('builds sql rules with default root name', () => {
      const rules = buildSqlRules();
      expect(rules).toHaveProperty('sql_root');
      expect(rules).toHaveProperty('sql_string');
      expect(rules).toHaveProperty('comment');

      // Verify the language tolerant rules are present at the beginning
      const sqlRootRules = rules.sql_root;
      expect(sqlRootRules[1]).toEqual(languageTolerantRules[0]);
      expect(sqlRootRules[2]).toEqual(languageTolerantRules[1]);
      expect(sqlRootRules[3]).toEqual(languageTolerantRules[2]);

      // Verify the fallback rule is present at the end
      expect(sqlRootRules[sqlRootRules.length - 1]).toEqual([/./, 'text']);
    });

    it('builds sql rules with custom root name', () => {
      const rules = buildSqlRules('custom_sql_root');
      expect(rules).toHaveProperty('custom_sql_root');
    });

    it('remaps string states correctly', () => {
      const rules = buildSqlRules();
      const stringState = rules.sql_string;

      // Should have lookahead pop rules at the start
      expect(stringState[0]).toEqual([/(?=""")/, { token: '', next: '@pop' }]);
      expect(stringState[1]).toEqual([/(?=")/, { token: '', next: '@pop' }]);

      // Should contain the original string rules (if present)
      expect(stringState.length).toBeGreaterThanOrEqual(2);
    });

    it('handles missing string and strings arrays gracefully', () => {
      jest.resetModules();
      jest.doMock('../../sql/lexer_rules', () => {
        const actual = jest.requireActual('../../sql/lexer_rules');
        return {
          ...actual,
          lexerRules: {
            ...actual.lexerRules,
            tokenizer: {
              ...actual.lexerRules.tokenizer,
              strings: undefined,
              string: undefined,
            },
          },
        };
      });

      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const isolatedNestedSql = require('./nested_sql');
      const rules = isolatedNestedSql.buildSqlRules();

      expect(rules.sql_root).toBeDefined();
      expect(rules.sql_string).toBeDefined();
      // Since string and strings are undefined, the sql_string state should just have the two lookahead rules
      expect(rules.sql_string.length).toBe(2);
    });
  });

  describe('sqlLanguageAttributes', () => {
    it('exports keywords and builtinFunctions', () => {
      expect(sqlLanguageAttributes.keywords).toEqual(keywords);
      expect(sqlLanguageAttributes.builtinFunctions).toEqual(builtinFunctions);
    });
  });
});
