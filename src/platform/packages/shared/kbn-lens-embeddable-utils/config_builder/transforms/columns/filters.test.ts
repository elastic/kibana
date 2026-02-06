/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { fromFiltersLensApiToLensState, fromFiltersLensStateToAPI } from './filters';
import type { FiltersIndexPatternColumn } from '@kbn/lens-common';
import type { LensApiFiltersOperation } from '../../schema/bucket_ops';

describe('Filters Transforms', () => {
  describe('fromFiltersLensApiToLensState', () => {
    it('should transform basic filters configuration', () => {
      const input: LensApiFiltersOperation = {
        operation: 'filters',
        filters: [
          { filter: { language: 'kuery', query: 'status:active' }, label: 'Active' },
          { filter: { language: 'lucene', query: 'status:inactive' } },
        ],
      };

      const result = fromFiltersLensApiToLensState(input);
      expect(result.operationType).toBe('filters');
      expect(result.label).toBe('');
      expect(result.customLabel).toBe(false);
      expect(result.params.filters).toHaveLength(2);
      expect(result.params.filters[0].input).toEqual({ language: 'kuery', query: 'status:active' });
      expect(result.params.filters[0].label).toBe('Active');
      expect(result.params.filters[1].input).toEqual({
        language: 'lucene',
        query: 'status:inactive',
      });
      expect(result.params.filters[1].label).toBe('Filter');
    });

    it('should use custom label if provided', () => {
      const input: LensApiFiltersOperation = {
        operation: 'filters',
        label: 'Custom Filters',
        filters: [],
      };

      const result = fromFiltersLensApiToLensState(input);
      expect(result.label).toBe('Custom Filters');
    });

    it('should handle empty filters array', () => {
      const input: LensApiFiltersOperation = {
        operation: 'filters',
        filters: [],
      };

      const result = fromFiltersLensApiToLensState(input);
      expect(result.params.filters).toEqual([]);
    });
  });

  describe('fromFiltersLensStateToAPI', () => {
    it('should transform filters lens state to API', () => {
      const input: FiltersIndexPatternColumn = {
        operationType: 'filters',
        label: 'Filters',
        dataType: 'string',
        isBucketed: true,
        customLabel: true,
        params: {
          filters: [
            { input: { language: 'kuery', query: 'status:active' }, label: 'Active' },
            { input: { language: 'lucene', query: 'status:inactive' }, label: 'Inactive' },
          ],
        },
      };

      const result = fromFiltersLensStateToAPI(input);
      expect(result.operation).toBe('filters');
      expect(result.label).toBe('Filters');
      expect(result.filters).toHaveLength(2);
      expect(result.filters[0].filter).toEqual({ language: 'kuery', query: 'status:active' });
      expect(result.filters[0].label).toBe('Active');
      expect(result.filters[1].filter).toEqual({ language: 'lucene', query: 'status:inactive' });
      expect(result.filters[1].label).toBe('Inactive');
    });

    it('should handle missing filter label', () => {
      const input: FiltersIndexPatternColumn = {
        operationType: 'filters',
        label: 'Filters',
        dataType: 'string',
        isBucketed: true,
        params: {
          filters: [{ input: { language: 'kuery', query: 'status:active' }, label: 'Active' }],
        },
      };

      const result = fromFiltersLensStateToAPI(input);
      expect(result.filters[0].label).toBe('Active');
    });
  });
});
