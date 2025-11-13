/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { fromCountAPItoLensState, fromCountLensStateToAPI } from './count';
import type { CountIndexPatternColumn } from '@kbn/lens-common';
import type { LensApiCountMetricOperation } from '../../schema/metric_ops';
import { LENS_EMPTY_AS_NULL_DEFAULT_VALUE } from './utils';

describe('Count Transforms', () => {
  describe('fromCountAPItoLensState', () => {
    it('should transform basic count configuration', () => {
      const input: LensApiCountMetricOperation = {
        operation: 'count',
        field: 'events',
        empty_as_null: LENS_EMPTY_AS_NULL_DEFAULT_VALUE,
      };

      const expected: CountIndexPatternColumn = {
        customLabel: false,
        filter: undefined,
        operationType: 'count',
        sourceField: 'events',
        label: '',
        isBucketed: false,
        dataType: 'number',
        params: {
          emptyAsNull: LENS_EMPTY_AS_NULL_DEFAULT_VALUE,
        },
      };

      expect(fromCountAPItoLensState(input)).toEqual(expected);
    });

    it('should handle empty field', () => {
      const input: LensApiCountMetricOperation = {
        operation: 'count',
        empty_as_null: LENS_EMPTY_AS_NULL_DEFAULT_VALUE,
      };

      const result = fromCountAPItoLensState(input);
      expect(result.sourceField).toBe('___records___');
    });

    it('should handle format configuration', () => {
      const input: LensApiCountMetricOperation = {
        operation: 'count',
        field: 'events',
        format: {
          type: 'number',
          decimals: 0,
          compact: false,
        },
        empty_as_null: LENS_EMPTY_AS_NULL_DEFAULT_VALUE,
      };

      const result = fromCountAPItoLensState(input);
      expect(result.params?.format).toEqual({
        id: 'number',
        params: {
          decimals: 0,
          compact: false,
        },
      });
    });

    it('should handle empty_as_null configuration', () => {
      const input: LensApiCountMetricOperation = {
        operation: 'count',
        field: 'events',
        empty_as_null: true,
      };

      const result = fromCountAPItoLensState(input);
      expect(result.params?.emptyAsNull).toBe(true);
    });

    it('should handle custom label', () => {
      const input: LensApiCountMetricOperation = {
        operation: 'count',
        field: 'events',
        label: 'Total Events',
        empty_as_null: LENS_EMPTY_AS_NULL_DEFAULT_VALUE,
      };

      const result = fromCountAPItoLensState(input);
      expect(result.label).toBe('Total Events');
    });
  });

  describe('fromCountLensStateToAPI', () => {
    it('should transform basic count configuration', () => {
      const input: CountIndexPatternColumn = {
        operationType: 'count',
        sourceField: 'events',
        label: 'Count of events',
        isBucketed: false,
        dataType: 'number',
        params: {
          emptyAsNull: LENS_EMPTY_AS_NULL_DEFAULT_VALUE,
        },
      };

      const expected: LensApiCountMetricOperation = {
        operation: 'count',
        field: 'events',
        empty_as_null: LENS_EMPTY_AS_NULL_DEFAULT_VALUE,
      };

      expect(fromCountLensStateToAPI(input)).toEqual(expected);
    });

    it('should handle format configuration', () => {
      const input: CountIndexPatternColumn = {
        operationType: 'count',
        sourceField: 'events',
        label: 'Count of events',
        isBucketed: false,
        dataType: 'number',
        params: {
          format: {
            id: 'number',
            params: {
              decimals: 0,
            },
          },
          emptyAsNull: LENS_EMPTY_AS_NULL_DEFAULT_VALUE,
        },
      };

      const result = fromCountLensStateToAPI(input);
      expect(result.format).toEqual({
        type: 'number',
        decimals: 0,
      });
    });

    it('should handle custom label', () => {
      const input: CountIndexPatternColumn = {
        operationType: 'count',
        sourceField: 'events',
        label: 'Total Events',
        customLabel: true,
        isBucketed: false,
        dataType: 'number',
        params: {
          emptyAsNull: LENS_EMPTY_AS_NULL_DEFAULT_VALUE,
        },
      };

      const result = fromCountLensStateToAPI(input);
      expect(result.label).toBe('Total Events');
    });

    it('should handle empty source field', () => {
      const input: CountIndexPatternColumn = {
        operationType: 'count',
        sourceField: '___records___',
        customLabel: true,
        label: 'Count of Records',
        isBucketed: false,
        dataType: 'number',
        params: {
          emptyAsNull: LENS_EMPTY_AS_NULL_DEFAULT_VALUE,
        },
      };

      const result = fromCountLensStateToAPI(input);
      expect(result.field).toBe(undefined);
      expect(result.label).toBe('Count of Records');
    });
  });
});
