/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { fromLastValueAPItoLensState, fromLastValueLensStateToAPI } from './last_value';
import type { LastValueIndexPatternColumn } from '@kbn/lens-common';
import type { LensApiLastValueOperation } from '../../schema/metric_ops';
import { LENS_LAST_VALUE_DEFAULT_SHOW_ARRAY_VALUES } from '../../schema/constants';

describe('Last Value Transforms', () => {
  describe('fromLastValueAPItoLensState', () => {
    it('should transform basic last value configuration', () => {
      const input: LensApiLastValueOperation = {
        operation: 'last_value',
        field: 'status',
        sort_by: '@timestamp',
        show_array_values: false,
      };

      const expected: LastValueIndexPatternColumn = {
        operationType: 'last_value',
        sourceField: 'status',
        label: '',
        isBucketed: false,
        dataType: 'number',
        params: {
          sortField: '@timestamp',
          showArrayValues: LENS_LAST_VALUE_DEFAULT_SHOW_ARRAY_VALUES,
        },
        customLabel: false,
        filter: undefined,
      };

      expect(fromLastValueAPItoLensState(input)).toEqual(expected);
    });

    it('should handle format configuration', () => {
      const input: LensApiLastValueOperation = {
        operation: 'last_value',
        field: 'price',
        sort_by: '@timestamp',
        show_array_values: true,
        format: {
          type: 'number',
          decimals: 2,
          compact: false,
        },
      };

      const result = fromLastValueAPItoLensState(input);
      expect(result.params.format).toEqual({
        id: 'number',
        params: {
          decimals: 2,
          compact: false,
        },
      });
    });

    it('should handle sort_by configuration', () => {
      const input: LensApiLastValueOperation = {
        operation: 'last_value',
        field: 'status',
        sort_by: 'timestamp',
        show_array_values: true,
      };

      const result = fromLastValueAPItoLensState(input);
      expect(result.params.sortField).toBe('timestamp');
    });

    it('should handle show_array_values configuration', () => {
      const input: LensApiLastValueOperation = {
        operation: 'last_value',
        field: 'tags',
        sort_by: '@timestamp',
        show_array_values: true,
      };

      const result = fromLastValueAPItoLensState(input);
      expect(result.params.showArrayValues).toBe(true);
    });
  });

  describe('fromLastValueLensStateToAPI', () => {
    it('should transform basic last value configuration', () => {
      const input: LastValueIndexPatternColumn = {
        operationType: 'last_value',
        sourceField: 'status',
        label: 'Last value of status',
        isBucketed: false,
        dataType: 'string',
        params: {
          sortField: '@timestamp',
          showArrayValues: LENS_LAST_VALUE_DEFAULT_SHOW_ARRAY_VALUES,
        },
      };

      const expected: LensApiLastValueOperation = {
        operation: 'last_value',
        field: 'status',
        sort_by: '@timestamp',
        show_array_values: false,
      };

      expect(fromLastValueLensStateToAPI(input)).toEqual(expected);
    });

    it('should handle format configuration', () => {
      const input: LastValueIndexPatternColumn = {
        operationType: 'last_value',
        sourceField: 'price',
        label: 'Last value of price',
        isBucketed: false,
        dataType: 'number',
        params: {
          sortField: '@timestamp',
          format: {
            id: 'number',
            params: {
              decimals: 2,
            },
          },
          showArrayValues: LENS_LAST_VALUE_DEFAULT_SHOW_ARRAY_VALUES,
        },
      };

      const result = fromLastValueLensStateToAPI(input);
      expect(result.format).toEqual({
        type: 'number',
        decimals: 2,
      });
    });

    it('should handle sort field configuration', () => {
      const input: LastValueIndexPatternColumn = {
        operationType: 'last_value',
        sourceField: 'status',
        label: 'Last value of status',
        isBucketed: false,
        dataType: 'string',
        params: {
          sortField: 'timestamp',
          showArrayValues: LENS_LAST_VALUE_DEFAULT_SHOW_ARRAY_VALUES,
        },
      };

      const result = fromLastValueLensStateToAPI(input);
      expect(result.sort_by).toBe('timestamp');
    });

    it('should handle show array values configuration', () => {
      const input: LastValueIndexPatternColumn = {
        operationType: 'last_value',
        sourceField: 'tags',
        label: 'Last value of tags',
        isBucketed: false,
        dataType: 'string',
        params: {
          sortField: '@timestamp',
          showArrayValues: true,
        },
      };

      const result = fromLastValueLensStateToAPI(input);
      expect(result.show_array_values).toBe(true);
    });
  });
});
