/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { fromPercentileAPItoLensState, fromPercentileLensStateToAPI } from './percentile';
import type { PercentileIndexPatternColumn } from '@kbn/lens-common';
import type { LensApiPercentileOperation } from '../../schema/metric_ops';
import { LENS_PERCENTILE_DEFAULT_VALUE } from '../../schema/constants';

describe('Percentile Transforms', () => {
  describe('fromPercentileAPItoLensState', () => {
    it('should transform basic percentile configuration', () => {
      const input: LensApiPercentileOperation = {
        operation: 'percentile',
        field: 'response_time',
        percentile: LENS_PERCENTILE_DEFAULT_VALUE,
      };

      const expected: PercentileIndexPatternColumn = {
        customLabel: false,
        filter: undefined,
        operationType: 'percentile',
        sourceField: 'response_time',
        label: '',
        isBucketed: false,
        dataType: 'number',
        params: {
          percentile: LENS_PERCENTILE_DEFAULT_VALUE,
        },
      };

      expect(fromPercentileAPItoLensState(input)).toEqual(expected);
    });

    it('should use default percentile when not provided', () => {
      const input: LensApiPercentileOperation = {
        operation: 'percentile',
        field: 'response_time',
        percentile: LENS_PERCENTILE_DEFAULT_VALUE,
      };

      const result = fromPercentileAPItoLensState(input);
      expect(result.params.percentile).toBe(LENS_PERCENTILE_DEFAULT_VALUE);
    });

    it('should handle format configuration', () => {
      const input: LensApiPercentileOperation = {
        operation: 'percentile',
        field: 'response_time',
        percentile: LENS_PERCENTILE_DEFAULT_VALUE,
        format: {
          type: 'number',
          decimals: 2,
          compact: false,
        },
      };

      const result = fromPercentileAPItoLensState(input);
      expect(result.params.format).toEqual({
        id: 'number',
        params: {
          decimals: 2,
          compact: false,
        },
      });
    });

    it('should handle custom label', () => {
      const input: LensApiPercentileOperation = {
        operation: 'percentile',
        field: 'response_time',
        percentile: LENS_PERCENTILE_DEFAULT_VALUE,
        label: 'P95 Response Time',
      };

      const result = fromPercentileAPItoLensState(input);
      expect(result.label).toBe('P95 Response Time');
    });
  });

  describe('fromPercentileLensStateToAPI', () => {
    it('should transform basic percentile configuration', () => {
      const input: PercentileIndexPatternColumn = {
        operationType: 'percentile',
        sourceField: 'response_time',
        label: '90th Percentile of response_time',
        isBucketed: false,
        dataType: 'number',
        params: {
          percentile: 90,
        },
      };

      const expected: LensApiPercentileOperation = {
        operation: 'percentile',
        field: 'response_time',
        percentile: 90,
      };

      expect(fromPercentileLensStateToAPI(input)).toEqual(expected);
    });

    it('should transform omit default percentile value', () => {
      const input: PercentileIndexPatternColumn = {
        operationType: 'percentile',
        sourceField: 'response_time',
        label: '95th Percentile of response_time',
        isBucketed: false,
        dataType: 'number',
        params: {
          percentile: LENS_PERCENTILE_DEFAULT_VALUE,
        },
      };

      const expected: LensApiPercentileOperation = {
        operation: 'percentile',
        field: 'response_time',
        percentile: LENS_PERCENTILE_DEFAULT_VALUE,
      };

      expect(fromPercentileLensStateToAPI(input)).toEqual(expected);
    });

    it('should handle format configuration', () => {
      const input: PercentileIndexPatternColumn = {
        operationType: 'percentile',
        sourceField: 'response_time',
        label: '95th Percentile of response_time',
        isBucketed: false,
        dataType: 'number',
        params: {
          percentile: LENS_PERCENTILE_DEFAULT_VALUE,
          format: {
            id: 'number',
            params: {
              decimals: 2,
            },
          },
        },
      };

      const result = fromPercentileLensStateToAPI(input);
      expect(result.format).toEqual({
        type: 'number',
        decimals: 2,
      });
    });

    it('should handle custom label', () => {
      const input: PercentileIndexPatternColumn = {
        operationType: 'percentile',
        sourceField: 'response_time',
        label: 'P95 Response Time',
        isBucketed: false,
        customLabel: true,
        dataType: 'number',
        params: {
          percentile: LENS_PERCENTILE_DEFAULT_VALUE,
        },
      };

      const result = fromPercentileLensStateToAPI(input);
      expect(result.label).toBe('P95 Response Time');
    });
  });
});
