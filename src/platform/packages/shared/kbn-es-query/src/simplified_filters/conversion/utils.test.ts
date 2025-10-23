/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { extractBaseProperties, getFilterTypeForOperator } from './utils';

describe('Utils', () => {
  describe('extractBaseProperties', () => {
    it('should extract all base properties from stored filter', () => {
      const storedFilter = {
        $state: { store: 'globalState' },
        meta: {
          key: 'test_field',
          disabled: true,
          controlledBy: 'dashboard',
          index: 'test-index',
          params: { custom: 'metadata' },
          negate: true,
          alias: 'Test Filter',
        },
      };

      const result = extractBaseProperties(storedFilter);

      expect(result).toEqual({
        id: 'test_field',
        pinned: true,
        disabled: true,
        controlledBy: 'dashboard',
        indexPattern: 'test-index',
        metadata: { custom: 'metadata' },
        negate: true,
        label: 'Test Filter',
      });
    });

    it('should handle missing properties gracefully', () => {
      const storedFilter = {};

      const result = extractBaseProperties(storedFilter);

      expect(result).toEqual({
        id: undefined,
        pinned: undefined,
        disabled: undefined,
        controlledBy: undefined,
        indexPattern: undefined,
        metadata: undefined,
        negate: undefined,
        label: undefined,
      });
    });

    it('should detect non-global state as not pinned', () => {
      const storedFilter = {
        $state: { store: 'appState' },
      };

      const result = extractBaseProperties(storedFilter);

      expect(result.pinned).toBeUndefined();
    });

    it('should handle partial meta object', () => {
      const storedFilter = {
        meta: {
          key: 'field1',
          disabled: false,
        },
      };

      const result = extractBaseProperties(storedFilter);

      expect(result).toEqual({
        id: 'field1',
        pinned: undefined,
        disabled: undefined,
        controlledBy: undefined,
        indexPattern: undefined,
        metadata: undefined,
        negate: undefined,
        label: undefined,
      });
    });
  });

  describe('getFilterTypeForOperator', () => {
    it('should return "exists" for existence operators', () => {
      expect(getFilterTypeForOperator('exists')).toBe('exists');
      expect(getFilterTypeForOperator('not_exists')).toBe('exists');
    });

    it('should return "range" for range operator', () => {
      expect(getFilterTypeForOperator('range')).toBe('range');
    });

    it('should return "terms" for array operators', () => {
      expect(getFilterTypeForOperator('is_one_of')).toBe('terms');
      expect(getFilterTypeForOperator('is_not_one_of')).toBe('terms');
    });

    it('should return "phrase" for simple value operators', () => {
      expect(getFilterTypeForOperator('is')).toBe('phrase');
      expect(getFilterTypeForOperator('is_not')).toBe('phrase');
    });

    it('should return "phrase" for unknown operators', () => {
      expect(getFilterTypeForOperator('unknown_operator')).toBe('phrase');
    });
  });
});
