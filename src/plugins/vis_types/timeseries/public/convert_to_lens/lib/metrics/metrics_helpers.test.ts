/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { TimeRange } from '@kbn/data-plugin/common';
import { METRIC_TYPES } from '@kbn/data-plugin/public';
import type { Metric, Series, Panel } from '../../../../common/types';
import { TIME_RANGE_DATA_MODES, TSVB_METRIC_TYPES } from '../../../../common/enums';
import { getFormulaEquivalent, getReducedTimeRange } from './metrics_helpers';
import { createPanel, createSeries } from '../__mocks__';

jest.mock('../../../services', () => ({
  getUISettings: () => ({ get: () => 50 }),
}));

describe('getFormulaEquivalent', () => {
  const notSupportedMetric: Metric = {
    id: 'some-random-value',
    type: METRIC_TYPES.MEDIAN,
    field: 'test-1',
  };

  const supportedMetric: Metric = {
    id: 'some-random-value',
    type: METRIC_TYPES.AVG,
    field: 'test-1',
  };

  const countMetric: Metric = {
    id: 'some-random-value',
    type: METRIC_TYPES.COUNT,
  };

  const staticValue: Metric = {
    id: 'some-random-value',
    type: TSVB_METRIC_TYPES.STATIC,
    value: '100',
  };

  const filterRatioMetric: Metric = {
    id: 'some-random-value',
    type: TSVB_METRIC_TYPES.FILTER_RATIO,
    field: 'test-1',
    metric_agg: METRIC_TYPES.AVG,
  };

  const stdDeviationMetricWithLowerMode: Metric = {
    id: 'some-random-value',
    type: TSVB_METRIC_TYPES.STD_DEVIATION,
    field: 'test-1',
    mode: 'lower',
  };

  const stdDeviationMetricWithUpperMode: Metric = {
    id: 'some-random-value',
    type: TSVB_METRIC_TYPES.STD_DEVIATION,
    field: 'test-1',
    mode: 'upper',
  };

  const variance: Metric = {
    id: 'some-random-value',
    type: TSVB_METRIC_TYPES.VARIANCE,
    field: 'test-1',
  };

  const sibblingPipelineMetric: Metric[] = [
    {
      id: 'test-1',
      type: METRIC_TYPES.AVG,
      field: 'test-field-1',
    },
    {
      id: 'some-random-value',
      type: METRIC_TYPES.AVG_BUCKET,
      field: 'test-1',
    },
  ];

  const parentPipelineMetric: Metric[] = [
    {
      id: 'test-1',
      type: METRIC_TYPES.AVG,
      field: 'test-field-1',
    },
    {
      id: 'some-random-value',
      type: TSVB_METRIC_TYPES.MOVING_AVERAGE,
      field: 'test-1',
    },
  ];

  const percentileMetric: Metric = {
    id: 'some-random-value',
    type: TSVB_METRIC_TYPES.PERCENTILE,
    field: 'test-1',
  };

  const percentileRankMetric: Metric = {
    id: 'some-random-value',
    type: TSVB_METRIC_TYPES.PERCENTILE_RANK,
    field: 'test-1',
  };

  test.each<
    [string, [Metric, Metric[], { metaValue?: number; reducedTimeRange?: string }], string | null]
  >([
    ['null if metric is not supported', [notSupportedMetric, [notSupportedMetric], {}], null],
    [
      'correct formula if metric is sibling pipeline agg',
      [sibblingPipelineMetric[1], sibblingPipelineMetric, {}],
      'overall_average(average(test-field-1))',
    ],
    [
      'correct formula if metric is percentile agg',
      [percentileMetric, [percentileMetric], { metaValue: 50 }],
      'percentile(test-1, percentile=50)',
    ],
    [
      'correct formula if metric is percentile rank agg',
      [percentileRankMetric, [percentileRankMetric], { metaValue: 5 }],
      'percentile_rank(test-1, value=5)',
    ],
    [
      'correct formula if metric is parent pipeline agg',
      [parentPipelineMetric[1], parentPipelineMetric, {}],
      'moving_average(average(test-field-1), window=5)',
    ],
    ['correct formula if metric is count agg', [countMetric, [countMetric], {}], 'count()'],
    ['correct formula if metric is static value', [staticValue, [staticValue], {}], '100'],
    [
      'correct formula if metric is filter ratio',
      [filterRatioMetric, [filterRatioMetric], {}],
      "average('test-1',kql='*') / average('test-1',kql='*')",
    ],
    [
      'correct formula if metric is standart deviation with lower mode',
      [stdDeviationMetricWithLowerMode, [stdDeviationMetricWithLowerMode], {}],
      'average(test-1) - 1.5 * standard_deviation(test-1)',
    ],
    [
      'correct formula if metric is standart deviation with upper mode',
      [stdDeviationMetricWithUpperMode, [stdDeviationMetricWithUpperMode], {}],
      'average(test-1) + 1.5 * standard_deviation(test-1)',
    ],
    [
      'correct formula if metric is variance',
      [variance, [variance], {}],
      'pow(standard_deviation(test-1), 2)',
    ],
    [
      'correct formula if metric is supported',
      [supportedMetric, [supportedMetric], {}],
      'average(test-1)',
    ],
    [
      'correct formula if metric is supported and reducedTimeRange is provided',
      [supportedMetric, [supportedMetric], { reducedTimeRange: '1h' }],
      "average(test-1, reducedTimeRange='1h')",
    ],
  ])('should return %s', (_, input, expected) => {
    if (expected === null) {
      expect(getFormulaEquivalent(...input)).toBeNull();
    }
    expect(getFormulaEquivalent(...input)).toEqual(expected);
  });
});

