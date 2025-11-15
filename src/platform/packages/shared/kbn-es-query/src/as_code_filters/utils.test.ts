/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { StoredFilter } from './types';
import { ASCODE_FILTER_OPERATOR } from '@kbn/es-query-constants';
import { extractBaseProperties, getFilterTypeForOperator } from './utils';
import { FilterStateStore } from '../..';

describe('Utils', () => {
  describe('extractBaseProperties', () => {
    it('should extract all base properties from stored filter', () => {
      const storedFilter: StoredFilter = {
        $state: { store: FilterStateStore.GLOBAL_STATE },
        meta: {
          key: 'test_field',
          disabled: true,
          controlledBy: 'dashboard',
          index: 'test-index',
          params: { custom: 'metadata' },
          negate: true,
          alias: 'Test Filter',
          isMultiIndex: true,
          type: 'spatial_filter',
          value: 'intersects',
        },
      };

      const result = extractBaseProperties(storedFilter);

      expect(result).toEqual({
        pinned: true,
        disabled: true,
        controlledBy: 'dashboard',
        dataViewId: 'test-index',
        negate: true,
        label: 'Test Filter',
        key: 'test_field',
        isMultiIndex: true,
        filterType: 'spatial_filter',
        value: 'intersects',
      });
    });

    it('should handle missing properties gracefully', () => {
      const storedFilter = {} as unknown as StoredFilter;

      const result = extractBaseProperties(storedFilter);

      expect(result).toEqual({
        pinned: undefined,
        disabled: undefined,
        controlledBy: undefined,
        dataViewId: undefined,
        negate: undefined,
        label: undefined,
        key: undefined,
        isMultiIndex: undefined,
        filterType: undefined,
        value: undefined,
      });
    });

    it('should detect non-global state as not pinned', () => {
      const storedFilter: StoredFilter = {
        $state: { store: FilterStateStore.APP_STATE },
        meta: { key: 'field1' },
      };

      const result = extractBaseProperties(storedFilter);

      expect(result.pinned).toBe(false); // appState should be false, not undefined
    });

    it('should handle partial meta object', () => {
      const storedFilter = {
        $state: {},
        meta: { key: 'field1', disabled: false },
      } as unknown as StoredFilter;

      const result = extractBaseProperties(storedFilter);

      expect(result).toEqual({
        pinned: undefined,
        disabled: false, // disabled: false should be preserved as false, not undefined
        controlledBy: undefined,
        dataViewId: undefined,
        negate: undefined,
        label: undefined,
        key: 'field1',
        isMultiIndex: undefined,
        filterType: undefined,
        value: undefined,
      });
    });
  });

  describe('getFilterTypeForOperator', () => {
    it('should return "exists" for existence operators', () => {
      expect(getFilterTypeForOperator(ASCODE_FILTER_OPERATOR.EXISTS)).toBe('exists');
      expect(getFilterTypeForOperator(ASCODE_FILTER_OPERATOR.NOT_EXISTS)).toBe('exists');
    });

    it('should return "range" for range operator', () => {
      expect(getFilterTypeForOperator(ASCODE_FILTER_OPERATOR.RANGE)).toBe('range');
    });

    it('should return "terms" for array operators', () => {
      expect(getFilterTypeForOperator(ASCODE_FILTER_OPERATOR.IS_ONE_OF)).toBe('terms');
      expect(getFilterTypeForOperator(ASCODE_FILTER_OPERATOR.IS_NOT_ONE_OF)).toBe('terms');
    });

    it('should return "phrase" for simple value operators', () => {
      expect(getFilterTypeForOperator(ASCODE_FILTER_OPERATOR.IS)).toBe('phrase');
      expect(getFilterTypeForOperator(ASCODE_FILTER_OPERATOR.IS_NOT)).toBe('phrase');
    });

    it('should return "phrase" for unknown operators', () => {
      expect(getFilterTypeForOperator('unknown_operator')).toBe('phrase');
    });
  });
});
