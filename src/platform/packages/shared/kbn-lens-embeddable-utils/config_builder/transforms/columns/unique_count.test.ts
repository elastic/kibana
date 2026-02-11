/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { fromUniqueCountAPItoLensState, fromUniqueCountLensStateToAPI } from './unique_count';
import type { CardinalityIndexPatternColumn } from '@kbn/lens-common';
import type { LensApiUniqueCountMetricOperation } from '../../schema/metric_ops';
import { LENS_EMPTY_AS_NULL_DEFAULT_VALUE } from './utils';

describe('Unique Count Transforms', () => {
  describe('fromUniqueCountAPItoLensState', () => {
    it('should transform basic unique count configuration', () => {
      const input: LensApiUniqueCountMetricOperation = {
        operation: 'unique_count',
        field: 'user_id',
        empty_as_null: LENS_EMPTY_AS_NULL_DEFAULT_VALUE,
      };

      const expected: CardinalityIndexPatternColumn = {
        customLabel: false,
        filter: undefined,
        operationType: 'unique_count',
        sourceField: 'user_id',
        label: '',
        isBucketed: false,
        dataType: 'number',
        params: {
          emptyAsNull: LENS_EMPTY_AS_NULL_DEFAULT_VALUE,
          format: undefined,
        },
        reducedTimeRange: undefined,
        timeScale: undefined,
        timeShift: undefined,
      };

      expect(fromUniqueCountAPItoLensState(input)).toEqual(expected);
    });

    it('should handle format configuration', () => {
      const input: LensApiUniqueCountMetricOperation = {
        operation: 'unique_count',
        field: 'user_id',
        format: {
          type: 'number',
          decimals: 2,
          compact: false,
        },
        empty_as_null: LENS_EMPTY_AS_NULL_DEFAULT_VALUE,
      };

      const result = fromUniqueCountAPItoLensState(input);

      expect(result.params?.format).toEqual({
        id: 'number',
        params: {
          decimals: 2,
          compact: false,
        },
      });
    });

    it('should handle empty_as_null configuration', () => {
      const input: LensApiUniqueCountMetricOperation = {
        operation: 'unique_count',
        field: 'user_id',
        empty_as_null: true,
      };

      const result = fromUniqueCountAPItoLensState(input);

      expect(result.params?.emptyAsNull).toBe(true);
    });

    it('should handle custom label', () => {
      const input: LensApiUniqueCountMetricOperation = {
        operation: 'unique_count',
        field: 'user_id',
        label: 'Active Users',
        empty_as_null: LENS_EMPTY_AS_NULL_DEFAULT_VALUE,
      };

      const result = fromUniqueCountAPItoLensState(input);

      expect(result.label).toBe('Active Users');
    });
  });

  describe('fromUniqueCountLensStateToAPI', () => {
    it('should transform basic unique count configuration', () => {
      const input: CardinalityIndexPatternColumn = {
        operationType: 'unique_count',
        sourceField: 'user_id',
        label: 'Unique Count of user_id',
        isBucketed: false,
        dataType: 'number',
        params: {
          emptyAsNull: LENS_EMPTY_AS_NULL_DEFAULT_VALUE,
        },
      };

      const expected: LensApiUniqueCountMetricOperation = {
        operation: 'unique_count',
        field: 'user_id',
        empty_as_null: LENS_EMPTY_AS_NULL_DEFAULT_VALUE,
      };

      expect(fromUniqueCountLensStateToAPI(input)).toEqual(expected);
    });

    it('should handle format configuration', () => {
      const input: CardinalityIndexPatternColumn = {
        operationType: 'unique_count',
        sourceField: 'user_id',
        label: 'Unique Count of user_id',
        isBucketed: false,
        dataType: 'number',
        params: {
          format: {
            id: 'number',
            params: {
              decimals: 2,
            },
          },
          emptyAsNull: LENS_EMPTY_AS_NULL_DEFAULT_VALUE,
        },
      };

      const result = fromUniqueCountLensStateToAPI(input);

      expect(result.format).toEqual({
        type: 'number',
        decimals: 2,
      });
    });

    it('should handle emptyAsNull configuration', () => {
      const input: CardinalityIndexPatternColumn = {
        operationType: 'unique_count',
        sourceField: 'user_id',
        label: 'Unique Count of user_id',
        isBucketed: false,
        dataType: 'number',
        params: {
          emptyAsNull: true,
        },
      };

      const result = fromUniqueCountLensStateToAPI(input);

      expect(result.empty_as_null).toBe(true);
    });

    it('should handle custom label', () => {
      const input: CardinalityIndexPatternColumn = {
        operationType: 'unique_count',
        sourceField: 'user_id',
        label: 'Active Users',
        customLabel: true,
        isBucketed: false,
        dataType: 'number',
        params: {
          emptyAsNull: LENS_EMPTY_AS_NULL_DEFAULT_VALUE,
        },
      };

      const result = fromUniqueCountLensStateToAPI(input);

      expect(result.label).toBe('Active Users');
    });
  });
});
