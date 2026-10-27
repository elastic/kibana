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
import type { RangeIndexPatternColumn, RangeTypeLens } from '@kbn/lens-common';
import type { LensApiRangeOperation, LensApiHistogramOperation } from '../../schema/bucket_ops';
import {
  LENS_HISTOGRAM_EMPTY_ROWS_DEFAULT,
  LENS_HISTOGRAM_GRANULARITY_DEFAULT_VALUE,
  LENS_RANGE_DEFAULT_INTERVAL,
} from '../../schema/constants';

type ApiRange = LensApiRangeOperation['ranges'][number];

const getRangeStateColumn = (ranges: RangeTypeLens[]): RangeIndexPatternColumn => ({
  operationType: 'range',
  dataType: 'string',
  sourceField: 'price',
  customLabel: false,
  label: 'price',
  isBucketed: true,
  params: { type: 'range', maxBars: 'auto', ranges },
});

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

    describe('unbounded ranges', () => {
      const getStateRanges = (ranges: ApiRange[]) =>
        fromRangeOrHistogramLensApiToLensState({ operation: 'range', field: 'price', ranges })
          .params.ranges;

      it.each<[string, ApiRange, RangeTypeLens]>([
        ['no bounds', {}, { from: null, to: null, label: '' }],
        ['no bounds with a label', { label: 'All' }, { from: null, to: null, label: 'All' }],
        ['no upper bound', { gt: 1000 }, { from: 1000, to: null, label: '' }],
        ['no lower bound', { lte: 0 }, { from: null, to: 0, label: '' }],
        ['a 0 lower bound and no upper bound', { gt: 0 }, { from: 0, to: null, label: '' }],
        ['0 on both sides', { gt: 0, lte: 0 }, { from: 0, to: 0, label: '' }],
      ])('should store a range with %s', (_, range, expected) => {
        expect(getStateRanges([range])).toEqual([expected]);
      });

      it('should keep an unbounded range at its position in the list', () => {
        expect(getStateRanges([{ gt: 0, lte: 1000 }, { label: 'All' }, { gt: 1000 }])).toEqual([
          { from: 0, to: 1000, label: '' },
          { from: null, to: null, label: 'All' },
          { from: 1000, to: null, label: '' },
        ]);
      });
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

    describe('unbounded ranges', () => {
      const getApiRanges = (ranges: RangeTypeLens[]) => {
        const result = fromRangeOrHistogramLensStateToAPI(getRangeStateColumn(ranges));
        return result.operation === 'range' ? result.ranges : undefined;
      };

      it.each<[string, RangeTypeLens, ApiRange]>([
        ['null on both sides', { from: null, to: null, label: '' }, { label: '' }],
        [
          'null on both sides with a label',
          { from: null, to: null, label: 'All' },
          { label: 'All' },
        ],
        ['infinite on both sides', { from: -Infinity, to: Infinity, label: '' }, { label: '' }],
        ['infinite upper bound', { from: 1000, to: Infinity, label: '' }, { gt: 1000, label: '' }],
        ['infinite lower bound', { from: -Infinity, to: 0, label: '' }, { lte: 0, label: '' }],
        [
          'null upper bound with a 0 lower bound',
          { from: 0, to: null, label: '' },
          { gt: 0, label: '' },
        ],
        ['0 on both sides', { from: 0, to: 0, label: '' }, { gt: 0, lte: 0, label: '' }],
      ])('should keep a range with %s', (_, range, expected) => {
        expect(getApiRanges([range])).toEqual([expected]);
      });

      it('should keep an unbounded range at its position in the list', () => {
        expect(
          getApiRanges([
            { from: 0, to: 1000, label: '' },
            { from: null, to: null, label: 'All' },
            { from: 1000, to: Infinity, label: '' },
          ])
        ).toEqual([{ gt: 0, lte: 1000, label: '' }, { label: 'All' }, { gt: 1000, label: '' }]);
      });
    });
  });

  describe('round-trip', () => {
    const roundTripRanges = (ranges: RangeTypeLens[]) =>
      fromRangeOrHistogramLensApiToLensState(
        fromRangeOrHistogramLensStateToAPI(getRangeStateColumn(ranges))
      ).params.ranges;

    it('should convert unbounded ranges from lens state to API and back', () => {
      const ranges: RangeTypeLens[] = [
        { from: 0, to: 1000, label: '' },
        { from: 1000, to: null, label: '' },
        { from: null, to: 0, label: '' },
        { from: null, to: null, label: '' },
        { from: null, to: null, label: 'All' },
      ];

      expect(roundTripRanges(ranges)).toEqual(ranges);
    });

    it('should store infinite editor bounds as null after converting to API and back', () => {
      expect(
        roundTripRanges([
          { from: 1000, to: Infinity, label: '' },
          { from: -Infinity, to: 0, label: '' },
          { from: -Infinity, to: Infinity, label: 'All' },
        ])
      ).toEqual([
        { from: 1000, to: null, label: '' },
        { from: null, to: 0, label: '' },
        { from: null, to: null, label: 'All' },
      ]);
    });
  });
});
