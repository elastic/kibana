/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { Metric } from '../../common/types';
import { getSeries } from './get_series';

describe('getSeries', () => {
  test('should return the correct config for an average aggregation', () => {
    const metric = [
      {
        id: '12345',
        type: 'avg',
        field: 'day_of_week_i',
      },
    ] as Metric[];
    const config = getSeries(metric, 1);
    expect(config).toStrictEqual([
      {
        agg: 'average',
        fieldName: 'day_of_week_i',
        isFullReference: false,
        params: {},
      },
    ]);
  });

  test('should return the correct formula config for a filter ratio aggregation', () => {
    const metric = [
      {
        id: '12345',
        type: 'filter_ratio',
        field: 'day_of_week_i',
        numerator: {
          query: 'category.keyword : "Men\'s Clothing" ',
          language: 'kuery',
        },
        denominator: {
          query: 'customer_gender : "FEMALE" ',
          language: 'kuery',
        },
      },
    ] as Metric[];
    const config = getSeries(metric, 1);
    expect(config).toStrictEqual([
      {
        agg: 'formula',
        fieldName: 'document',
        isFullReference: true,
        params: {
          formula:
            "count(kql='category.keyword : \"Men\\'s Clothing\" ') / count(kql='customer_gender : \"FEMALE\" ')",
        },
      },
    ]);
  });

  test('should return the correct formula config for an overall function', () => {
    const metric = [
      {
        field: 'day_of_week_i',
        id: '123456',
        type: 'max',
      },
      {
        id: '891011',
        type: 'max_bucket',
        field: '123456',
      },
    ] as Metric[];
    const config = getSeries(metric, 1);
    expect(config).toStrictEqual([
      {
        agg: 'formula',
        fieldName: 'document',
        isFullReference: true,
        params: {
          formula: 'overall_max(max(day_of_week_i))',
        },
      },
    ]);
  });

  test('should return the correct formula config for a positive only function', () => {
    const metric = [
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
    const config = getSeries(metric, 1);
    expect(config).toStrictEqual([
      {
        agg: 'formula',
        fieldName: 'document',
        isFullReference: true,
        params: {
          formula: 'clamp(max(day_of_week_i), 0, max(day_of_week_i))',
        },
      },
    ]);
  });

  test('should return the correct config for the cumulative sum on count', () => {
    const metric = [
      {
        id: '123456',
        type: 'count',
      },
      {
        id: '7891011',
        type: 'cumulative_sum',
        field: '123456',
      },
    ] as Metric[];
    const config = getSeries(metric, 1);
    expect(config).toStrictEqual([
      {
        agg: 'cumulative_sum',
        fieldName: 'document',
        isFullReference: true,
        params: {},
        pipelineAggType: 'count',
      },
    ]);
  });

  test('should return the correct formula config for the cumulative sum on max', () => {
    const metric = [
      {
        field: 'day_of_week_i',
        id: '123456',
        type: 'max',
      },
      {
        id: '7891011',
        type: 'cumulative_sum',
        field: '123456',
      },
    ] as Metric[];
    const config = getSeries(metric, 1);
    expect(config).toStrictEqual([
      {
        agg: 'formula',
        fieldName: 'document',
        isFullReference: true,
        params: {
          formula: 'cumulative_sum(max(day_of_week_i))',
        },
      },
    ]);
  });

  test('should return the correct config for the derivative aggregation', () => {
    const metric = [
      {
        field: 'day_of_week_i',
        id: '123456',
        type: 'max',
      },
      {
        field: '123456',
        id: '7891011',
        type: 'derivative',
        unit: '1m',
      },
    ] as Metric[];
    const config = getSeries(metric, 1);
    expect(config).toStrictEqual([
      {
        agg: 'differences',
        fieldName: 'day_of_week_i',
        isFullReference: true,
        params: {
          timeScale: 'm',
        },
        pipelineAggType: 'max',
      },
    ]);
  });

  test('should return the correct config for the moving average aggregation', () => {
    const metric = [
      {
        field: 'day_of_week_i',
        id: '123456',
        type: 'max',
      },
      {
        field: '123456',
        id: '7891011',
        type: 'moving_average',
        window: 6,
      },
    ] as Metric[];
    const config = getSeries(metric, 1);
    expect(config).toStrictEqual([
      {
        agg: 'moving_average',
        fieldName: 'day_of_week_i',
        isFullReference: true,
        params: { window: 6 },
        pipelineAggType: 'max',
      },
    ]);
  });

  test('should return the correct formula for the math aggregation', () => {
    const metric = [
      {
        field: 'day_of_week_i',
        id: '123456',
        type: 'max',
      },
      {
        field: 'day_of_week_i',
        id: '7891011',
        type: 'min',
      },
      {
        field: '123456',
        id: 'fab31880-7d11-11ec-a13a-b52b40401df4',
        script: 'params.max - params.min',
        type: 'math',
        variables: [
          {
            field: '123456',
            id: 'c47c7a00-7d15-11ec-a13a-b52b40401df4',
            name: 'max',
          },
          {
            field: '7891011',
            id: 'c7a38390-7d15-11ec-a13a-b52b40401df4',
            name: 'min',
          },
        ],
        window: 6,
      },
    ] as Metric[];
    const config = getSeries(metric, 1);
    expect(config).toStrictEqual([
      {
        agg: 'formula',
        fieldName: 'document',
        isFullReference: true,
        params: {
          formula: 'max(day_of_week_i) - min(day_of_week_i)',
        },
      },
    ]);
  });

  test('should return the correct config for the percentiles aggregation', () => {
    const metric = [
      {
        field: 'day_of_week_i',
        id: 'id1',
        type: 'percentile',
        percentiles: [
          {
            value: '90',
            percentile: '',
            shade: 0.2,
            color: 'rgba(211,96,134,1)',
            id: 'id2',
            mode: 'line',
          },
          {
            value: '85',
            percentile: '',
            shade: 0.2,
            color: 'rgba(155,33,230,1)',
            id: 'id3',
            mode: 'line',
          },
          {
            value: '70',
            percentile: '',
            shade: 0.2,
            color: '#68BC00',
            id: 'id4',
            mode: 'line',
          },
        ],
      },
    ] as Metric[];
    const config = getSeries(metric, 1);
    expect(config).toStrictEqual([
      {
        agg: 'percentile',
        color: 'rgba(211,96,134,1)',
        fieldName: 'day_of_week_i',
        isFullReference: false,
        params: {
          percentile: '90',
        },
      },
      {
        agg: 'percentile',
        color: 'rgba(155,33,230,1)',
        fieldName: 'day_of_week_i',
        isFullReference: false,
        params: {
          percentile: '85',
        },
      },
      {
        agg: 'percentile',
        color: '#68BC00',
        fieldName: 'day_of_week_i',
        isFullReference: false,
        params: {
          percentile: '70',
        },
      },
    ]);
  });

  test('should return the correct formula config for a top_hit size 1 aggregation', () => {
    const metric = [
      {
        id: '12345',
        type: 'top_hit',
        field: 'day_of_week_i',
        size: 1,
        order_by: 'timestamp',
      },
    ] as Metric[];
    const config = getSeries(metric, 1);
    expect(config).toStrictEqual([
      {
        agg: 'last_value',
        fieldName: 'day_of_week_i',
        isFullReference: false,
        params: {
          sortField: 'timestamp',
        },
      },
    ]);
  });

  test('should return null for a top_hit size >1 aggregation', () => {
    const metric = [
      {
        id: '12345',
        type: 'top_hit',
        field: 'day_of_week_i',
        size: 2,
      },
    ] as Metric[];
    const config = getSeries(metric, 1);
    expect(config).toBeNull();
  });

  test('should return null for a static aggregation with 1 layer', () => {
    const metric = [
      {
        id: '12345',
        type: 'static',
        value: '10',
      },
    ] as Metric[];
    const config = getSeries(metric, 1);
    expect(config).toBeNull();
  });

  test('should return the correct config for a static aggregation with 2 layers', () => {
    const metric = [
      {
        id: '12345',
        type: 'static',
        value: '10',
      },
    ] as Metric[];
    const config = getSeries(metric, 2);
    expect(config).toStrictEqual([
      {
        agg: 'static_value',
        fieldName: 'document',
        isFullReference: true,
        params: {
          value: '10',
        },
      },
    ]);
  });

  test('should return the correct formula for the math aggregation with percentiles as variables', () => {
    const metric = [
      {
        field: 'day_of_week_i',
        id: 'e72265d2-2106-4af9-b646-33afd9cddcad',
        percentiles: [
          {
            color: 'rgba(211,96,134,1)',
            id: '381a6850-7d16-11ec-a13a-b52b40401df4',
            mode: 'line',
            percentile: '',
            shade: 0.2,
            value: '90',
          },
          {
            color: 'rgba(0,107,188,1)',
            id: '52f02970-7d1c-11ec-bfa7-3798d98f8341',
            mode: 'line',
            percentile: '',
            shade: 0.2,
            value: '50',
          },
        ],
        type: 'percentile',
        unit: '',
      },
      {
        field: 'day_of_week_i',
        id: '6280b080-7d1c-11ec-bfa7-3798d98f8341',
        type: 'avg',
      },
      {
        id: '23a05540-7d18-11ec-a589-45a3784fc1ce',
        script: 'params.perc90 + params.perc70 + params.avg',
        type: 'math',
        variables: [
          {
            field: 'e72265d2-2106-4af9-b646-33afd9cddcad[90.0]',
            id: '25840960-7d18-11ec-a589-45a3784fc1ce',
            name: 'perc90',
          },
          {
            field: 'e72265d2-2106-4af9-b646-33afd9cddcad[50.0]',
            id: '2a440270-7d18-11ec-a589-45a3784fc1ce',
            name: 'perc70',
          },
          {
            field: '6280b080-7d1c-11ec-bfa7-3798d98f8341',
            id: '64c82f80-7d1c-11ec-bfa7-3798d98f8341',
            name: 'avg',
          },
        ],
      },
    ] as Metric[];
    const config = getSeries(metric, 1);
    expect(config).toStrictEqual([
      {
        agg: 'formula',
        fieldName: 'document',
        isFullReference: true,
        params: {
          formula:
            'percentile(day_of_week_i, percentile=90) + percentile(day_of_week_i, percentile=50) + average(day_of_week_i)',
        },
      },
    ]);
  });
});
