/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { createSeries } from '../__mocks__';
import { MetricType } from '../../../../common/types';
import { stubLogstashDataView } from '@kbn/data-views-plugin/common/data_view.stub';
import { convertMetricAggregationColumnWithoutSpecialParams } from './parent_pipeline';
import { SupportedMetric, SUPPORTED_METRICS } from '../metrics';
import { ColumnWithMeta } from './types';

describe('convertMetricAggregationColumnWithoutSpecialParams', () => {
  const dataView = stubLogstashDataView;
  const series = createSeries();

  test.each<[string, SupportedMetric]>([
    [SUPPORTED_METRICS.top_hit.name, SUPPORTED_METRICS.top_hit],
    [SUPPORTED_METRICS.percentile.name, SUPPORTED_METRICS.percentile],
    [SUPPORTED_METRICS.percentile_rank.name, SUPPORTED_METRICS.percentile_rank],
    [SUPPORTED_METRICS.positive_rate.name, SUPPORTED_METRICS.positive_rate],
  ])('should return null for metric %s', (_, operation) => {
    expect(
      convertMetricAggregationColumnWithoutSpecialParams(operation, {
        series,
        dataView,
        metrics: [{ type: operation.name as MetricType, id: 'some-id' }],
      })
    ).toBeNull();
  });

  test.each<[string, SupportedMetric]>([
    [SUPPORTED_METRICS.avg.name, SUPPORTED_METRICS.avg],
    [SUPPORTED_METRICS.cardinality.name, SUPPORTED_METRICS.cardinality],
    [SUPPORTED_METRICS.max.name, SUPPORTED_METRICS.max],
    [SUPPORTED_METRICS.min.name, SUPPORTED_METRICS.min],
    [SUPPORTED_METRICS.sum.name, SUPPORTED_METRICS.sum],
    [SUPPORTED_METRICS.std_deviation.name, SUPPORTED_METRICS.std_deviation],
  ])('should return null for metric %s without valid field', (_, operation) => {
    expect(
      convertMetricAggregationColumnWithoutSpecialParams(operation, {
        series,
        dataView,
        metrics: [{ type: operation.name as MetricType, id: 'some-id' }],
      })
    ).toBeNull();
  });

  test.each<[string, SupportedMetric, Partial<ColumnWithMeta>]>([
    [
      SUPPORTED_METRICS.count.name,
      SUPPORTED_METRICS.count,
      {
        meta: { metricId: 'some-id' },
        operationType: 'count',
        params: {},
        sourceField: 'document',
      },
    ],
  ])('should return column for metric %s without valid field', (_, operation, expected) => {
    expect(
      convertMetricAggregationColumnWithoutSpecialParams(operation, {
        series,
        dataView,
        metrics: [{ type: operation.name as MetricType, id: 'some-id' }],
      })
    ).toEqual(expect.objectContaining(expected));
  });

  test.each<[string, SupportedMetric, Partial<ColumnWithMeta>]>([
    [
      SUPPORTED_METRICS.avg.name,
      SUPPORTED_METRICS.avg,
      {
        meta: { metricId: 'some-id' },
        operationType: 'average',
        params: { format: { id: 'bytes' } },
      },
    ],
    [
      SUPPORTED_METRICS.cardinality.name,
      SUPPORTED_METRICS.cardinality,
      {
        meta: { metricId: 'some-id' },
        operationType: 'unique_count',
        params: { format: { id: 'bytes' } },
      },
    ],
    [
      SUPPORTED_METRICS.max.name,
      SUPPORTED_METRICS.max,
      {
        meta: { metricId: 'some-id' },
        operationType: 'max',
        params: { format: { id: 'bytes' } },
      },
    ],
    [
      SUPPORTED_METRICS.min.name,
      SUPPORTED_METRICS.min,
      {
        meta: { metricId: 'some-id' },
        operationType: 'min',
        params: { format: { id: 'bytes' } },
      },
    ],
    [
      SUPPORTED_METRICS.sum.name,
      SUPPORTED_METRICS.sum,
      {
        meta: { metricId: 'some-id' },
        operationType: 'sum',
        params: { format: { id: 'bytes' } },
      },
    ],
    [
      SUPPORTED_METRICS.std_deviation.name,
      SUPPORTED_METRICS.std_deviation,
      {
        meta: { metricId: 'some-id' },
        operationType: 'standard_deviation',
        params: { format: { id: 'bytes' } },
      },
    ],
  ])('should return column for metric %s with valid field', (_, operation, expected) => {
    expect(
      convertMetricAggregationColumnWithoutSpecialParams(operation, {
        series,
        dataView,
        metrics: [
          { type: operation.name as MetricType, id: 'some-id', field: dataView.fields[0].name },
        ],
      })
    ).toEqual(expect.objectContaining(expected));
  });
});
