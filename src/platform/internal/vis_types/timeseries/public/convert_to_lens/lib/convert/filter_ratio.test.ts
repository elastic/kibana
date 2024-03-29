/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { METRIC_TYPES } from '@kbn/data-plugin/public';
import { stubLogstashDataView } from '@kbn/data-views-plugin/common/data_view.stub';
import { FormulaColumn } from './types';
import type { Metric } from '../../../../common/types';
import { createSeries } from '../__mocks__';
import { convertFilterRatioToFormulaColumn } from './filter_ratio';

describe('convertFilterRatioToFormulaColumn', () => {
  const dataView = stubLogstashDataView;
  const series = createSeries();
  const metric: Metric = {
    id: 'some-random-value',
    type: METRIC_TYPES.AVG,
    field: dataView.fields[0].name,
  };

  const metricWithMetricAgg: Metric = {
    id: 'some-random-value',
    type: METRIC_TYPES.AVG,
    field: dataView.fields[0].name,
    metric_agg: METRIC_TYPES.COUNT,
  };

  const metricWithNotSupportedMetricAgg: Metric = {
    id: 'some-random-value',
    type: METRIC_TYPES.AVG,
    field: dataView.fields[0].name,
    metric_agg: METRIC_TYPES.MEDIAN,
  };

  test.each<
    [string, Parameters<typeof convertFilterRatioToFormulaColumn>, Partial<FormulaColumn> | null]
  >([
    [
      'null if metric_agg is not supported',
      [{ series, dataView, metrics: [metricWithNotSupportedMetricAgg] }],
      null,
    ],
    [
      'formula column if metric_agg is supported',
      [{ series, dataView, metrics: [metricWithMetricAgg] }],
      {
        meta: { metricId: metricWithMetricAgg.id },
        operationType: 'formula',
        params: { formula: "count(kql='*') / count(kql='*')" },
      },
    ],
    [
      'formula column if metric_agg is not specified',
      [{ series, dataView, metrics: [metric] }],
      {
        meta: { metricId: metric.id },
        operationType: 'formula',
        params: { formula: "count(kql='*') / count(kql='*')" },
      },
    ],
  ])('should return %s', (_, input, expected) => {
    if (expected === null) {
      expect(convertFilterRatioToFormulaColumn(...input)).toBeNull();
    } else if (Array.isArray(expected)) {
      expect(convertFilterRatioToFormulaColumn(...input)).toEqual(
        expected.map(expect.objectContaining)
      );
    } else {
      expect(convertFilterRatioToFormulaColumn(...input)).toEqual(
        expect.objectContaining(expected)
      );
    }
  });
});
