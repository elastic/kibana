/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { stubLogstashDataView } from '@kbn/data-views-plugin/common/data_view.stub';
import {
  DateHistogramColumn,
  DateHistogramParams,
} from '@kbn/visualizations-plugin/common/convert_to_lens';
import type { Panel, Series } from '../../../../common/types';
import { createPanel, createSeries } from '../__mocks__';
import { convertToDateHistogramColumn, convertToDateHistogramParams } from './date_histogram';

describe('convertToDateHistogramParams', () => {
  const series = createSeries();
  const seriesWithInverval = createSeries({ override_index_pattern: 1, series_interval: '1h' });
  const seriesWithDropLastBucket = createSeries({
    override_index_pattern: 1,
    series_drop_last_bucket: 2,
  });
  const seriesWithOIPFalse = createSeries({ override_index_pattern: 0 });

  test.each<[string, [Panel, Series], DateHistogramParams]>([
    [
      'with interval=auto if series inverval is empty and should override index pattern',
      [createPanel({ series: [series] }), series],
      { dropPartials: false, includeEmptyRows: true, interval: 'auto' },
    ],
    [
      'with specified interval if series interval is set and should override index pattern',
      [createPanel({ series: [seriesWithInverval] }), seriesWithInverval],
      { dropPartials: false, includeEmptyRows: true, interval: '1h' },
    ],
    [
      'with specified interval if should not override index pattern',
      [createPanel({ series: [seriesWithOIPFalse], interval: '2h' }), seriesWithOIPFalse],
      { dropPartials: false, includeEmptyRows: true, interval: '2h' },
    ],
    [
      'with dropPartials to true if should override index pattern and last bucket is dropped in series',
      [createPanel({ series: [seriesWithDropLastBucket] }), seriesWithDropLastBucket],
      { dropPartials: true, includeEmptyRows: true, interval: 'auto' },
    ],
    [
      'with dropPartials to true if should override index pattern and last bucket is dropped in panel',
      [createPanel({ series: [series], drop_last_bucket: 2 }), series],
      { dropPartials: true, includeEmptyRows: true, interval: 'auto' },
    ],
  ])('should return date histogram params %s', (_, input, expected) => {
    if (expected === null) {
      expect(convertToDateHistogramParams(...input)).toBeNull();
    } else if (Array.isArray(expected)) {
      expect(convertToDateHistogramParams(...input)).toEqual(expected.map(expect.objectContaining));
    } else {
      expect(convertToDateHistogramParams(...input)).toEqual(expect.objectContaining(expected));
    }
  });
});

describe('convertToDateHistogramColumn', () => {
  const dataView = stubLogstashDataView;
  const series = createSeries();

  test.each<
    [string, Parameters<typeof convertToDateHistogramColumn>, Partial<DateHistogramColumn> | null]
  >([
    [
      'null if field is not correct',
      [
        createPanel({ series: [series] }),
        series,
        dataView,
        { fieldName: 'some-wrong-name', isSplit: false },
      ],
      null,
    ],
    [
      'null if field is empty',
      [createPanel({ series: [series] }), series, dataView, { fieldName: '', isSplit: false }],
      null,
    ],
    [
      'date histogram column if field is present and valid',
      [
        createPanel({ series: [series] }),
        series,
        dataView,
        { fieldName: dataView.fields[0].name, isSplit: false },
      ],
      {
        dataType: 'number',
        isBucketed: true,
        isSplit: false,
        operationType: 'date_histogram',
        params: { dropPartials: false, includeEmptyRows: true, interval: 'auto' },
        sourceField: dataView.fields[0].name,
      },
    ],
    [
      'date histogram column with isSplit=true if isSplit=true is passed as a parameter',
      [
        createPanel({ series: [series] }),
        series,
        dataView,
        { fieldName: dataView.fields[0].name, isSplit: true },
      ],
      {
        dataType: 'number',
        isBucketed: true,
        isSplit: true,
        operationType: 'date_histogram',
        params: { dropPartials: false, includeEmptyRows: true, interval: 'auto' },
        sourceField: dataView.fields[0].name,
      },
    ],
  ])('should return %s', (_, input, expected) => {
    if (expected === null) {
      expect(convertToDateHistogramColumn(...input)).toBeNull();
    } else if (Array.isArray(expected)) {
      expect(convertToDateHistogramColumn(...input)).toEqual(expected.map(expect.objectContaining));
    } else {
      expect(convertToDateHistogramColumn(...input)).toEqual(expect.objectContaining(expected));
    }
  });
});
