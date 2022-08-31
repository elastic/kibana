/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { METRIC_TYPES } from '@kbn/data-plugin/public';
import type { Metric, MetricType } from '../../../../common/types';
import { getParentPipelineSeries } from './parent_pipeline_series';

describe('getParentPipelineSeries', () => {
  test('should return correct config for pipeline agg on percentiles', () => {
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
        type: 'derivative',
        unit: '',
      },
    ] as Metric[];
    const config = getParentPipelineSeries(METRIC_TYPES.DERIVATIVE, 1, metrics);
    expect(config).toStrictEqual([
      {
        agg: 'differences',
        fieldName: 'AvgTicketPrice',
        isFullReference: true,
        params: {
          percentile: 70,
        },
        pipelineAggType: 'percentile',
      },
    ]);
  });

  test('should return correct config for pipeline agg on percentile ranks', () => {
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
        type: 'derivative',
        unit: '',
      },
    ] as Metric[];
    const config = getParentPipelineSeries(METRIC_TYPES.DERIVATIVE, 1, metrics);
    expect(config).toStrictEqual([
      {
        agg: 'differences',
        fieldName: 'AvgTicketPrice',
        isFullReference: true,
        params: {
          value: 400,
        },
        pipelineAggType: 'percentile_rank',
      },
    ]);
  });

  test('should return null config for pipeline agg on non-supported sub-aggregation', () => {
    const metrics = [
      {
        field: 'AvgTicketPrice',
        id: '04558549-f19f-4a87-9923-27df8b81af3e',
        type: 'sum_of_squares_bucket',
      },
      {
        field: '04558549-f19f-4a87-9923-27df8b81af3e',
        id: '764f4110-7db9-11ec-9fdf-91a8881dd06b',
        type: 'derivative',
        unit: '',
      },
    ] as Metric[];
    const config = getParentPipelineSeries(METRIC_TYPES.DERIVATIVE, 1, metrics);
    expect(config).toBeNull();
  });

  test('should return null config for pipeline agg when sub-agregation is not given', () => {
    const metrics = [
      {
        field: 'AvgTicketPrice',
        id: '04558549-f19f-4a87-9923-27df8b81af3e',
        type: 'avg',
      },
      {
        field: '123456',
        id: '764f4110-7db9-11ec-9fdf-91a8881dd06b',
        type: 'derivative',
        unit: '',
      },
    ] as Metric[];
    const config = getParentPipelineSeries(METRIC_TYPES.DERIVATIVE, 1, metrics);
    expect(config).toBeNull();
  });

  test('should return formula config for pipeline agg when applied on nested aggregations', () => {
    const metrics = [
      {
        field: 'AvgTicketPrice',
        id: '04558549-f19f-4a87-9923-27df8b81af3e',
        type: 'avg',
      },
      {
        field: '04558549-f19f-4a87-9923-27df8b81af3e',
        id: '6e4932d0-7dbb-11ec-8d79-e163106679dc',
        model_type: 'simple',
        type: 'cumulative_sum',
      },
      {
        field: '6e4932d0-7dbb-11ec-8d79-e163106679dc',
        id: 'a51de940-7dbb-11ec-8d79-e163106679dc',
        type: 'moving_average',
        window: 5,
      },
    ] as Metric[];
    const config = getParentPipelineSeries('moving_average' as MetricType, 2, metrics);
    expect(config).toStrictEqual([
      {
        agg: 'formula',
        fieldName: 'document',
        isFullReference: true,
        params: { formula: 'moving_average(cumulative_sum(average(AvgTicketPrice)))' },
      },
    ]);
  });
});
