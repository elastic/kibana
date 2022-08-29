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
import { getSiblingPipelineSeriesFormula } from './sibling_pipeline_formula';

describe('getSiblingPipelineSeriesFormula', () => {
  const metrics: Metric[] = [
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

  const metricsWithNotSupportedSubFunction: Metric[] = [
    {
      id: 'test-2',
      type: METRIC_TYPES.MEDIAN,
      field: 'test-field-1',
    },
    {
      id: 'test-1',
      type: METRIC_TYPES.SUM_BUCKET,
      field: 'test-2',
    },
    {
      id: 'some-random-value',
      type: METRIC_TYPES.AVG_BUCKET,
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
      type: METRIC_TYPES.SUM_BUCKET,
      field: 'test-2',
    },
    {
      id: 'some-random-value',
      type: METRIC_TYPES.AVG_BUCKET,
      field: 'test-1',
    },
  ];

  test.each<[string, [MetricType, Metric, Metric[], string | undefined], string | null]>([
    [
      'null if metric is not supported',
      [TSVB_METRIC_TYPES.SUM_OF_SQUARES_BUCKET, metrics[1], metrics, undefined],
      null,
    ],
    [
      'null if metric have not supported additional sub function',
      [
        METRIC_TYPES.AVG_BUCKET,
        metricsWithNotSupportedSubFunction[2],
        metricsWithNotSupportedSubFunction,
        undefined,
      ],
      null,
    ],
    [
      'correct formula if metric is supported',
      [METRIC_TYPES.AVG_BUCKET, metrics[1], metrics, undefined],
      'overall_average(average(test-field-1))',
    ],
    [
      'correct formula if metric is positive only',
      [TSVB_METRIC_TYPES.POSITIVE_ONLY, positiveOnlyMetrics[1], positiveOnlyMetrics, undefined],
      'pick_max(average(test-field-1), 0)',
    ],
    [
      'correct formula if metric have additional sub function',
      [METRIC_TYPES.AVG_BUCKET, metricsWithSubFunction[2], metricsWithSubFunction, undefined],
      'overall_average(overall_sum(average(test-field-1)))',
    ],
  ])('should return %s', (_, input, expected) => {
    if (expected === null) {
      expect(getSiblingPipelineSeriesFormula(...input)).toBeNull();
    }
    expect(getSiblingPipelineSeriesFormula(...input)).toEqual(expected);
  });
});
