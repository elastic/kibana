/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { METRIC_TYPES } from '@kbn/data-plugin/public';
import type { Metric } from '../../../../common/types';
import { PANEL_TYPES, TSVB_METRIC_TYPES, TIME_RANGE_DATA_MODES } from '../../../../common/enums';
import { isValidMetrics } from './validate_metrics';

describe('isValidMetrics', () => {
  const supportedMetrics: Metric[] = [
    {
      id: 'some-random-value',
      type: METRIC_TYPES.AVG,
      field: 'test-1',
    },
    {
      id: 'some-random-value',
      type: METRIC_TYPES.VALUE_COUNT,
      field: 'test-2',
    },
  ];

  const notSupportedMetrics: Metric[] = [
    {
      id: 'some-random-value',
      type: TSVB_METRIC_TYPES.SUM_OF_SQUARES,
      field: 'test-1',
    },
  ];

  const notSupportedMetricsForTopN: Metric[] = [
    {
      id: 'some-random-value',
      type: TSVB_METRIC_TYPES.MOVING_AVERAGE,
      field: 'test-1',
    },
  ];

  const metricsWithoutField: Metric[] = [
    {
      id: 'some-random-value',
      type: METRIC_TYPES.AVG,
    },
  ];

  const filterRatioWithNotSupportedMetricAgg: Metric[] = [
    {
      id: 'some-random-value',
      type: TSVB_METRIC_TYPES.FILTER_RATIO,
      metric_agg: TSVB_METRIC_TYPES.SUM_OF_SQUARES,
      field: 'test-1',
    },
  ];

  const filterRatioWithoutField: Metric[] = [
    {
      id: 'some-random-value',
      type: TSVB_METRIC_TYPES.FILTER_RATIO,
      metric_agg: METRIC_TYPES.AVG,
    },
  ];

  test.each<[string, [Metric[], PANEL_TYPES, string | undefined], boolean]>([
    [
      'false if at least one metric type is not supported',
      [notSupportedMetrics, PANEL_TYPES.TIMESERIES, undefined],
      false,
    ],
    [
      'false if at least one metric type is not supported for provided panel type',
      [notSupportedMetricsForTopN, PANEL_TYPES.TOP_N, undefined],
      false,
    ],
    [
      'false if at least one metric type is not supported for provided time range mode',
      [notSupportedMetricsForTopN, PANEL_TYPES.TIMESERIES, TIME_RANGE_DATA_MODES.LAST_VALUE],
      false,
    ],
    [
      'false if at least one metric which require field provided without field name',
      [metricsWithoutField, PANEL_TYPES.TIMESERIES, undefined],
      false,
    ],
    [
      'false if at least one filter ratio has not supported metric agg',
      [filterRatioWithNotSupportedMetricAgg, PANEL_TYPES.TIMESERIES, undefined],
      false,
    ],
    [
      'false if at least one filter ratio has not field for metric agg',
      [filterRatioWithoutField, PANEL_TYPES.TIMESERIES, undefined],
      false,
    ],
    [
      'true if all metric is supported',
      [supportedMetrics, PANEL_TYPES.TIMESERIES, undefined],
      true,
    ],
  ])('should return %s', (_, input, expected) => {
    expect(isValidMetrics(...input)).toBe(expected);
  });
});
