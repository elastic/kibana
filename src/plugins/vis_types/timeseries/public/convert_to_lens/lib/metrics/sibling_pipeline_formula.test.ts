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
import { getSiblingPipelineSeriesFormula } from './sibling_pipeline_formula';

describe('getSiblingPipelineSeriesFormula', () => {
  test('should return correct formula for sibling pipeline agg on positive only', () => {
    const metrics = [
      {
        field: 'day_of_week_i',
        id: '123456',
        type: 'max',
      },
      {
        id: '891011',
        type: 'positive_only',
        field: '123456',
      },
    ] as Metric[];
    const formula = getSiblingPipelineSeriesFormula(
      TSVB_METRIC_TYPES.POSITIVE_ONLY,
      metrics[1],
      metrics
    );
    expect(formula).toStrictEqual('pick_max(max(day_of_week_i), 0)');
  });

  test('should return correct config for sibling pipeline agg on percentile ranks', () => {
    const metrics = [
      {
        field: 'AvgTicketPrice',
        id: '04558549-f19f-4a87-9923-27df8b81af3e',
        values: ['400', '500', '700'],
        colors: ['rgba(211,96,134,1)', 'rgba(155,33,230,1)', '#68BC00'],
        type: 'percentile_rank',
      },
      {
        field: '04558549-f19f-4a87-9923-27df8b81af3e[400.0]',
        id: '764f4110-7db9-11ec-9fdf-91a8881dd06b',
        type: 'avg_bucket',
      },
    ] as Metric[];
    const formula = getSiblingPipelineSeriesFormula(METRIC_TYPES.AVG_BUCKET, metrics[1], metrics);
    expect(formula).toStrictEqual('overall_average(percentile_rank(AvgTicketPrice, value=400))');
  });

  test('should return correct config for sibling pipeline agg on percentile', () => {
    const metrics = [
      {
        field: 'AvgTicketPrice',
        id: '04558549-f19f-4a87-9923-27df8b81af3e',
        percentiles: [
          {
            color: '#68BC00',
            id: 'aef159f0-7db8-11ec-9d0c-e57521cec076',
            mode: 'line',
            shade: 0.2,
            value: 50,
          },
          {
            color: 'rgba(0,63,188,1)',
            id: 'b0e0a6d0-7db8-11ec-9d0c-e57521cec076',
            mode: 'line',
            percentile: '',
            shade: 0.2,
            value: '70',
          },
        ],
        type: 'percentile',
      },
      {
        field: '04558549-f19f-4a87-9923-27df8b81af3e[70.0]',
        id: '764f4110-7db9-11ec-9fdf-91a8881dd06b',
        type: 'avg_bucket',
      },
    ] as Metric[];
    const formula = getSiblingPipelineSeriesFormula(METRIC_TYPES.AVG_BUCKET, metrics[1], metrics);
    expect(formula).toStrictEqual('overall_average(percentile(AvgTicketPrice, percentile=70))');
  });
});
