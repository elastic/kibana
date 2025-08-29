/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  FiltersIndexPatternColumn,
  DateHistogramIndexPatternColumn,
  RangeIndexPatternColumn,
  TermsIndexPatternColumn,
} from '@kbn/lens-plugin/public';
import type {
  LensApiFiltersOperation,
  LensApiDateHistogramOperation,
  LensApiRangeOperation,
  LensApiTermsOperation,
} from '../../schema/bucket_ops';
import { fromBucketLensApiToLensState, fromBucketLensStateToAPI } from './buckets';
import type { AnyMetricLensStateColumn } from './types';
import type { LensApiAllMetricOperations } from '../../schema/metric_ops';
import { LENS_EMPTY_AS_NULL_DEFAULT_VALUE } from './utils';

describe('Buckets Transforms', () => {
  describe('fromBucketLensApiToLensState', () => {
    const metricColumns: { column: AnyMetricLensStateColumn; id: string }[] = [
      {
        column: {
          operationType: 'sum',
          sourceField: 'value',
          dataType: 'number',
          label: 'Sum of value',
          isBucketed: false,
        },
        id: 'metricCol1',
      },
      {
        column: {
          operationType: 'average',
          sourceField: 'score',
          dataType: 'number',
          label: 'Average of score',
          isBucketed: false,
        },
        id: 'metricCol2',
      },
    ];
    it('should transform filters API to lens state', () => {
      const input: LensApiFiltersOperation = {
        operation: 'filters',
        filters: [{ filter: { language: 'kuery', query: 'status:active' }, label: 'Active' }],
      };
      const result = fromBucketLensApiToLensState(input, metricColumns);
      expect(result.operationType).toBe('filters');
      expect(result.params.filters[0].label).toBe('Active');
    });

    it('should transform date_histogram API to lens state', () => {
      const input: LensApiDateHistogramOperation = {
        operation: 'date_histogram',
        field: '@timestamp',
        suggested_interval: '1d',
      };
      const result = fromBucketLensApiToLensState(input, metricColumns);
      expect(result.operationType).toBe('date_histogram');
      expect(result.sourceField).toBe('@timestamp');
      expect(result.params.interval).toBe('1d');
    });

    it('should transform range API to lens state', () => {
      const input: LensApiRangeOperation = {
        operation: 'range',
        field: 'price',
        ranges: [{ gt: 0, lte: 100, label: 'Low' }],
      };
      const result = fromBucketLensApiToLensState(input, metricColumns);
      expect(result.operationType).toBe('range');
      expect(result.sourceField).toBe('price');
      expect(result.params.ranges[0].label).toBe('Low');
    });

    it('should transform terms API to lens state', () => {
      const input: LensApiTermsOperation = {
        operation: 'terms',
        fields: ['status'],
        size: 5,
      };
      const result = fromBucketLensApiToLensState(input, metricColumns);
      expect(result.operationType).toBe('terms');
      expect(result.sourceField).toBe('status');
      expect(result.params.size).toBe(5);
    });

    it('should throw for unsupported operation', () => {
      expect(() =>
        fromBucketLensApiToLensState({ operation: 'unsupported', field: 'value' } as any, [])
      ).toThrowError('Unsupported bucket operation');
    });
  });

  describe('fromBucketLensStateToAPI', () => {
    const metricColumns: { column: LensApiAllMetricOperations; id: string }[] = [
      {
        column: {
          operation: 'sum',
          field: 'value',
          empty_as_null: LENS_EMPTY_AS_NULL_DEFAULT_VALUE,
        },
        id: 'metricCol1',
      },
      { column: { operation: 'average', field: 'score' }, id: 'metricCol2' },
    ];
    it('should transform filters lens state to API', () => {
      const input: FiltersIndexPatternColumn = {
        operationType: 'filters',
        label: 'Filters',
        dataType: 'string',
        isBucketed: true,
        params: {
          filters: [{ input: { language: 'kuery', query: 'status:active' }, label: 'Active' }],
        },
      };
      const result = fromBucketLensStateToAPI(input, metricColumns);
      expect(result.operation).toBe('filters');
      expect(result.filters[0].label).toBe('Active');
    });

    it('should transform date_histogram lens state to API', () => {
      const input: DateHistogramIndexPatternColumn = {
        operationType: 'date_histogram',
        sourceField: '@timestamp',
        label: '@timestamp per 1d',
        customLabel: false,
        isBucketed: true,
        dataType: 'date',
        params: {
          interval: '1d',
          includeEmptyRows: false,
          dropPartials: false,
          ignoreTimeRange: false,
        },
      };
      const result = fromBucketLensStateToAPI(input, metricColumns);
      expect(result.operation).toBe('date_histogram');
      expect(result.field).toBe('@timestamp');
      expect(result.suggested_interval).toBe('1d');
    });

    it('should transform range lens state to API', () => {
      const input: RangeIndexPatternColumn = {
        operationType: 'range',
        dataType: 'string',
        sourceField: 'price',
        customLabel: false,
        label: 'price',
        isBucketed: true,
        params: {
          type: 'range',
          maxBars: 'auto',
          ranges: [{ from: 0, to: 100, label: 'Low' }],
          format: undefined,
          parentFormat: { id: 'range', params: { template: 'arrow_right', replaceInfinity: true } },
        },
      };
      const result = fromBucketLensStateToAPI(input, metricColumns);
      expect(result.operation).toBe('range');
      expect(result.field).toBe('price');
      expect(result.ranges[0].label).toBe('Low');
    });

    it('should transform terms lens state to API', () => {
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
      const result = fromBucketLensStateToAPI(input, metricColumns);
      expect(result.operation).toBe('terms');
      expect(result.fields).toEqual(['status']);
      expect(result.size).toBe(5);
    });

    it('should throw for unsupported operation', () => {
      expect(() =>
        fromBucketLensStateToAPI({ operationType: 'unsupported', sourceField: 'value' } as any, [])
      ).toThrowError('Unsupported bucket operation');
    });
  });
});