describe('getReducedTimeRange', () => {
  const timeRange: TimeRange = {
    from: '2022-02-04',
    to: '2022-02-05',
  };
  const series = createSeries();
  const seriesWithInverval = createSeries({
    override_index_pattern: 1,
    series_interval: '10h',
    time_range_mode: TIME_RANGE_DATA_MODES.LAST_VALUE,
  });
  const seriesWithEntireTimeRangeMode = createSeries({
    override_index_pattern: 1,
    series_interval: '10h',
    time_range_mode: TIME_RANGE_DATA_MODES.ENTIRE_TIME_RANGE,
  });

  test.each<[string, [Panel, Series, TimeRange], string | undefined]>([
    [
      'undefined if panel time range mode is entire time range',
      [
        createPanel({ series: [series], time_range_mode: TIME_RANGE_DATA_MODES.ENTIRE_TIME_RANGE }),
        series,
        timeRange,
      ],
      undefined,
    ],
    [
      'undefined if series time range mode is entire time range and should override index pattern',
      [
        createPanel({
          series: [seriesWithEntireTimeRangeMode],
          time_range_mode: TIME_RANGE_DATA_MODES.LAST_VALUE,
        }),
        seriesWithEntireTimeRangeMode,
        timeRange,
      ],
      undefined,
    ],
    [
      'specified interval if panel interval is set and should not override index pattern',
      [
        createPanel({
          series: [series],
          time_range_mode: TIME_RANGE_DATA_MODES.LAST_VALUE,
          interval: '5h',
        }),
        series,
        timeRange,
      ],
      '5h',
    ],
    [
      'specified interval if series interval is set and should override index pattern',
      [createPanel({ series: [seriesWithInverval] }), seriesWithInverval, timeRange],
      '10h',
    ],
    [
      'calculated interval if panel interal is not defined',
      [
        createPanel({ series: [series], time_range_mode: TIME_RANGE_DATA_MODES.LAST_VALUE }),
        series,
        timeRange,
      ],
      '10m',
    ],
  ])('should return %s', (_, input, expected) => {
    if (expected === undefined) {
      expect(getReducedTimeRange(...input)).toBeUndefined();
    }
    expect(getReducedTimeRange(...input)).toEqual(expected);
  });
});
