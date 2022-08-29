/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { METRIC_TYPES } from '@kbn/data-plugin/public';
import type { Metric, MetricType } from '../../../../common/types';
import { TSVB_METRIC_TYPES } from '../../../../common/enums';
import { getParentPipelineSeriesFormula } from './parent_pipeline_formula';
import { SupportedMetric, SUPPORTED_METRICS } from './supported_metrics';

describe('getParentPipelineSeriesFormula', () => {
  const metrics: Metric[] = [
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

  const metricsWithNotSupportedSubFunction: Metric[] = [
    {
      id: 'test-2',
      type: METRIC_TYPES.MEDIAN,
      field: 'test-field-1',
    },
    {
      id: 'test-1',
      type: METRIC_TYPES.DERIVATIVE,
      field: 'test-2',
    },
    {
      id: 'some-random-value',
      type: TSVB_METRIC_TYPES.MOVING_AVERAGE,
      field: 'test-1',
    },
  ];

  const metricsWithSubFunction: Metric[] = [
    {
      id: 'test-2',
      type: METRIC_TYPES.AVG,
      field: 'test-field-1',
    },
    {
      id: 'test-1',
      type: METRIC_TYPES.DERIVATIVE,
      field: 'test-2',
    },
    {
      id: 'some-random-value',
      type: TSVB_METRIC_TYPES.MOVING_AVERAGE,
      field: 'test-1',
    },
  ];

  const metricsWithPercentileSubFunction: Metric[] = [
    {
      id: 'test-2',
      type: TSVB_METRIC_TYPES.PERCENTILE,
      field: 'test-field-1',
    },
    {
      id: 'test-1',
      type: METRIC_TYPES.DERIVATIVE,
      field: 'test-2[50]',
    },
    {
      id: 'some-random-value',
      type: TSVB_METRIC_TYPES.MOVING_AVERAGE,
      field: 'test-1',
    },
  ];

  const metricsWithPercentileRankSubFunction: Metric[] = [
    {
      id: 'test-2',
      type: TSVB_METRIC_TYPES.PERCENTILE_RANK,
      field: 'test-field-1',
    },
    {
      id: 'test-1',
      type: METRIC_TYPES.DERIVATIVE,
      field: 'test-2[5]',
    },
    {
      id: 'some-random-value',
      type: TSVB_METRIC_TYPES.MOVING_AVERAGE,
      field: 'test-1',
    },
  ];

  test.each<
    [
      string,
      [Metric[], Metric, SupportedMetric, MetricType, { metaValue?: number; window?: string }],
      string | null
    ]
  >([
    [
      'null if metric is not supported',
      [
        metrics,
        metrics[0],
        SUPPORTED_METRICS[metrics[0].type]!,
        TSVB_METRIC_TYPES.SUM_OF_SQUARES_BUCKET,
        {},
      ],
      null,
    ],
    [
      'null if metric have not supported additional sub function',
      [
        metricsWithNotSupportedSubFunction,
        metricsWithNotSupportedSubFunction[1],
        SUPPORTED_METRICS[metricsWithNotSupportedSubFunction[1].type]!,
        TSVB_METRIC_TYPES.MOVING_AVERAGE,
        {},
      ],
      null,
    ],
    [
      'correct formula if metric is supported',
      [
        metrics,
        metrics[0],
        SUPPORTED_METRICS[metrics[0].type]!,
        TSVB_METRIC_TYPES.MOVING_AVERAGE,
        {},
      ],
      'moving_average(average(test-field-1))',
    ],
    [
      'correct formula if metric have additional sub function',
      [
        metricsWithSubFunction,
        metricsWithSubFunction[1],
        SUPPORTED_METRICS[metricsWithSubFunction[1].type]!,
        TSVB_METRIC_TYPES.MOVING_AVERAGE,
        {},
      ],
      'moving_average(differences(average(test-field-1)))',
    ],
    [
      'correct formula if metric have percentile additional sub function',
      [
        metricsWithPercentileSubFunction,
        metricsWithPercentileSubFunction[1],
        SUPPORTED_METRICS[metricsWithPercentileSubFunction[1].type]!,
        TSVB_METRIC_TYPES.MOVING_AVERAGE,
        {},
      ],
      'moving_average(differences(percentile(test-field-1, percentile=50)))',
    ],
    [
      'correct formula if metric have percentile rank additional sub function',
      [
        metricsWithPercentileRankSubFunction,
        metricsWithPercentileRankSubFunction[1],
        SUPPORTED_METRICS[metricsWithPercentileRankSubFunction[1].type]!,
        TSVB_METRIC_TYPES.MOVING_AVERAGE,
        {},
      ],
      'moving_average(differences(percentile_rank(test-field-1, value=5)))',
    ],
  ])('should return %s', (_, input, expected) => {
    if (expected === null) {
      expect(getParentPipelineSeriesFormula(...input)).toBeNull();
    }
    expect(getParentPipelineSeriesFormula(...input)).toEqual(expected);
  });
});
