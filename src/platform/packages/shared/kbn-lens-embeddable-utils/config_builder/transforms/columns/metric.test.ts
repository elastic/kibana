/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { fromMetricAPItoLensState, getMetricApiColumnFromLensState } from './metric';
import type {
  MovingAverageIndexPatternColumn,
  AvgIndexPatternColumn,
  DerivativeIndexPatternColumn,
  CumulativeSumIndexPatternColumn,
  CounterRateIndexPatternColumn,
} from '@kbn/lens-plugin/public';
import type { LensApiMetricOperation } from '../../schema/metric_ops';
import {
  type LensApiMovingAverageOperation,
  type LensApiCumulativeSumOperation,
  type LensApiCountMetricOperation,
  type LensApiUniqueCountMetricOperation,
  type LensApiFormulaOperation,
} from '../../schema/metric_ops';
import {
  LENS_EMPTY_AS_NULL_DEFAULT_VALUE,
  isAPIColumnOfType,
  isApiColumnOfReferableType,
} from './utils';

describe('Metric Transforms', () => {
  describe('Type Guards', () => {
    describe('isAPIColumnOfType', () => {
      it('should identify correct operation types', () => {
        const countOperation = {
          operation: 'count' as const,
          empty_as_null: LENS_EMPTY_AS_NULL_DEFAULT_VALUE,
        };
        const sumOperation = {
          operation: 'sum' as const,
          field: 'sales',
          empty_as_null: LENS_EMPTY_AS_NULL_DEFAULT_VALUE,
        };

        expect(isAPIColumnOfType('count', countOperation)).toBe(true);
        expect(isAPIColumnOfType('sum', countOperation)).toBe(false);
        expect(isAPIColumnOfType('sum', sumOperation)).toBe(true);
      });
    });

    describe('isApiColumnOfReferableType', () => {
      it('should identify referable operations', () => {
        const referableOps = [
          {
            operation: 'sum' as const,
            field: 'sales',
            empty_as_null: LENS_EMPTY_AS_NULL_DEFAULT_VALUE,
          },
          { operation: 'count' as const, empty_as_null: LENS_EMPTY_AS_NULL_DEFAULT_VALUE },
          { operation: 'average' as const, field: 'sales' },
        ];

        const nonReferableOps: [LensApiFormulaOperation, LensApiMovingAverageOperation] = [
          { operation: 'formula' as const, formula: 'sales * 2' },
          {
            operation: 'moving_average' as const,
            of: {
              operation: 'sum' as const,
              field: 'sales',
              empty_as_null: LENS_EMPTY_AS_NULL_DEFAULT_VALUE,
            },
            window: 7,
          },
        ];

        referableOps.forEach((op) => {
          expect(isApiColumnOfReferableType(op)).toBe(true);
        });

        nonReferableOps.forEach((op) => {
          expect(isApiColumnOfReferableType(op)).toBe(false);
        });
      });
    });
  });

  describe('fromMetricAPItoLensState', () => {
    describe('Basic Metrics', () => {
      it('should transform count operation', () => {
        const input: LensApiCountMetricOperation = {
          operation: 'count',
          empty_as_null: LENS_EMPTY_AS_NULL_DEFAULT_VALUE,
        };

        const [result] = fromMetricAPItoLensState(input);
        expect(result.operationType).toBe('count');
      });

      it('should transform unique count operation', () => {
        const input: LensApiUniqueCountMetricOperation = {
          operation: 'unique_count',
          field: 'user_id',
          empty_as_null: LENS_EMPTY_AS_NULL_DEFAULT_VALUE,
        };

        const [result] = fromMetricAPItoLensState(input);
        expect(result.operationType).toBe('unique_count');
        expect(result.sourceField).toBe('user_id');
      });

      it('should transform basic metric operations', () => {
        const operations = ['average', 'min', 'max', 'median', 'standard_deviation'] as const;

        operations.forEach((op) => {
          const input = {
            operation: op,
            field: 'value',
          };

          const result = fromMetricAPItoLensState(input);
          expect(result).toHaveLength(1);
          expect(result[0].operationType).toBe(op);
          expect(result[0].sourceField).toBe('value');
        });
      });
    });

    describe('Complex Metrics', () => {
      it('should transform moving average with reference', () => {
        const input: LensApiMovingAverageOperation = {
          operation: 'moving_average',
          window: 7,
          of: {
            operation: 'average',
            field: 'value',
          },
        };

        const result = fromMetricAPItoLensState(input);
        expect(result).toHaveLength(2);
        expect(result[0].operationType).toBe('moving_average');
        expect(result[1].operationType).toBe('average');
      });

      it('should transform cumulative sum with reference', () => {
        const input: LensApiCumulativeSumOperation = {
          operation: 'cumulative_sum',
          field: 'value',
        };

        const result = fromMetricAPItoLensState(input);
        expect(result).toHaveLength(2);
        expect(result[0].operationType).toBe('cumulative_sum');
        expect(result[1].operationType).toBe('sum');
      });
    });

    it('should throw error for unsupported operation', () => {
      const input = {
        operation: 'unsupported' as any,
      };

      // @ts-expect-error
      expect(() => fromMetricAPItoLensState(input)).toThrow('Unsupported metric operation');
    });
  });

  describe('getMetricApiColumnFromLensState', () => {
    const columns: { col1: AvgIndexPatternColumn; col2: MovingAverageIndexPatternColumn } = {
      col1: {
        operationType: 'average',
        sourceField: 'value',
        label: 'Average Value',
        customLabel: false,
        dataType: 'number',
        isBucketed: false,
      },
      col2: {
        operationType: 'moving_average',
        references: ['col1'],
        label: 'Moving Average',
        customLabel: false,
        dataType: 'number',
        isBucketed: false,
        params: {
          window: 7,
        },
      },
    };

    it('should reverse transform basic metric', () => {
      const result = getMetricApiColumnFromLensState(columns.col1, columns);
      if (!isAPIColumnOfType<LensApiMetricOperation>('average', result)) {
        fail();
      }
      expect(result?.operation).toBe('average');
      expect(result?.field).toBe('value');
    });

    it('should reverse transform moving average with reference', () => {
      const result = getMetricApiColumnFromLensState(columns.col2, columns);
      if (!isAPIColumnOfType<LensApiMovingAverageOperation>('moving_average', result)) {
        fail();
      }
      expect(result?.operation).toBe('moving_average');
      expect(result?.of?.operation).toBe('average');
    });

    it('should return undefined for invalid reference', () => {
      const invalidColumns: [
        { col1: MovingAverageIndexPatternColumn },
        { col1: DerivativeIndexPatternColumn },
        { col1: CumulativeSumIndexPatternColumn },
        { col1: CounterRateIndexPatternColumn }
      ] = [
        {
          col1: {
            operationType: 'moving_average',
            references: ['invalid'],
            label: 'Invalid Reference',
            customLabel: false,
            dataType: 'number',
            isBucketed: false,
            params: {
              window: 7,
            },
          },
        },
        {
          col1: {
            operationType: 'differences',
            references: ['invalid'],
            label: 'Invalid Reference',
            customLabel: false,
            dataType: 'number',
            isBucketed: false,
          },
        },
        {
          col1: {
            operationType: 'cumulative_sum',
            references: ['invalid'],
            label: 'Invalid Reference',
            customLabel: false,
            dataType: 'number',
            isBucketed: false,
          },
        },
        {
          col1: {
            operationType: 'counter_rate',
            references: ['invalid'],
            label: 'Invalid Reference',
            customLabel: false,
            dataType: 'number',
            isBucketed: false,
          },
        },
      ] as const;

      for (const columnsConfig of invalidColumns) {
        // @ts-ignore
        expect(() => getMetricApiColumnFromLensState(columnsConfig.col1, columnsConfig)).toThrow(
          `Missing referenced metric operation for ${columnsConfig.col1.operationType}`
        );
      }
    });
  });
});
