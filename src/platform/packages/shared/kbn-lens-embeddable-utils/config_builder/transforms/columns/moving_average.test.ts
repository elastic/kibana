/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { fromMovingAverageAPItoLensState, fromMovingAverageLensStateToAPI } from './moving_average';
import type { MovingAverageIndexPatternColumn } from '@kbn/lens-plugin/public';
import type {
  LensApiMovingAverageOperation,
  LensApiFieldMetricOperations,
} from '../../schema/metric_ops';
import { LENS_MOVING_AVERAGE_DEFAULT_WINDOW } from '../../schema/constants';

describe('Moving Average Transforms', () => {
  const testRef = {
    id: 'col1',
    field: 'sales',
    label: 'Sum of Total Sales',
  };

  const apiColumnRef: LensApiFieldMetricOperations = {
    operation: 'sum',
    field: 'sales',
    label: 'Sum of Total Sales',
  };

  describe('fromMovingAverageAPItoLensState', () => {
    it('should transform basic moving average configuration', () => {
      const input: LensApiMovingAverageOperation = {
        operation: 'moving_average',
        window: 7,
        of: apiColumnRef,
      };

      const expected: MovingAverageIndexPatternColumn = {
        operationType: 'moving_average',
        references: ['col1'],
        label: 'Moving average of Sum of Total Sales',
        customLabel: false,
        isBucketed: false,
        dataType: 'number',
        params: {
          window: 7,
        },
        reducedTimeRange: undefined,
        timeScale: undefined,
        filter: undefined,
        timeShift: undefined,
      };

      expect(fromMovingAverageAPItoLensState(input, testRef)).toEqual(expected);
    });

    it('should use default window when not provided', () => {
      const input: LensApiMovingAverageOperation = {
        operation: 'moving_average',
        of: apiColumnRef,
        window: LENS_MOVING_AVERAGE_DEFAULT_WINDOW,
      };

      const result = fromMovingAverageAPItoLensState(input, testRef);
      expect(result.params.window).toBe(LENS_MOVING_AVERAGE_DEFAULT_WINDOW);
    });

    it('should handle format configuration', () => {
      const input: LensApiMovingAverageOperation = {
        operation: 'moving_average',
        of: apiColumnRef,
        window: LENS_MOVING_AVERAGE_DEFAULT_WINDOW,
        format: {
          type: 'number',
          decimals: 2,
          compact: false,
        },
      };

      const result = fromMovingAverageAPItoLensState(input, testRef);
      expect(result.params.format).toEqual({
        id: 'number',
        params: {
          decimals: 2,
        },
      });
    });

    it('should handle custom label', () => {
      const input: LensApiMovingAverageOperation = {
        operation: 'moving_average',
        label: '7-day Average',
        of: apiColumnRef,
        window: LENS_MOVING_AVERAGE_DEFAULT_WINDOW,
      };

      const result = fromMovingAverageAPItoLensState(input, testRef);
      expect(result.label).toBe('7-day Average');
      expect(result.customLabel).toBe(true);
    });
  });

  describe('fromMovingAverageLensStateToAPI', () => {
    const referenceOp: LensApiFieldMetricOperations = {
      operation: 'sum',
      field: 'sales',
    };

    it('should transform basic moving average configuration', () => {
      const input: MovingAverageIndexPatternColumn = {
        operationType: 'moving_average',
        references: ['col1'],
        label: 'Moving average of Sum of sales',
        customLabel: false,
        isBucketed: false,
        dataType: 'number',
        params: {
          window: 7,
        },
      };

      const expected: LensApiMovingAverageOperation = {
        operation: 'moving_average',
        window: 7,
        of: referenceOp,
      };

      expect(fromMovingAverageLensStateToAPI(input, referenceOp, 'Sum of sales')).toEqual(expected);
    });

    it('should use default window when not provided', () => {
      const input: MovingAverageIndexPatternColumn = {
        operationType: 'moving_average',
        references: ['col1'],
        label: 'Moving average of Total Sales',
        customLabel: false,
        isBucketed: false,
        dataType: 'number',
        params: { window: LENS_MOVING_AVERAGE_DEFAULT_WINDOW },
      };

      const result = fromMovingAverageLensStateToAPI(input, referenceOp, 'Total Sales');
      expect(result.window).toBe(LENS_MOVING_AVERAGE_DEFAULT_WINDOW);
    });

    it('should handle format configuration', () => {
      const input: MovingAverageIndexPatternColumn = {
        operationType: 'moving_average',
        references: ['col1'],
        label: 'Moving average of Total Sales',
        customLabel: false,
        isBucketed: false,
        dataType: 'number',
        params: {
          window: 7,
          format: {
            id: 'number',
            params: {
              decimals: 2,
            },
          },
        },
      };

      const result = fromMovingAverageLensStateToAPI(input, referenceOp, 'Total Sales');
      expect(result.format).toEqual({
        type: 'number',
        compact: false,
        decimals: 2,
      });
    });
  });

  describe('ofName helper', () => {
    it('should generate correct label with name', () => {
      const input: LensApiMovingAverageOperation = {
        operation: 'moving_average',
        of: apiColumnRef,
        window: LENS_MOVING_AVERAGE_DEFAULT_WINDOW,
      };

      const ref = { ...testRef, label: 'Revenue' };
      const result = fromMovingAverageAPItoLensState(input, ref);
      expect(result.label).toBe('Moving average of Revenue');
    });

    it('should generate default label for empty name', () => {
      const input: LensApiMovingAverageOperation = {
        operation: 'moving_average',
        of: apiColumnRef,
        window: LENS_MOVING_AVERAGE_DEFAULT_WINDOW,
      };

      const ref = { ...testRef, label: '' };
      const result = fromMovingAverageAPItoLensState(input, ref);
      expect(result.label).toBe('Moving average of (incomplete)');
    });
  });
});
