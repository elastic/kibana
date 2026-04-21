/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { fromTermsLensApiToLensState, fromTermsLensStateToAPI } from './top_values';
import type {
  PercentileIndexPatternColumn,
  PercentileRanksIndexPatternColumn,
  TermsIndexPatternColumn,
} from '@kbn/lens-common';
import type { LensApiTermsOperation } from '../../schema/bucket_ops';
import { LENS_EMPTY_AS_NULL_DEFAULT_VALUE } from './utils';

describe('Top Values Transforms', () => {
  const columns = [
    {
      column: {
        id: 'metricCol1',
        operationType: 'sum' as const,
        sourceField: 'value',
        label: 'Sum of value',
        dataType: 'number' as const,
        params: {
          emptyAsNull: LENS_EMPTY_AS_NULL_DEFAULT_VALUE,
        },
        isBucketed: false,
      },
      id: 'metricCol1',
    },
    {
      column: {
        id: 'metricCol2',
        operationType: 'average' as const,
        sourceField: 'score',
        label: 'Average of score',
        dataType: 'number' as const,
        isBucketed: false,
      },
      id: 'metricCol2',
    },
  ];
  const getMetricColumnIdByIndex = (index: number) => columns[index]?.id;

  describe('fromTermsLensApiToLensState', () => {
    it('should transform basic terms configuration', () => {
      const input: LensApiTermsOperation = {
        operation: 'terms',
        fields: ['status'],
        limit: 5,
      };

      const result = fromTermsLensApiToLensState(input, getMetricColumnIdByIndex);
      expect(result.operationType).toBe('terms');
      expect(result.sourceField).toBe('status');
      expect(result.params.size).toBe(5);
      expect(result.label).toBe('');
      expect(result.customLabel).toBe(false);
    });

    it('should handle secondary fields', () => {
      const input: LensApiTermsOperation = {
        operation: 'terms',
        fields: ['status', 'region'],
        limit: 3,
      };

      const result = fromTermsLensApiToLensState(input, getMetricColumnIdByIndex);
      expect(result.params.secondaryFields).toEqual(['region']);
    });

    it('should handle custom label', () => {
      const input: LensApiTermsOperation = {
        operation: 'terms',
        fields: ['status'],
        limit: 10,
        label: 'Custom Label',
      };

      const result = fromTermsLensApiToLensState(input, getMetricColumnIdByIndex);
      expect(result.label).toBe('Custom Label');
      expect(result.customLabel).toBe(true);
    });

    it('should handle includes and excludes', () => {
      const input: LensApiTermsOperation = {
        operation: 'terms',
        fields: ['status'],
        limit: 5,
        includes: { as_regex: true, values: ['active', 'pending'] },
        excludes: { as_regex: false, values: ['inactive'] },
      };

      const result = fromTermsLensApiToLensState(input, getMetricColumnIdByIndex);
      expect(result.params.include).toEqual(['active', 'pending']);
      expect(result.params.includeIsRegex).toBe(true);
      expect(result.params.exclude).toEqual(['inactive']);
      expect(result.params.excludeIsRegex).toBe(false);
    });

    it('should handle orderBy column type', () => {
      const input: LensApiTermsOperation = {
        operation: 'terms',
        fields: ['status'],
        limit: 5,
        rank_by: { type: 'metric', metric_index: 0, direction: 'desc' },
      };

      const result = fromTermsLensApiToLensState(input, getMetricColumnIdByIndex);
      expect(result.params.orderBy).toEqual({ type: 'column', columnId: 'metricCol1' });
      expect(result.params.orderDirection).toBe('desc');
    });

    it('should resolve a non-zero metric_index to the correct metric column', () => {
      const input: LensApiTermsOperation = {
        operation: 'terms',
        fields: ['status'],
        limit: 5,
        rank_by: { type: 'metric', metric_index: 1, direction: 'asc' },
      };

      const result = fromTermsLensApiToLensState(input, getMetricColumnIdByIndex);
      expect(result.params.orderBy).toEqual({ type: 'column', columnId: 'metricCol2' });
      expect(result.params.orderDirection).toBe('asc');
    });

    it('should fallback to alphabetical order if metric column id is missing', () => {
      const input: LensApiTermsOperation = {
        operation: 'terms',
        fields: ['status'],
        limit: 5,
        rank_by: { type: 'metric', metric_index: 3, direction: 'desc' },
      };

      const result = fromTermsLensApiToLensState(input, getMetricColumnIdByIndex);
      expect(result.params.orderBy).toEqual({ type: 'alphabetical', fallback: true });
      expect(result.params.orderDirection).toBe('desc');
    });

    it('should handle custom rank_by with a basic operation', () => {
      const input: LensApiTermsOperation = {
        operation: 'terms',
        fields: ['status'],
        limit: 5,
        rank_by: { type: 'custom', operation: 'average', field: 'score', direction: 'desc' },
      };

      const result = fromTermsLensApiToLensState(input, getMetricColumnIdByIndex);
      expect(result.params.orderBy).toEqual({ type: 'custom' });
      expect(result.params.orderDirection).toBe('desc');
      expect(result.params.orderAgg).toEqual({
        operationType: 'average',
        sourceField: 'score',
        dataType: 'number',
        isBucketed: false,
        label: '',
      });
    });

    it('should handle custom rank_by with percentile operation', () => {
      const input: LensApiTermsOperation = {
        operation: 'terms',
        fields: ['status'],
        limit: 5,
        rank_by: {
          type: 'custom',
          operation: 'percentile',
          field: 'latency',
          direction: 'desc',
          percentile: 90,
        },
      };

      const result = fromTermsLensApiToLensState(input, getMetricColumnIdByIndex);
      expect(result.params.orderBy).toEqual({ type: 'custom' });
      expect(result.params.orderDirection).toBe('desc');
      expect(result.params.orderAgg).toEqual({
        operationType: 'percentile',
        sourceField: 'latency',
        dataType: 'number',
        isBucketed: false,
        label: '',
        params: { percentile: 90 },
      });
    });

    it('should handle custom rank_by with percentile_rank operation', () => {
      const input: LensApiTermsOperation = {
        operation: 'terms',
        fields: ['status'],
        limit: 5,
        rank_by: {
          type: 'custom',
          operation: 'percentile_rank',
          field: 'latency',
          direction: 'asc',
          rank: 500,
        },
      };

      const result = fromTermsLensApiToLensState(input, getMetricColumnIdByIndex);
      expect(result.params.orderBy).toEqual({ type: 'custom' });
      expect(result.params.orderDirection).toBe('asc');
      expect(result.params.orderAgg).toEqual({
        operationType: 'percentile_rank',
        sourceField: 'latency',
        dataType: 'number',
        isBucketed: false,
        label: '',
        params: { value: 500 },
      });
    });
  });

  describe('fromTermsLensStateToAPI', () => {
    it('should transform basic terms lens state to API', () => {
      const input: TermsIndexPatternColumn = {
        operationType: 'terms',
        sourceField: 'status',
        customLabel: false,
        label: 'Top 5 values for status',
        isBucketed: true,
        dataType: 'string',
        params: {
          secondaryFields: [],
          size: 5,
          accuracyMode: false,
          include: [],
          includeIsRegex: false,
          exclude: [],
          excludeIsRegex: false,
          otherBucket: false,
          missingBucket: false,
          orderBy: { type: 'alphabetical' },
          orderDirection: 'asc',
          parentFormat: { id: 'terms' },
        },
      };

      const result = fromTermsLensStateToAPI(input, columns);
      expect(result.operation).toBe('terms');
      expect(result.fields).toEqual(['status']);
      expect(result.limit).toBe(5);
      expect(result.other_bucket).toBeUndefined();
    });

    it('should handle secondary fields', () => {
      const input: TermsIndexPatternColumn = {
        operationType: 'terms',
        sourceField: 'status',
        customLabel: false,
        label: 'Top 5 values for status',
        isBucketed: true,
        dataType: 'string',
        params: {
          secondaryFields: ['region'],
          size: 5,
          accuracyMode: false,
          include: [],
          includeIsRegex: false,
          exclude: [],
          excludeIsRegex: false,
          otherBucket: false,
          missingBucket: false,
          orderBy: { type: 'alphabetical' },
          orderDirection: 'asc',
          parentFormat: { id: 'terms' },
        },
      };

      const result = fromTermsLensStateToAPI(input, columns);
      expect(result.fields).toEqual(['status', 'region']);
    });

    it('should handle includes and excludes', () => {
      const input: TermsIndexPatternColumn = {
        operationType: 'terms',
        sourceField: 'status',
        customLabel: false,
        label: 'Top 5 values for status',
        isBucketed: true,
        dataType: 'string',
        params: {
          secondaryFields: [],
          size: 5,
          accuracyMode: false,
          include: ['active', 'pending'],
          includeIsRegex: true,
          exclude: ['inactive'],
          excludeIsRegex: false,
          otherBucket: false,
          missingBucket: false,
          orderBy: { type: 'alphabetical' },
          orderDirection: 'asc',
          parentFormat: { id: 'terms' },
        },
      };

      const result = fromTermsLensStateToAPI(input, columns);
      expect(result.includes).toEqual({
        as_regex: true,
        values: ['active', 'pending'],
      });
      expect(result.excludes).toEqual({
        as_regex: false,
        values: ['inactive'],
      });
    });

    it('should handle orderBy column type', () => {
      const input: TermsIndexPatternColumn = {
        operationType: 'terms',
        sourceField: 'status',
        customLabel: false,
        label: 'Top 5 values for status',
        isBucketed: true,
        dataType: 'string',
        params: {
          secondaryFields: [],
          size: 5,
          accuracyMode: false,
          include: [],
          includeIsRegex: false,
          exclude: [],
          excludeIsRegex: false,
          otherBucket: false,
          missingBucket: false,
          orderBy: { type: 'column', columnId: 'metricCol2' },
          orderDirection: 'desc',
          parentFormat: { id: 'terms' },
        },
      };

      const result = fromTermsLensStateToAPI(input, columns);
      expect(result.rank_by).toEqual({ type: 'metric', metric_index: 1, direction: 'desc' });
    });

    it('should handle custom label', () => {
      const input: TermsIndexPatternColumn = {
        operationType: 'terms',
        sourceField: 'status',
        customLabel: true,
        label: 'Custom Label',
        isBucketed: true,
        dataType: 'string',
        params: {
          secondaryFields: [],
          size: 5,
          accuracyMode: false,
          include: [],
          includeIsRegex: false,
          exclude: [],
          excludeIsRegex: false,
          otherBucket: false,
          missingBucket: false,
          orderBy: { type: 'alphabetical' },
          orderDirection: 'asc',
          parentFormat: { id: 'terms' },
        },
      };

      const result = fromTermsLensStateToAPI(input, columns);
      expect(result.label).toBe('Custom Label');
    });

    it('should handle custom orderBy with a basic operation', () => {
      const input: TermsIndexPatternColumn = {
        operationType: 'terms',
        sourceField: 'status',
        customLabel: false,
        label: 'Top 5 values for status',
        isBucketed: true,
        dataType: 'string',
        params: {
          size: 5,
          orderBy: { type: 'custom' },
          orderDirection: 'desc',
          orderAgg: {
            operationType: 'average',
            sourceField: 'score',
            dataType: 'number',
            isBucketed: false,
            label: '',
          },
          parentFormat: { id: 'terms' },
        },
      };

      const result = fromTermsLensStateToAPI(input, columns);
      expect(result.rank_by).toEqual({
        type: 'custom',
        operation: 'average',
        field: 'score',
        direction: 'desc',
      });
    });

    it('should handle custom orderBy with percentile operation', () => {
      const percentileOrderAgg: PercentileIndexPatternColumn = {
        operationType: 'percentile',
        sourceField: 'latency',
        dataType: 'number',
        isBucketed: false,
        label: '',
        params: { percentile: 90 },
      };
      const input: TermsIndexPatternColumn = {
        operationType: 'terms',
        sourceField: 'status',
        customLabel: false,
        label: 'Top 5 values for status',
        isBucketed: true,
        dataType: 'string',
        params: {
          size: 5,
          orderBy: { type: 'custom' },
          orderDirection: 'desc',
          orderAgg: percentileOrderAgg,
          parentFormat: { id: 'terms' },
        },
      };

      const result = fromTermsLensStateToAPI(input, columns);
      expect(result.rank_by).toEqual({
        type: 'custom',
        operation: 'percentile',
        field: 'latency',
        direction: 'desc',
        percentile: 90,
      });
    });

    it('should handle custom orderBy with percentile_rank operation', () => {
      const percentileRankOrderAgg: PercentileRanksIndexPatternColumn = {
        operationType: 'percentile_rank',
        sourceField: 'latency',
        dataType: 'number',
        isBucketed: false,
        label: '',
        params: { value: 500 },
      };
      const input: TermsIndexPatternColumn = {
        operationType: 'terms',
        sourceField: 'status',
        customLabel: false,
        label: 'Top 5 values for status',
        isBucketed: true,
        dataType: 'string',
        params: {
          size: 5,
          orderBy: { type: 'custom' },
          orderDirection: 'asc',
          orderAgg: percentileRankOrderAgg,
          parentFormat: { id: 'terms' },
        },
      };

      const result = fromTermsLensStateToAPI(input, columns);
      expect(result.rank_by).toEqual({
        type: 'custom',
        operation: 'percentile_rank',
        field: 'latency',
        direction: 'asc',
        rank: 500,
      });
    });

    it('should handle grouping other values', () => {
      const input: TermsIndexPatternColumn = {
        operationType: 'terms',
        sourceField: 'status',
        customLabel: true,
        label: 'Custom Label',
        isBucketed: true,
        dataType: 'string',
        params: {
          secondaryFields: [],
          size: 5,
          accuracyMode: false,
          include: [],
          includeIsRegex: false,
          exclude: [],
          excludeIsRegex: false,
          otherBucket: true,
          missingBucket: false,
          orderBy: { type: 'alphabetical' },
          orderDirection: 'asc',
          parentFormat: { id: 'terms' },
        },
      };

      const result = fromTermsLensStateToAPI(input, columns);
      expect(result.label).toBe('Custom Label');
      expect(result.other_bucket).toEqual({
        include_documents_without_field: false,
      });
    });
  });
});
