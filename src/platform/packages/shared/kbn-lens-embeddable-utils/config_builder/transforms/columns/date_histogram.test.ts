/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  fromDateHistogramLensApiToLensState,
  fromDateHistogramLensStateToAPI,
} from './date_histogram';
import type { DateHistogramIndexPatternColumn } from '@kbn/lens-common';
import type { LensApiDateHistogramOperation } from '../../schema/bucket_ops';
import { bucketDateHistogramOperationSchema } from '../../schema/bucket_ops';
import {
  LENS_DATE_HISTOGRAM_EMPTY_ROWS_DEFAULT,
  LENS_DATE_HISTOGRAM_IGNORE_TIME_RANGE_DEFAULT,
  LENS_DATE_HISTOGRAM_INTERVAL_DEFAULT,
} from '../../schema/constants';

describe('Date Histogram Transforms', () => {
  describe('fromDateHistogramLensApiToLensState', () => {
    it('should transform basic date histogram configuration', () => {
      const input: LensApiDateHistogramOperation = {
        operation: 'date_histogram',
        field: '@timestamp',
        suggested_interval: '1d',
        include_empty_rows: LENS_DATE_HISTOGRAM_EMPTY_ROWS_DEFAULT,
        use_original_time_range: LENS_DATE_HISTOGRAM_IGNORE_TIME_RANGE_DEFAULT,
      };

      const expected: DateHistogramIndexPatternColumn = {
        operationType: 'date_histogram',
        sourceField: '@timestamp',
        customLabel: false,
        label: '',
        isBucketed: true,
        dataType: 'date',
        params: {
          interval: '1d',
          includeEmptyRows: LENS_DATE_HISTOGRAM_EMPTY_ROWS_DEFAULT,
          dropPartials: false,
          ignoreTimeRange: LENS_DATE_HISTOGRAM_IGNORE_TIME_RANGE_DEFAULT,
        },
      };

      expect(fromDateHistogramLensApiToLensState(input)).toEqual(expected);
    });

    it('should use default values when optional parameters are not provided', () => {
      const partialInput: Partial<LensApiDateHistogramOperation> = {
        operation: 'date_histogram',
        field: '@timestamp',
      };

      const input: LensApiDateHistogramOperation =
        bucketDateHistogramOperationSchema.validate(partialInput);

      const result = fromDateHistogramLensApiToLensState(input);

      expect(result.params).toEqual({
        interval: LENS_DATE_HISTOGRAM_INTERVAL_DEFAULT,
        includeEmptyRows: LENS_DATE_HISTOGRAM_EMPTY_ROWS_DEFAULT,
        dropPartials: false,
        ignoreTimeRange: LENS_DATE_HISTOGRAM_IGNORE_TIME_RANGE_DEFAULT,
      });
    });

    it('should handle custom label', () => {
      const input: LensApiDateHistogramOperation = {
        operation: 'date_histogram',
        field: '@timestamp',
        label: 'Daily Events',
        include_empty_rows: false,
        use_original_time_range: false,
        suggested_interval: '1d',
      };

      const result = fromDateHistogramLensApiToLensState(input);
      expect(result.customLabel).toBe(true);
      expect(result.label).toBe('Daily Events');
    });

    it('should handle all configuration options', () => {
      const input: LensApiDateHistogramOperation = {
        operation: 'date_histogram',
        field: '@timestamp',
        suggested_interval: '1h',
        use_original_time_range: true,
        include_empty_rows: true,
        drop_partial_intervals: true,
        label: 'Hourly Events',
      };

      const result = fromDateHistogramLensApiToLensState(input);
      expect(result.params).toEqual({
        interval: '1h',
        includeEmptyRows: true,
        dropPartials: true,
        ignoreTimeRange: true,
      });
    });
  });

  describe('fromDateHistogramLensStateToAPI', () => {
    it('should transform basic date histogram configuration', () => {
      const input: DateHistogramIndexPatternColumn = {
        operationType: 'date_histogram',
        sourceField: '@timestamp',
        customLabel: true,
        label: '@timestamp per 1d',
        isBucketed: true,
        dataType: 'date',
        params: {
          interval: '1d',
          includeEmptyRows: LENS_DATE_HISTOGRAM_EMPTY_ROWS_DEFAULT,
          dropPartials: false,
          ignoreTimeRange: LENS_DATE_HISTOGRAM_IGNORE_TIME_RANGE_DEFAULT,
        },
      };

      const expected: LensApiDateHistogramOperation = {
        operation: 'date_histogram',
        field: '@timestamp',
        label: '@timestamp per 1d',
        suggested_interval: '1d',
        use_original_time_range: LENS_DATE_HISTOGRAM_IGNORE_TIME_RANGE_DEFAULT,
        include_empty_rows: LENS_DATE_HISTOGRAM_EMPTY_ROWS_DEFAULT,
        drop_partial_intervals: false,
      };

      expect(fromDateHistogramLensStateToAPI(input)).toEqual(expected);
    });

    it('should handle custom label', () => {
      const input: DateHistogramIndexPatternColumn = {
        operationType: 'date_histogram',
        sourceField: '@timestamp',
        customLabel: true,
        label: 'Daily Events',
        isBucketed: true,
        dataType: 'date',
        params: {
          interval: '1d',
          includeEmptyRows: false,
          dropPartials: false,
          ignoreTimeRange: false,
        },
      };

      const result = fromDateHistogramLensStateToAPI(input);
      expect(result.label).toBe('Daily Events');
    });

    it('should preserve all configuration options', () => {
      const input: DateHistogramIndexPatternColumn = {
        operationType: 'date_histogram',
        sourceField: '@timestamp',
        customLabel: true,
        label: 'Hourly Events',
        isBucketed: true,
        dataType: 'date',
        params: {
          interval: '1h',
          includeEmptyRows: true,
          dropPartials: true,
          ignoreTimeRange: true,
        },
      };

      const result = fromDateHistogramLensStateToAPI(input);
      expect(result).toEqual({
        operation: 'date_histogram',
        field: '@timestamp',
        label: 'Hourly Events',
        suggested_interval: '1h',
        use_original_time_range: true,
        include_empty_rows: true,
        drop_partial_intervals: true,
      });
    });
  });
});
