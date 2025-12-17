/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { fromStaticValueAPItoLensState, fromStaticValueLensStateToAPI } from './static_value';
import type { StaticValueIndexPatternColumn } from '@kbn/lens-common';
import type { LensApiStaticValueOperation } from '../../schema/metric_ops';
import { LENS_STATIC_VALUE_DEFAULT } from '../../schema/constants';

describe('Static Value Transforms', () => {
  describe('fromStaticValueAPItoLensState ', () => {
    it('should transform basic static value configuration', () => {
      const input: LensApiStaticValueOperation = {
        operation: 'static_value',
        value: 42,
      };

      const expected: StaticValueIndexPatternColumn = {
        operationType: 'static_value',
        label: '',
        customLabel: false,
        dataType: 'number',
        isBucketed: false,
        references: [],
        params: {
          value: '42',
        },
      };

      expect(fromStaticValueAPItoLensState(input)).toEqual(expected);
    });

    it('should use default value when not provided', () => {
      const input: LensApiStaticValueOperation = {
        operation: 'static_value',
        value: 100,
      };

      const result = fromStaticValueAPItoLensState(input);
      expect(result.params.value).toBe(String(LENS_STATIC_VALUE_DEFAULT));
    });

    it('should handle format configuration', () => {
      const input: LensApiStaticValueOperation = {
        operation: 'static_value',
        value: 42,
        format: {
          type: 'number',
          decimals: 2,
          compact: false,
        },
      };

      const result = fromStaticValueAPItoLensState(input);
      expect(result.params.format).toEqual({
        id: 'number',
        params: {
          decimals: 2,
          compact: false,
        },
      });
    });

    it('should handle custom label', () => {
      const input: LensApiStaticValueOperation = {
        operation: 'static_value',
        value: 42,
        label: 'Answer to Everything',
      };

      const result = fromStaticValueAPItoLensState(input);
      expect(result.label).toBe('Answer to Everything');
      expect(result.customLabel).toBe(true);
    });
  });

  describe('fromStaticValueLensStateToAPI', () => {
    it('should transform basic static value configuration', () => {
      const input: StaticValueIndexPatternColumn = {
        operationType: 'static_value',
        label: 'Static value: 42',
        customLabel: false,
        dataType: 'number',
        isBucketed: false,
        references: [],
        params: {
          value: '42',
        },
      };

      const expected: LensApiStaticValueOperation = {
        operation: 'static_value',
        value: 42,
      };

      expect(fromStaticValueLensStateToAPI(input)).toEqual(expected);
    });

    it('should handle format configuration', () => {
      const input: StaticValueIndexPatternColumn = {
        operationType: 'static_value',
        label: 'Static Value',
        customLabel: false,
        dataType: 'number',
        isBucketed: false,
        references: [],
        params: {
          value: '42',
          format: {
            id: 'number',
            params: {
              decimals: 2,
            },
          },
        },
      };

      const result = fromStaticValueLensStateToAPI(input);
      expect(result.format).toEqual({
        type: 'number',
        decimals: 2,
      });
    });
  });
});
