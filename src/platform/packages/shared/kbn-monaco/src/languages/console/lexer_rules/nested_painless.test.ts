/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { languageTolerantRules } from './constants';
import {
  buildPainlessStartRule,
  buildPainlessRules,
  painlessLanguageAttributes,
} from './nested_painless';
import { lexerRules as painlessLexerRules } from '../../painless/lexer_rules';
import type { monaco } from '../../../monaco_imports';

const getNextState = (
  action: monaco.languages.IMonarchLanguageAction | undefined
): string | undefined => {
  if (!action || typeof action !== 'object' || !('next' in action)) return undefined;
  return typeof action.next === 'string' ? action.next : undefined;
};

describe('Console nested Painless lexer rules', () => {
  describe('buildPainlessStartRule', () => {
    it('builds a start rule for painless scripts', () => {
      const rule = buildPainlessStartRule();
      expect(rule[0]).toEqual(/("(?:[^"]*_)?script"|"inline"|"source")(\s*?)(:)(\s*?)(""")/);
      expect(rule[1]).toEqual([
        'variable',
        'whitespace',
        'punctuation.colon',
        'whitespace',
        {
          token: 'punctuation',
          next: '@painless_root',
        },
      ]);
    });

    it('accepts a custom root state name', () => {
      const rule = buildPainlessStartRule('custom_painless_root');
      const action = (rule[1] as Array<monaco.languages.IMonarchLanguageAction | string>)[4];
      expect(getNextState(typeof action === 'string' ? undefined : action)).toEqual(
        '@custom_painless_root'
      );
    });
  });

  describe('buildPainlessRules', () => {
    it('builds painless rules with default root name', () => {
      const rules = buildPainlessRules();
      expect(rules).toHaveProperty('painless_root');
      expect(rules).toHaveProperty('comment');
      expect(rules).toHaveProperty('string_dq');
      expect(rules).toHaveProperty('string_sq');

      // Verify the language tolerant rules are present at the beginning (after the pop rule)
      const painlessRootRules = rules.painless_root;
      expect(painlessRootRules[1]).toEqual(languageTolerantRules[0]);
      expect(painlessRootRules[2]).toEqual(languageTolerantRules[1]);
      expect(painlessRootRules[3]).toEqual(languageTolerantRules[2]);
    });

    it('builds painless rules with custom root name', () => {
      const rules = buildPainlessRules('custom_painless_root');
      expect(rules).toHaveProperty('custom_painless_root');
    });
  });

  describe('painlessLanguageAttributes', () => {
    it('exports all necessary painless attributes', () => {
      expect(painlessLanguageAttributes.keywords).toEqual(painlessLexerRules.keywords);
      expect(painlessLanguageAttributes.primitives).toEqual(painlessLexerRules.primitives);
      expect(painlessLanguageAttributes.constants).toEqual(painlessLexerRules.constants);
      expect(painlessLanguageAttributes.operators).toEqual(painlessLexerRules.operators);
      expect(painlessLanguageAttributes.symbols).toEqual(painlessLexerRules.symbols);
      expect(painlessLanguageAttributes.digits).toEqual(painlessLexerRules.digits);
      expect(painlessLanguageAttributes.octaldigits).toEqual(painlessLexerRules.octaldigits);
      expect(painlessLanguageAttributes.binarydigits).toEqual(painlessLexerRules.binarydigits);
      expect(painlessLanguageAttributes.hexdigits).toEqual(painlessLexerRules.hexdigits);
    });
  });
});
