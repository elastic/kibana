/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  fromBasicMetricAPItoLensState,
  fromBasicMetricLensStateToAPI,
  fromSumMetricAPIToLensState,
  fromSumMetricLensStateToAPI,
} from './max_min_avg_sum';
import type { AvgIndexPatternColumn, SumIndexPatternColumn } from '@kbn/lens-common';
import type { LensApiMetricOperation, LensApiSumMetricOperation } from '../../schema/metric_ops';
import { LENS_EMPTY_AS_NULL_DEFAULT_VALUE } from './utils';

describe('Max, Min, Avg, Median, Standard Deviation, Sum Transforms', () => {
  describe('fromBasicMetricAPItoLensState', () => {
    const basicMetricTypes = [
      { operation: 'min' as const, label: 'Minimum of' },
      { operation: 'max' as const, label: 'Maximum of' },
      { operation: 'average' as const, label: 'Average of' },
      { operation: 'median' as const, label: 'Median of' },
      { operation: 'standard_deviation' as const, label: 'Standard Deviation of' },
    ];

    test.each(basicMetricTypes)(
      'should transform $operation metric configuration',
      ({ operation, label }) => {
        const input: LensApiMetricOperation = {
          operation,
          field: 'price',
        };

        const result = fromBasicMetricAPItoLensState(input);
        expect(result).toEqual({
          customLabel: false,
          operationType: operation,
          sourceField: 'price',
          label: '',
          isBucketed: false,
          dataType: 'number',
        });
      }
    );

    it('should handle format configuration', () => {
      const input: LensApiMetricOperation = {
        operation: 'average',
        field: 'price',
        format: {
          type: 'number',
          decimals: 2,
          compact: false,
        },
      };

      const result = fromBasicMetricAPItoLensState(input);
      expect(result.params?.format).toEqual({
        id: 'number',
        params: {
          decimals: 2,
          compact: false,
        },
      });
    });

    it('should handle custom label', () => {
      const input: LensApiMetricOperation = {
        operation: 'max',
        field: 'price',
        label: 'Highest Price',
      };

      const result = fromBasicMetricAPItoLensState(input);
      expect(result.label).toBe('Highest Price');
    });
  });

  describe('fromBasicMetricLensStateToAPI', () => {
    const columnTypes = [
      { type: 'min' as const, label: 'Minimum of price' },
      { type: 'max' as const, label: 'Maximum of price' },
      { type: 'average' as const, label: 'Average of price' },
      { type: 'median' as const, label: 'Median of price' },
      { type: 'standard_deviation' as const, label: 'Standard Deviation of price' },
    ];

    test.each(columnTypes)('should transform $type column configuration', ({ type, label }) => {
      const input = {
        operationType: type,
        sourceField: 'price',
        label,
        isBucketed: false,
        dataType: 'number',
        params: {},
      };

      const result = fromBasicMetricLensStateToAPI(input as any);
      expect(result).toEqual({
        operation: type,
        field: 'price',
      });
    });

    it('should handle format configuration', () => {
      const input: AvgIndexPatternColumn = {
        operationType: 'average',
        sourceField: 'price',
        label: 'Average of price',
        isBucketed: false,
        dataType: 'number',
        params: {
          format: {
            id: 'number',
            params: {
              decimals: 2,
            },
          },
        },
      };

      const result = fromBasicMetricLensStateToAPI(input);
      expect(result.format).toEqual({
        type: 'number',
        decimals: 2,
      });
    });
  });

  describe('Sum Metric Transforms', () => {
    describe('fromSumMetricAPIToLensState', () => {
      it('should transform sum metric configuration', () => {
        const input: LensApiSumMetricOperation = {
          operation: 'sum',
          field: 'revenue',
          empty_as_null: LENS_EMPTY_AS_NULL_DEFAULT_VALUE,
        };

        const expected: SumIndexPatternColumn = {
          customLabel: false,
          filter: undefined,
          operationType: 'sum',
          sourceField: 'revenue',
          label: '',
          isBucketed: false,
          dataType: 'number',
          params: {
            emptyAsNull: LENS_EMPTY_AS_NULL_DEFAULT_VALUE,
          },
        };

        expect(fromSumMetricAPIToLensState(input)).toEqual(expected);
      });

      it('should handle format and custom label', () => {
        const input: LensApiSumMetricOperation = {
          operation: 'sum',
          field: 'revenue',
          format: { type: 'percent', decimals: 5, compact: false },
          label: 'Total Revenue',
          empty_as_null: LENS_EMPTY_AS_NULL_DEFAULT_VALUE,
        };

        const result = fromSumMetricAPIToLensState(input);
        expect(result.params?.format).toEqual({
          id: 'percent',
          params: { decimals: 5, compact: false },
        });
        expect(result.label).toBe('Total Revenue');
      });
    });

    describe('fromSumMetricLensStateToAPI', () => {
      it('should transform sum metric configuration', () => {
        const input: SumIndexPatternColumn = {
          operationType: 'sum',
          sourceField: 'revenue',
          label: 'Sum of revenue',
          isBucketed: false,
          dataType: 'number',
          params: {},
        };

        const expected: LensApiSumMetricOperation = {
          operation: 'sum',
          field: 'revenue',
          empty_as_null: LENS_EMPTY_AS_NULL_DEFAULT_VALUE,
        };

        expect(fromSumMetricLensStateToAPI(input)).toEqual(expected);
      });
    });
  });
});
