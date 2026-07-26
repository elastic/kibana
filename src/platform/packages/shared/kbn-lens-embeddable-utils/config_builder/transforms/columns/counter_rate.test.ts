/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { fromCounterRateAPItoLensState, fromCounterRateLensStateToAPI } from './counter_rate';
import type { CounterRateIndexPatternColumn } from '@kbn/lens-common';
import type { LensApiCounterRateOperation, LensApiMetricOperation } from '../../schema/metric_ops';

describe('Counter Rate Transforms', () => {
  const columnRef: LensApiMetricOperation = {
    operation: 'max',
    field: 'bytes',
    label: 'Max of bytes',
  };
  describe('fromCounterRateAPItoLensState', () => {
    it('should transform basic counter rate configuration', () => {
      const input: LensApiCounterRateOperation = {
        operation: 'counter_rate',
        field: 'bytes',
      };

      const expected: CounterRateIndexPatternColumn = {
        customLabel: false,
        filter: undefined,
        operationType: 'counter_rate',
        label: '',
        isBucketed: false,
        dataType: 'number',
        params: {},
        references: [],
      };

      expect(fromCounterRateAPItoLensState(input)).toEqual(expected);
    });

    it('should handle format configuration', () => {
      const input: LensApiCounterRateOperation = {
        operation: 'counter_rate',
        field: 'bytes',
        format: {
          type: 'bytes',
          decimals: 2,
        },
      };

      const result = fromCounterRateAPItoLensState(input);
      expect(result.params?.format).toEqual({
        id: 'bytes',
        params: {
          decimals: 2,
        },
      });
    });

    it('should handle custom label', () => {
      const input: LensApiCounterRateOperation = {
        operation: 'counter_rate',
        field: 'bytes',
        label: 'Byte Rate',
      };

      const result = fromCounterRateAPItoLensState(input);
      expect(result.label).toBe('Byte Rate');
      expect(result.customLabel).toBe(true);
    });
  });

  describe('fromCounterRateLensStateToAPI', () => {
    const testRef = { id: 'maxId', field: 'bytes' };

    it('should transform basic counter rate configuration', () => {
      const input: CounterRateIndexPatternColumn = {
        operationType: 'counter_rate',
        label: 'Counter rate of bytes',
        isBucketed: false,
        dataType: 'number',
        params: {},
        references: [testRef.id],
      };

      const expected: LensApiCounterRateOperation = {
        operation: 'counter_rate',
        field: 'bytes',
      };

      expect(fromCounterRateLensStateToAPI(input, columnRef)).toEqual(expected);
    });

    it('should handle format configuration', () => {
      const input: CounterRateIndexPatternColumn = {
        operationType: 'counter_rate',
        label: 'Counter rate of bytes',
        isBucketed: false,
        dataType: 'number',
        references: [testRef.id],
        params: {
          format: {
            id: 'bytes',
            params: {
              decimals: 2,
            },
          },
        },
      };

      const result = fromCounterRateLensStateToAPI(input, columnRef);
      expect(result.format).toEqual({
        type: 'bytes',
        decimals: 2,
      });
    });

    it('should handle custom label', () => {
      const input: CounterRateIndexPatternColumn = {
        operationType: 'counter_rate',
        label: 'Byte Rate',
        customLabel: true,
        isBucketed: false,
        dataType: 'number',
        params: {},
        references: [testRef.id],
      };

      const result = fromCounterRateLensStateToAPI(input, columnRef);
      expect(result.label).toBe('Byte Rate');
    });
  });
});
