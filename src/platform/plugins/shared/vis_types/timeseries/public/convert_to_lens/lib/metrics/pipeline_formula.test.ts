/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { METRIC_TYPES } from '@kbn/data-plugin/public';
import type { Metric } from '../../../../common/types';
import { TSVB_METRIC_TYPES } from '../../../../common/enums';
import { getPipelineSeriesFormula } from './pipeline_formula';

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

  const positiveOnlyMetrics: Metric[] = [
    {
      id: 'test-1',
      type: METRIC_TYPES.AVG,
      field: 'test-field-1',
    },
    {
      id: 'some-random-value',
      type: TSVB_METRIC_TYPES.POSITIVE_ONLY,
      field: 'test-1',
    },
  ];

  test.each<
    [
      string,
      [
        Metric,
        Metric[],
        Metric,
        { metaValue?: number; reducedTimeRange?: string; timeShift?: string }
      ],
      string | null
    ]
  >([
    [
      'null if metric is not supported',
      [metricsWithNotSupportedSubFunction[0], metrics, metrics[0], {}],
      null,
    ],
    [
      'null if metric have not supported additional sub function',
      [
        metricsWithNotSupportedSubFunction[2],
        metricsWithNotSupportedSubFunction,
        metricsWithNotSupportedSubFunction[1],
        {},
      ],
      null,
    ],
    [
      'correct formula if metric is supported',
      [metrics[1], metrics, metrics[0], {}],
      'moving_average(average(test-field-1), window=5)',
    ],
    [
      'correct formula if metric have additional sub function',
      [metricsWithSubFunction[2], metricsWithSubFunction, metricsWithSubFunction[1], {}],
      'moving_average(differences(average(test-field-1)), window=5)',
    ],
    [
      'correct formula if metric have percentile additional sub function',
      [
        metricsWithPercentileSubFunction[2],
        metricsWithPercentileSubFunction,
        metricsWithPercentileSubFunction[1],
        {},
      ],
      'moving_average(differences(percentile(test-field-1, percentile=50)), window=5)',
    ],
    [
      'correct formula if metric have percentile rank additional sub function',
      [
        metricsWithPercentileRankSubFunction[2],
        metricsWithPercentileRankSubFunction,
        metricsWithPercentileRankSubFunction[1],
        {},
      ],
      'moving_average(differences(percentile_rank(test-field-1, value=5)), window=5)',
    ],
    [
      'correct formula if metric is positive only',
      [positiveOnlyMetrics[1], positiveOnlyMetrics, positiveOnlyMetrics[0], {}],
      'pick_max(average(test-field-1), 0)',
    ],
  ])('should return %s', (_, input, expected) => {
    if (expected === null) {
      expect(getPipelineSeriesFormula(...input)).toBeNull();
    }
    expect(getPipelineSeriesFormula(...input)).toEqual(expected);
  });
});
