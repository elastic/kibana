/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  fromRangeOrHistogramLensApiToLensState,
  fromRangeOrHistogramLensStateToAPI,
} from './range';
import type { RangeIndexPatternColumn } from '@kbn/lens-common';
import type { LensApiRangeOperation, LensApiHistogramOperation } from '../../schema/bucket_ops';
import {
  LENS_HISTOGRAM_EMPTY_ROWS_DEFAULT,
  LENS_HISTOGRAM_GRANULARITY_DEFAULT_VALUE,
  LENS_RANGE_DEFAULT_INTERVAL,
} from '../../schema/constants';

describe('Range Transforms', () => {
  describe('fromRangeOrHistogramLensApiToLensState', () => {
    it('should transform range operation configuration', () => {
      const input: LensApiRangeOperation = {
        operation: 'range',
        field: 'price',
        ranges: [
          { gt: 0, lte: 50, label: 'Low' },
          { gt: 50, lte: 100, label: 'Medium' },
          { gt: 100, label: 'High' },
        ],
      };

      const expected: RangeIndexPatternColumn = {
        operationType: 'range',
        dataType: 'string',
        sourceField: 'price',
        customLabel: false,
        label: '',
        isBucketed: true,
        params: {
          type: 'range',
          maxBars: 'auto',
          ranges: [
            { from: 0, to: 50, label: 'Low' },
            { from: 50, to: 100, label: 'Medium' },
            { from: 100, to: null, label: 'High' },
          ],
          format: undefined,
          parentFormat: { id: 'range', params: { template: 'arrow_right', replaceInfinity: true } },
        },
      };

      expect(fromRangeOrHistogramLensApiToLensState(input)).toEqual(expected);
    });

    it('should transform histogram operation configuration', () => {
      const input: LensApiHistogramOperation = {
        operation: 'histogram',
        field: 'price',
        granularity: 10,
        include_empty_rows: true,
      };

      const expected: RangeIndexPatternColumn = {
        operationType: 'range',
        dataType: 'number',
        sourceField: 'price',
        customLabel: false,
        label: '',
        isBucketed: true,
        params: {
          type: 'histogram',
          maxBars: 10,
          ranges: [],
          format: undefined,
          includeEmptyRows: true,
        },
      };

      expect(fromRangeOrHistogramLensApiToLensState(input)).toEqual(expected);
    });

    it('should use default values for histogram configuration', () => {
      const input: LensApiHistogramOperation = {
        operation: 'histogram',
        field: 'price',
        granularity: LENS_HISTOGRAM_GRANULARITY_DEFAULT_VALUE,
        include_empty_rows: LENS_HISTOGRAM_EMPTY_ROWS_DEFAULT,
      };

      const result = fromRangeOrHistogramLensApiToLensState(input);
      expect(result.params.maxBars).toBe(LENS_HISTOGRAM_GRANULARITY_DEFAULT_VALUE);
      expect(result.params.includeEmptyRows).toBe(LENS_HISTOGRAM_EMPTY_ROWS_DEFAULT);
    });
  });

  describe('fromRangeOrHistogramLensStateToAPI', () => {
    it('should transform range configuration', () => {
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
          ranges: [
            { from: 0, to: 50, label: 'Low' },
            { from: 50, to: 100, label: 'Medium' },
            { from: 100, to: null, label: 'High' },
          ],
          format: { id: 'number', params: { decimals: 2, compact: false } },
        },
      };

      const expected: LensApiRangeOperation = {
        operation: 'range',
        field: 'price',
        ranges: [
          { gt: 0, lte: 50, label: 'Low' },
          { gt: 50, lte: 100, label: 'Medium' },
          { gt: 100, label: 'High' },
        ],
        format: { type: 'number', decimals: 2, compact: false },
      };

      expect(fromRangeOrHistogramLensStateToAPI(input)).toEqual(expected);
    });

    it('should transform histogram configuration', () => {
      const input: RangeIndexPatternColumn = {
        operationType: 'range',
        dataType: 'number',
        sourceField: 'price',
        customLabel: false,
        label: 'price',
        isBucketed: true,
        params: {
          type: 'histogram',
          maxBars: 10,
          ranges: [],
          format: { id: 'number', params: { decimals: 0, compact: false } },
          includeEmptyRows: true,
        },
      };

      const expected: LensApiHistogramOperation = {
        operation: 'histogram',
        field: 'price',
        granularity: 10,
        include_empty_rows: true,
        format: { type: 'number', decimals: 0, compact: false },
      };

      expect(fromRangeOrHistogramLensStateToAPI(input)).toEqual(expected);
    });

    it(`should persist a max-slider maxBars value (1000) without clamping to "auto"`, () => {
      const input: RangeIndexPatternColumn = {
        operationType: 'range',
        dataType: 'number',
        sourceField: 'price',
        customLabel: false,
        label: 'price',
        isBucketed: true,
        params: {
          type: 'histogram',
          maxBars: 1000,
          ranges: [],
          includeEmptyRows: false,
        },
      };

      expect(fromRangeOrHistogramLensStateToAPI(input)).toEqual({
        operation: 'histogram',
        field: 'price',
        granularity: 1000,
        include_empty_rows: false,
      });
    });

    it(`should pass a fractional maxBars through verbatim`, () => {
      // The Lens editor persists a fractional default of `(histogram:maxBars - 1) / 2` (499.5 for
      // the default ceiling of 1000). The out-transform must not round or reject it, otherwise the
      // round-trip mutates the stored bar target.
      const input: RangeIndexPatternColumn = {
        operationType: 'range',
        dataType: 'number',
        sourceField: 'price',
        customLabel: false,
        label: 'price',
        isBucketed: true,
        params: {
          type: 'histogram',
          maxBars: 499.5,
          ranges: [],
          includeEmptyRows: false,
        },
      };

      expect(fromRangeOrHistogramLensStateToAPI(input)).toEqual({
        operation: 'histogram',
        field: 'price',
        granularity: 499.5,
        include_empty_rows: false,
      });
    });

    it(`should pass "auto" maxBars through as "auto" granularity`, () => {
      const input: RangeIndexPatternColumn = {
        operationType: 'range',
        dataType: 'number',
        sourceField: 'price',
        customLabel: false,
        label: 'price',
        isBucketed: true,
        params: {
          type: 'histogram',
          maxBars: LENS_HISTOGRAM_GRANULARITY_DEFAULT_VALUE,
          ranges: [],
          includeEmptyRows: true,
        },
      };

      expect(fromRangeOrHistogramLensStateToAPI(input)).toEqual({
        operation: 'histogram',
        field: 'price',
        granularity: LENS_HISTOGRAM_GRANULARITY_DEFAULT_VALUE,
        include_empty_rows: true,
      });
    });

    it('should handle custom labels', () => {
      const input: RangeIndexPatternColumn = {
        operationType: 'range',
        dataType: 'string',
        sourceField: 'price',
        customLabel: true,
        label: 'Price Ranges',
        isBucketed: true,
        params: {
          type: 'range',
          maxBars: 'auto',
          ranges: [{ from: 0, to: LENS_RANGE_DEFAULT_INTERVAL, label: '' }],
        },
      };

      const result = fromRangeOrHistogramLensStateToAPI(input);
      expect(result.label).toBe('Price Ranges');
    });
  });
});
