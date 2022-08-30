/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { METRIC_TYPES } from '@kbn/data-plugin/public';
import type { Metric } from '../../../../common/types';
import { TSVB_METRIC_TYPES } from '../../../../common/enums';
import { getFilterRatioFormula } from './filter_ratio_formula';

describe('getFilterRatioFormula', () => {
  const metric: Metric = {
    id: 'some-random-value',
    type: TSVB_METRIC_TYPES.FILTER_RATIO,
    field: 'test-1',
  };

  const metricWithMetricAgg: Metric = {
    id: 'some-random-value',
    type: TSVB_METRIC_TYPES.FILTER_RATIO,
    field: 'test-1',
    metric_agg: METRIC_TYPES.AVG,
  };

  const metricWithNotSupportedMetricAgg: Metric = {
    id: 'some-random-value',
    type: TSVB_METRIC_TYPES.FILTER_RATIO,
    field: 'test-1',
    metric_agg: METRIC_TYPES.MEDIAN,
  };

  test.each<[string, [Metric, string | undefined], string | null]>([
    ['null if metric_agg is not supported', [metricWithNotSupportedMetricAgg, undefined], null],
    [
      'filter ratio formula if metric_agg is not specified',
      [metric, undefined],
      "count(kql='*') / count(kql='*')",
    ],
    [
      'filter ratio formula if metric_agg is specified',
      [metricWithMetricAgg, undefined],
      "average('test-1',kql='*') / average('test-1',kql='*')",
    ],
    [
      'filter ratio formula if reducedTimeRange is provided',
      [metricWithMetricAgg, '1h'],
      "average('test-1',kql='*', reducedTimeRange='1h') / average('test-1',kql='*', reducedTimeRange='1h')",
    ],
  ])('should return %s', (_, input, expected) => {
    if (expected === null) {
      expect(getFilterRatioFormula(...input)).toBeNull();
    }
    expect(getFilterRatioFormula(...input)).toEqual(expected);
  });
});
