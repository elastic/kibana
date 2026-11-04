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
  LastValueOrderAggColumn,
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

  // Build a terms API operation from output-neutral defaults, overriding only the fields under test.
  const buildTermsApiOperation = (
    overrides: Partial<LensApiTermsOperation> = {}
  ): LensApiTermsOperation => ({
    operation: 'terms',
    fields: ['status'],
    limit: 5,
    ...overrides,
  });

  // Build a terms Lens-state column from output-neutral defaults, overriding only the fields under test.
  const buildTermsStateColumn = (
    params: Partial<TermsIndexPatternColumn['params']> = {},
    column: Omit<Partial<TermsIndexPatternColumn>, 'params'> = {}
  ): TermsIndexPatternColumn => ({
    operationType: 'terms',
    sourceField: 'status',
    customLabel: false,
    label: 'Top 5 values for status',
    isBucketed: true,
    dataType: 'string',
    ...column,
    params: {
      size: 5,
      orderBy: { type: 'alphabetical' },
      orderDirection: 'asc',
      parentFormat: { id: 'terms' },
      ...params,
    } as TermsIndexPatternColumn['params'],
  });

  describe('fromTermsLensApiToLensState', () => {
    it('should transform basic terms configuration', () => {
      const result = fromTermsLensApiToLensState(
        buildTermsApiOperation(),
        getMetricColumnIdByIndex
      );
      expect(result.operationType).toBe('terms');
      expect(result.sourceField).toBe('status');
      expect(result.params.size).toBe(5);
      expect(result.label).toBe('');
      expect(result.customLabel).toBe(false);
    });

    it('should handle secondary fields', () => {
      const result = fromTermsLensApiToLensState(
        buildTermsApiOperation({ fields: ['status', 'region'], limit: 3 }),
        getMetricColumnIdByIndex
      );
      expect(result.params.secondaryFields).toEqual(['region']);
    });

    it('should handle custom label', () => {
      const result = fromTermsLensApiToLensState(
        buildTermsApiOperation({ limit: 10, label: 'Custom Label' }),
        getMetricColumnIdByIndex
      );
      expect(result.label).toBe('Custom Label');
      expect(result.customLabel).toBe(true);
    });

    it('should handle includes and excludes', () => {
      const result = fromTermsLensApiToLensState(
        buildTermsApiOperation({
          includes: { as_regex: true, values: ['active', 'pending'] },
          excludes: { as_regex: false, values: ['inactive'] },
        }),
        getMetricColumnIdByIndex
      );
      expect(result.params.include).toEqual(['active', 'pending']);
      expect(result.params.includeIsRegex).toBe(true);
      expect(result.params.exclude).toEqual(['inactive']);
      expect(result.params.excludeIsRegex).toBe(false);
    });

    it('should preserve numeric includes and excludes verbatim', () => {
      const result = fromTermsLensApiToLensState(
        buildTermsApiOperation({
          fields: ['destination.port'],
          includes: { as_regex: false, values: [443] },
          excludes: { as_regex: false, values: [22, 23, 53] },
        }),
        getMetricColumnIdByIndex
      );
      expect(result.params.include).toEqual([443]);
      expect(result.params.exclude).toEqual([22, 23, 53]);
    });

    it('should handle orderBy column type', () => {
      const result = fromTermsLensApiToLensState(
        buildTermsApiOperation({ rank_by: { type: 'metric', metric_index: 0, direction: 'desc' } }),
        getMetricColumnIdByIndex
      );
      expect(result.params.orderBy).toEqual({ type: 'column', columnId: 'metricCol1' });
      expect(result.params.orderDirection).toBe('desc');
    });

    it('should resolve a non-zero metric_index to the correct metric column', () => {
      const result = fromTermsLensApiToLensState(
        buildTermsApiOperation({ rank_by: { type: 'metric', metric_index: 1, direction: 'asc' } }),
        getMetricColumnIdByIndex
      );
      expect(result.params.orderBy).toEqual({ type: 'column', columnId: 'metricCol2' });
      expect(result.params.orderDirection).toBe('asc');
    });

    it('should fallback to alphabetical order if metric column id is missing', () => {
      const result = fromTermsLensApiToLensState(
        buildTermsApiOperation({ rank_by: { type: 'metric', metric_index: 3, direction: 'desc' } }),
        getMetricColumnIdByIndex
      );
      expect(result.params.orderBy).toEqual({ type: 'alphabetical', fallback: true });
      expect(result.params.orderDirection).toBe('desc');
    });

    it('should handle custom rank_by with a basic operation', () => {
      const result = fromTermsLensApiToLensState(
        buildTermsApiOperation({
          rank_by: { type: 'custom', operation: 'average', field: 'score', direction: 'desc' },
        }),
        getMetricColumnIdByIndex
      );
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
      const result = fromTermsLensApiToLensState(
        buildTermsApiOperation({
          rank_by: {
            type: 'custom',
            operation: 'percentile',
            field: 'latency',
            direction: 'desc',
            percentile: 90,
          },
        }),
        getMetricColumnIdByIndex
      );
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
      const result = fromTermsLensApiToLensState(
        buildTermsApiOperation({
          rank_by: {
            type: 'custom',
            operation: 'percentile_rank',
            field: 'latency',
            direction: 'asc',
            rank: 500,
          },
        }),
        getMetricColumnIdByIndex
      );
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

    it('should handle custom rank_by with count operation without a field', () => {
      const result = fromTermsLensApiToLensState(
        buildTermsApiOperation({
          rank_by: {
            type: 'custom',
            operation: 'count',
            direction: 'desc',
          },
        }),
        getMetricColumnIdByIndex
      );
      expect(result.params.orderBy).toEqual({ type: 'custom' });
      expect(result.params.orderDirection).toBe('desc');
      expect(result.params.orderAgg).toEqual({
        operationType: 'count',
        sourceField: '___records___',
        dataType: 'number',
        isBucketed: false,
        label: '',
      });
    });

    it('should handle custom rank_by with count operation with a field', () => {
      const result = fromTermsLensApiToLensState(
        buildTermsApiOperation({
          rank_by: {
            type: 'custom',
            operation: 'count',
            field: 'bytes',
            direction: 'asc',
          },
        }),
        getMetricColumnIdByIndex
      );
      expect(result.params.orderBy).toEqual({ type: 'custom' });
      expect(result.params.orderDirection).toBe('asc');
      expect(result.params.orderAgg).toEqual({
        operationType: 'count',
        sourceField: 'bytes',
        dataType: 'number',
        isBucketed: false,
        label: '',
      });
    });

    it('should handle custom rank_by with last_value operation including a time_field', () => {
      const result = fromTermsLensApiToLensState(
        buildTermsApiOperation({
          rank_by: {
            type: 'custom',
            operation: 'last_value',
            field: 'bytes',
            direction: 'desc',
            time_field: 'timestamp',
          },
        }),
        getMetricColumnIdByIndex
      );
      expect(result.params.orderBy).toEqual({ type: 'custom' });
      expect(result.params.orderDirection).toBe('desc');
      expect(result.params.orderAgg).toEqual({
        operationType: 'last_value',
        sourceField: 'bytes',
        dataType: 'number',
        isBucketed: false,
        label: '',
        params: { sortField: 'timestamp' },
      });
    });

    it('should omit params when time_field is omitted (render falls back to the default date field)', () => {
      const result = fromTermsLensApiToLensState(
        buildTermsApiOperation({
          rank_by: {
            type: 'custom',
            operation: 'last_value',
            field: 'bytes',
            direction: 'asc',
          },
        }),
        getMetricColumnIdByIndex
      );
      expect(result.params.orderAgg).toEqual({
        operationType: 'last_value',
        sourceField: 'bytes',
        dataType: 'number',
        isBucketed: false,
        label: '',
      });
      expect(result.params.orderAgg).not.toHaveProperty('params');
    });

    it('should derive parentFormat from the number of fields', () => {
      const single = fromTermsLensApiToLensState(
        buildTermsApiOperation(),
        getMetricColumnIdByIndex
      );
      expect(single.params.parentFormat).toEqual({ id: 'terms' });

      const multi = fromTermsLensApiToLensState(
        buildTermsApiOperation({ fields: ['status', 'region'] }),
        getMetricColumnIdByIndex
      );
      expect(multi.params.parentFormat).toEqual({ id: 'multi_terms' });
    });

    it('should read a persisted format', () => {
      const result = fromTermsLensApiToLensState(
        buildTermsApiOperation({
          fields: ['bytes'],
          format: { type: 'number', decimals: 2, compact: false },
        }),
        getMetricColumnIdByIndex
      );
      expect(result.params.format).toEqual({
        id: 'number',
        params: { decimals: 2, compact: false },
      });
    });
  });

  describe('fromTermsLensStateToAPI', () => {
    it('should transform basic terms lens state to API', () => {
      const result = fromTermsLensStateToAPI(buildTermsStateColumn(), columns);
      expect(result.operation).toBe('terms');
      expect(result.fields).toEqual(['status']);
      expect(result.limit).toBe(5);
      expect(result.other_bucket).toBeUndefined();
    });

    it('should handle secondary fields', () => {
      const result = fromTermsLensStateToAPI(
        buildTermsStateColumn({ secondaryFields: ['region'] }),
        columns
      );
      expect(result.fields).toEqual(['status', 'region']);
    });

    it('should handle includes and excludes', () => {
      const result = fromTermsLensStateToAPI(
        buildTermsStateColumn({
          include: ['active', 'pending'],
          includeIsRegex: true,
          exclude: ['inactive'],
          excludeIsRegex: false,
        }),
        columns
      );
      expect(result.includes).toEqual({
        as_regex: true,
        values: ['active', 'pending'],
      });
      expect(result.excludes).toEqual({
        as_regex: false,
        values: ['inactive'],
      });
    });

    it('should emit numeric includes and excludes without stringifying them', () => {
      const result = fromTermsLensStateToAPI(
        buildTermsStateColumn(
          {
            include: [443],
            includeIsRegex: false,
            exclude: [22, 23, 53],
            excludeIsRegex: false,
          },
          {
            sourceField: 'destination.port',
            dataType: 'number',
            label: 'Top 5 values for destination.port',
          }
        ),
        columns
      );
      expect(result.includes).toEqual({ as_regex: false, values: [443] });
      expect(result.excludes).toEqual({ as_regex: false, values: [22, 23, 53] });
    });

    it('should handle orderBy column type', () => {
      const result = fromTermsLensStateToAPI(
        buildTermsStateColumn({
          orderBy: { type: 'column', columnId: 'metricCol2' },
          orderDirection: 'desc',
        }),
        columns
      );
      expect(result.rank_by).toEqual({ type: 'metric', metric_index: 1, direction: 'desc' });
    });

    it('should handle custom label', () => {
      const result = fromTermsLensStateToAPI(
        buildTermsStateColumn({}, { customLabel: true, label: 'Custom Label' }),
        columns
      );
      expect(result.label).toBe('Custom Label');
    });

    it('should handle custom orderBy with a basic operation', () => {
      const result = fromTermsLensStateToAPI(
        buildTermsStateColumn({
          orderBy: { type: 'custom' },
          orderDirection: 'desc',
          orderAgg: {
            operationType: 'average',
            sourceField: 'score',
            dataType: 'number',
            isBucketed: false,
            label: '',
          },
        }),
        columns
      );
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
      const result = fromTermsLensStateToAPI(
        buildTermsStateColumn({
          orderBy: { type: 'custom' },
          orderDirection: 'desc',
          orderAgg: percentileOrderAgg,
        }),
        columns
      );
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
      const result = fromTermsLensStateToAPI(
        buildTermsStateColumn({
          orderBy: { type: 'custom' },
          orderDirection: 'asc',
          orderAgg: percentileRankOrderAgg,
        }),
        columns
      );
      expect(result.rank_by).toEqual({
        type: 'custom',
        operation: 'percentile_rank',
        field: 'latency',
        direction: 'asc',
        rank: 500,
      });
    });

    it('should handle custom orderBy with count operation on all documents', () => {
      const result = fromTermsLensStateToAPI(
        buildTermsStateColumn({
          orderBy: { type: 'custom' },
          orderDirection: 'desc',
          orderAgg: {
            operationType: 'count',
            sourceField: '___records___',
            dataType: 'number',
            isBucketed: false,
            label: '',
          },
        }),
        columns
      );
      expect(result.rank_by).toEqual({
        type: 'custom',
        operation: 'count',
        direction: 'desc',
      });
    });

    it('should handle custom orderBy with count operation on a specific field', () => {
      const result = fromTermsLensStateToAPI(
        buildTermsStateColumn({
          orderBy: { type: 'custom' },
          orderDirection: 'asc',
          orderAgg: {
            operationType: 'count',
            sourceField: 'bytes',
            dataType: 'number',
            isBucketed: false,
            label: '',
          },
        }),
        columns
      );
      expect(result.rank_by).toEqual({
        type: 'custom',
        operation: 'count',
        field: 'bytes',
        direction: 'asc',
      });
    });

    it('should handle custom orderBy with last_value operation carrying a sortField', () => {
      const result = fromTermsLensStateToAPI(
        buildTermsStateColumn({
          orderBy: { type: 'custom' },
          orderDirection: 'desc',
          orderAgg: {
            operationType: 'last_value',
            sourceField: 'bytes',
            dataType: 'number',
            isBucketed: false,
            label: '',
            params: { sortField: 'timestamp', showArrayValues: false },
          } as LastValueOrderAggColumn,
        }),
        columns
      );
      expect(result.rank_by).toEqual({
        type: 'custom',
        operation: 'last_value',
        field: 'bytes',
        direction: 'desc',
        time_field: 'timestamp',
      });
    });

    it('should omit time_field when the last_value order-agg has no sortField', () => {
      const result = fromTermsLensStateToAPI(
        buildTermsStateColumn({
          orderBy: { type: 'custom' },
          orderDirection: 'asc',
          orderAgg: {
            operationType: 'last_value',
            sourceField: 'bytes',
            dataType: 'number',
            isBucketed: false,
            label: '',
            params: { sortField: undefined, showArrayValues: false },
          } as LastValueOrderAggColumn,
        }),
        columns
      );
      expect(result.rank_by).toEqual({
        type: 'custom',
        operation: 'last_value',
        field: 'bytes',
        direction: 'asc',
      });
      expect(result.rank_by).not.toHaveProperty('time_field');
    });

    it('should handle grouping other values', () => {
      const result = fromTermsLensStateToAPI(
        buildTermsStateColumn(
          { otherBucket: true, missingBucket: false },
          { customLabel: true, label: 'Custom Label' }
        ),
        columns
      );
      expect(result.label).toBe('Custom Label');
      expect(result.other_bucket).toEqual({
        include_documents_without_field: false,
      });
    });

    it('should emit a persisted format', () => {
      const result = fromTermsLensStateToAPI(
        buildTermsStateColumn(
          { format: { id: 'number', params: { decimals: 2 } } },
          { sourceField: 'bytes', dataType: 'number', label: '' }
        ),
        columns
      );
      expect(result.format).toEqual({ type: 'number', decimals: 2 });
    });
  });

  describe('round-trip', () => {
    it('should round-trip a multi-field terms column with a format (parentFormat multi_terms)', () => {
      const original = buildTermsStateColumn(
        {
          secondaryFields: ['geo.dest'],
          orderBy: { type: 'column', columnId: 'metricCol1' },
          orderDirection: 'desc',
          parentFormat: { id: 'multi_terms' },
          format: { id: 'number', params: { decimals: 2 } },
        },
        { sourceField: 'geo.src', label: '' }
      );

      const api = fromTermsLensStateToAPI(original, columns);
      const roundTripped = fromTermsLensApiToLensState(api, (index: number) => columns[index]?.id);

      expect(roundTripped.params.parentFormat).toEqual({ id: 'multi_terms' });
      expect(roundTripped.params.format).toEqual({ id: 'number', params: { decimals: 2 } });
    });

    it('should round-trip a custom last_value rank_by that carries a time_field', () => {
      const original = buildTermsStateColumn(
        {
          orderBy: { type: 'custom' },
          orderDirection: 'desc',
          orderAgg: {
            operationType: 'last_value',
            sourceField: 'bytes',
            dataType: 'number',
            isBucketed: false,
            label: '',
            params: { sortField: 'timestamp' },
          } as LastValueOrderAggColumn,
        },
        { label: '' }
      );

      const api = fromTermsLensStateToAPI(original, columns);
      const roundTripped = fromTermsLensApiToLensState(api, (index: number) => columns[index]?.id);

      expect((roundTripped.params.orderAgg as LastValueOrderAggColumn).params?.sortField).toBe(
        'timestamp'
      );
    });

    it('should round-trip a custom last_value rank_by without a time_field (sortField stays undefined)', () => {
      const original = buildTermsStateColumn(
        {
          orderBy: { type: 'custom' },
          orderDirection: 'asc',
          orderAgg: {
            operationType: 'last_value',
            sourceField: 'bytes',
            dataType: 'number',
            isBucketed: false,
            label: '',
            params: { sortField: undefined },
          } as LastValueOrderAggColumn,
        },
        { label: '' }
      );

      const api = fromTermsLensStateToAPI(original, columns);
      expect(api.rank_by).not.toHaveProperty('time_field');

      const roundTripped = fromTermsLensApiToLensState(api, (index: number) => columns[index]?.id);
      const orderAgg = roundTripped.params.orderAgg as LastValueOrderAggColumn;
      // Without a sort field the API omits `time_field`, so the rebuilt order-agg omits `params`.
      // Consumers tolerate the absent `params`; render falls back to the default date field.
      expect(orderAgg).not.toHaveProperty('params');
    });
  });
});
