/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createSeries } from '../__mocks__';
import { Metric, MetricType } from '../../../../common/types';
import { stubLogstashDataView } from '@kbn/data-views-plugin/common/data_view.stub';
import {
  computeParentPipelineColumns,
  convertMetricAggregationColumnWithoutSpecialParams,
  convertMetricAggregationToColumn,
  convertParentPipelineAggToColumns,
  createParentPipelineAggregationColumn,
  MetricAggregationColumn,
  ParentPipelineAggColumn,
} from './parent_pipeline';
import { SupportedMetric, SUPPORTED_METRICS } from '../metrics';
import { ColumnWithMeta, FormulaColumn } from './types';
import { TSVB_METRIC_TYPES } from '../../../../common/enums';
import { METRIC_TYPES } from '@kbn/data-plugin/public';
import { Operations } from '@kbn/visualizations-plugin/common';

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
      convertMetricAggregationColumnWithoutSpecialParams(
        operation,
        {
          series,
          dataView,
          metrics: [{ type: operation.name as MetricType, id: 'some-id' }],
        },
        {}
      )
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
      convertMetricAggregationColumnWithoutSpecialParams(
        operation,
        {
          series,
          dataView,
          metrics: [{ type: operation.name as MetricType, id: 'some-id' }],
        },
        {}
      )
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
      convertMetricAggregationColumnWithoutSpecialParams(
        operation,
        {
          series,
          dataView,
          metrics: [{ type: operation.name as MetricType, id: 'some-id' }],
        },
        {}
      )
    ).toEqual(expect.objectContaining(expected));
  });

  test.each<[string, SupportedMetric, Partial<ColumnWithMeta>]>([
    [
      SUPPORTED_METRICS.avg.name,
      SUPPORTED_METRICS.avg,
      {
        meta: { metricId: 'some-id' },
        operationType: 'average',
        params: {},
      },
    ],
    [
      SUPPORTED_METRICS.cardinality.name,
      SUPPORTED_METRICS.cardinality,
      {
        meta: { metricId: 'some-id' },
        operationType: 'unique_count',
        params: {},
      },
    ],
    [
      SUPPORTED_METRICS.max.name,
      SUPPORTED_METRICS.max,
      {
        meta: { metricId: 'some-id' },
        operationType: 'max',
        params: {},
      },
    ],
    [
      SUPPORTED_METRICS.min.name,
      SUPPORTED_METRICS.min,
      {
        meta: { metricId: 'some-id' },
        operationType: 'min',
        params: {},
      },
    ],
    [
      SUPPORTED_METRICS.sum.name,
      SUPPORTED_METRICS.sum,
      {
        meta: { metricId: 'some-id' },
        operationType: 'sum',
        params: {},
      },
    ],
    [
      SUPPORTED_METRICS.std_deviation.name,
      SUPPORTED_METRICS.std_deviation,
      {
        meta: { metricId: 'some-id' },
        operationType: 'standard_deviation',
        params: {},
      },
    ],
  ])('should return column for metric %s with valid field', (_, operation, expected) => {
    expect(
      convertMetricAggregationColumnWithoutSpecialParams(
        operation,
        {
          series,
          dataView,
          metrics: [
            { type: operation.name as MetricType, id: 'some-id', field: dataView.fields[0].name },
          ],
        },
        {}
      )
    ).toEqual(expect.objectContaining(expected));
  });
});

describe('convertMetricAggregationToColumn', () => {
  const dataView = stubLogstashDataView;
  const series = createSeries();
  test('should return null for not supported metric aggregation', () => {
    expect(
      convertMetricAggregationToColumn(SUPPORTED_METRICS.math, {
        series,
        dataView,
        metric: { type: TSVB_METRIC_TYPES.MATH, id: 'some-id', field: dataView.fields[0].name },
      })
    ).toBeNull();
  });

  test('should return null for supported metric aggregation with empty field if it is required', () => {
    expect(
      convertMetricAggregationToColumn(SUPPORTED_METRICS.avg, {
        series,
        dataView,
        metric: { type: METRIC_TYPES.AVG, id: 'some-id' },
      })
    ).toBeNull();
  });

  test('should return column for supported metric aggregation with empty field if it is not required', () => {
    expect(
      convertMetricAggregationToColumn(SUPPORTED_METRICS.count, {
        series,
        dataView,
        metric: { type: METRIC_TYPES.COUNT, id: 'some-id' },
      })
    ).toEqual(
      expect.objectContaining({
        meta: { metricId: 'some-id' },
        operationType: 'count',
        params: {},
      })
    );
  });

  const field = dataView.fields[0].name;
  const id = 'some-id';

  test.each<
    [
      string,
      Parameters<typeof convertMetricAggregationToColumn>,
      Partial<MetricAggregationColumn> | null
    ]
  >([
    [
      'null for percentile if metaValue is empty',
      [
        SUPPORTED_METRICS.percentile,
        { series, metric: { id, field, type: TSVB_METRIC_TYPES.PERCENTILE }, dataView },
      ],
      null,
    ],
    [
      'percentile column for percentile if metaValue is set',
      [
        SUPPORTED_METRICS.percentile,
        { series, metric: { id, field, type: TSVB_METRIC_TYPES.PERCENTILE }, dataView },
        { metaValue: 50 },
      ],
      {
        meta: { metricId: 'some-id' },
        operationType: 'percentile',
        params: { percentile: 50 },
      },
    ],
    [
      'percentile column for percentile if metaValue is set and reducedTimeRange is passed',
      [
        SUPPORTED_METRICS.percentile,
        { series, metric: { id, field, type: TSVB_METRIC_TYPES.PERCENTILE }, dataView },
        { metaValue: 50, reducedTimeRange: '10m' },
      ],
      {
        meta: { metricId: 'some-id' },
        operationType: 'percentile',
        params: { percentile: 50 },
        reducedTimeRange: '10m',
      },
    ],
    [
      'null for percentile rank if metaValue is empty',
      [
        SUPPORTED_METRICS.percentile_rank,
        { series, metric: { id, field, type: TSVB_METRIC_TYPES.PERCENTILE_RANK }, dataView },
      ],
      null,
    ],
    [
      'percentile rank column for percentile rank if metaValue is set',
      [
        SUPPORTED_METRICS.percentile_rank,
        { series, metric: { id, field, type: TSVB_METRIC_TYPES.PERCENTILE_RANK }, dataView },
        { metaValue: 50 },
      ],
      {
        meta: { metricId: 'some-id' },
        operationType: 'percentile_rank',
        params: { value: 50 },
      },
    ],
    [
      'percentile rank column for percentile rank if metaValue is set and reducedTimeRange is passed',
      [
        SUPPORTED_METRICS.percentile_rank,
        { series, metric: { id, field, type: TSVB_METRIC_TYPES.PERCENTILE_RANK }, dataView },
        { metaValue: 50, reducedTimeRange: '10m' },
      ],
      {
        meta: { metricId: 'some-id' },
        operationType: 'percentile_rank',
        params: { value: 50 },
        reducedTimeRange: '10m',
      },
    ],
    [
      'null for last value (unsupported)',
      [
        SUPPORTED_METRICS.top_hit,
        { series, metric: { id, field, type: TSVB_METRIC_TYPES.TOP_HIT }, dataView },
      ],
      null,
    ],
    [
      'column for other supported metrics',
      [
        SUPPORTED_METRICS.count,
        { series, metric: { id, field, type: METRIC_TYPES.COUNT }, dataView },
      ],
      {
        meta: { metricId: 'some-id' },
        operationType: 'count',
        params: {},
        sourceField: 'document',
      },
    ],
  ])('should return %s', (_, input, expected) => {
    if (expected === null) {
      expect(convertMetricAggregationToColumn(...input)).toBeNull();
    } else if (Array.isArray(expected)) {
      expect(convertMetricAggregationToColumn(...input)).toEqual(
        expected.map(expect.objectContaining)
      );
    } else {
      expect(convertMetricAggregationToColumn(...input)).toEqual(expect.objectContaining(expected));
    }
  });
});

describe('computeParentPipelineColumns', () => {
  const dataView = stubLogstashDataView;
  const series = createSeries();
  const field = dataView.fields[0].name;
  const field2 = dataView.fields[2].name;
  const id = 'some-id';

  test.each<
    [
      string,
      Parameters<typeof computeParentPipelineColumns>,
      (
        | Partial<FormulaColumn>
        | Array<Partial<MetricAggregationColumn> | Partial<ParentPipelineAggColumn>>
        | null
      )
    ]
  >([
    [
      'null for percentile if metaValue is empty',
      [
        Operations.MOVING_AVERAGE,
        { series, metric: { id, field, type: METRIC_TYPES.MEDIAN }, dataView },
        { id, field: field2, type: TSVB_METRIC_TYPES.PERCENTILE },
        SUPPORTED_METRICS.avg,
      ],
      null,
    ],
    [
      'formula column if sub metric is filter ratio',
      [
        Operations.MOVING_AVERAGE,
        { series, metric: { id, field, type: TSVB_METRIC_TYPES.PERCENTILE }, dataView },
        { id, field: field2, type: TSVB_METRIC_TYPES.FILTER_RATIO },
        SUPPORTED_METRICS.avg,
      ],
      {
        meta: { metricId: 'some-id' },
        operationType: 'formula',
        params: { formula: "percentile(count(kql='*') / count(kql='*'))" },
      },
    ],
    [
      'null if sub metric is filter ratio and metric_agg is set and not supported',
      [
        Operations.MOVING_AVERAGE,
        { series, metric: { id, field, type: TSVB_METRIC_TYPES.PERCENTILE }, dataView },
        {
          id,
          field: field2,
          type: TSVB_METRIC_TYPES.FILTER_RATIO,
          metric_agg: METRIC_TYPES.MEDIAN,
        },
        SUPPORTED_METRICS.avg,
      ],
      null,
    ],
    [
      'formula column if sub metric is filter ratio and metric_agg is set',
      [
        Operations.MOVING_AVERAGE,
        { series, metric: { id, field, type: TSVB_METRIC_TYPES.PERCENTILE }, dataView },
        { id, field, type: TSVB_METRIC_TYPES.FILTER_RATIO, metric_agg: METRIC_TYPES.AVG },
        SUPPORTED_METRICS.avg,
      ],
      {
        meta: { metricId: 'some-id' },
        operationType: 'formula',
        params: {
          formula: "percentile(average('bytes',kql='*') / average('bytes',kql='*'))",
        },
      },
    ],
    [
      'null if pipeline aggregation is not supported',
      [
        Operations.MOVING_AVERAGE,
        { series, metric: { id, field, type: METRIC_TYPES.AVG }, dataView },
        { id, field, type: TSVB_METRIC_TYPES.PERCENTILE },
        SUPPORTED_METRICS.avg_bucket,
      ],
      null,
    ],
    [
      'metric aggregation column if pipeline aggregation is supported',
      [
        Operations.MOVING_AVERAGE,
        { series, metric: { id, field, type: METRIC_TYPES.AVG }, dataView },
        { id, field, type: TSVB_METRIC_TYPES.PERCENTILE },
        SUPPORTED_METRICS.avg,
      ],
      [
        {
          meta: { metricId: 'some-id' },
          operationType: 'average',
          params: {},
          sourceField: 'bytes',
        },
        {
          meta: { metricId: 'some-id' },
          operationType: 'moving_average',
          params: { window: 5 },
        },
      ],
    ],
  ])('should return %s', (_, input, expected) => {
    if (expected === null) {
      expect(computeParentPipelineColumns(...input)).toBeNull();
    } else if (Array.isArray(expected)) {
      expect(computeParentPipelineColumns(...input)).toEqual(expected.map(expect.objectContaining));
    } else {
      expect(computeParentPipelineColumns(...input)).toEqual(expect.objectContaining(expected));
    }
  });

  test('pipeline aggregation columns with correct references', () => {
    const result = computeParentPipelineColumns(
      Operations.MOVING_AVERAGE,
      { series, metric: { id, field, type: METRIC_TYPES.AVG }, dataView },
      { id, field, type: TSVB_METRIC_TYPES.PERCENTILE },
      SUPPORTED_METRICS.avg
    );
    expect(result).not.toBeNull();

    expect(Array.isArray(result)).toBeTruthy();

    const [metricColumn, parentPipelineColumn] = result as [
      MetricAggregationColumn,
      ParentPipelineAggColumn
    ];
    expect(parentPipelineColumn.references).toContain(metricColumn.columnId);
  });
});

describe('convertParentPipelineAggToColumns', () => {
  const dataView = stubLogstashDataView;
  const series = createSeries();
  const field = dataView.fields[0].name;
  const id = 'some-id';
  const id1 = 'some-id-1';
  const id2 = 'some-id-2';

  test.each<
    [
      string,
      Parameters<typeof convertParentPipelineAggToColumns>,
      (
        | Partial<FormulaColumn>
        | Array<Partial<MetricAggregationColumn> | Partial<ParentPipelineAggColumn>>
        | null
      )
    ]
  >([
    [
      'null for metric which is not moving_average or derivative',
      [{ series, metrics: [{ id, field, type: TSVB_METRIC_TYPES.POSITIVE_ONLY }], dataView }],
      null,
    ],
    [
      'column for moving_average',
      [
        {
          series,
          metrics: [
            { id, field, type: METRIC_TYPES.MAX },
            { id: id1, field: `${id}`, type: METRIC_TYPES.DERIVATIVE },
            { id: id2, field: `${id1}`, type: TSVB_METRIC_TYPES.MOVING_AVERAGE },
          ],
          dataView,
        },
      ],
      {
        meta: { metricId: 'some-id-2' },
        operationType: 'formula',
        params: { formula: 'moving_average(differences(max(bytes)), window=5)' },
      },
    ],
    [
      'column for derivative',
      [
        {
          series,
          metrics: [
            { id, field, type: METRIC_TYPES.MAX },
            { id: id1, field: `${id}`, type: TSVB_METRIC_TYPES.MOVING_AVERAGE },
            { id: id2, field: `${id1}`, type: METRIC_TYPES.DERIVATIVE },
          ],
          dataView,
        },
      ],
      {
        meta: { metricId: 'some-id-2' },
        operationType: 'formula',
        params: { formula: 'differences(moving_average(max(bytes), window=5))' },
      },
    ],
    [
      'null for static sub metric (unsupported)',
      [
        {
          series,
          metrics: [
            { id, field, type: METRIC_TYPES.MAX },
            { id: id1, field: `${id}[75]`, type: TSVB_METRIC_TYPES.STATIC },
            { id: id2, field: `${id1}[50]`, type: METRIC_TYPES.DERIVATIVE },
          ],
          dataView,
        },
      ],
      null,
    ],
  ])('should return %s', (_, input, expected) => {
    if (expected === null) {
      expect(convertParentPipelineAggToColumns(...input)).toBeNull();
    } else if (Array.isArray(expected)) {
      expect(convertParentPipelineAggToColumns(...input)).toEqual(
        expected.map(expect.objectContaining)
      );
    } else {
      expect(convertParentPipelineAggToColumns(...input)).toEqual(
        expect.objectContaining(expected)
      );
    }
  });
});

describe('createParentPipelineAggregationColumn', () => {
  const dataView = stubLogstashDataView;
  const series = createSeries();
  const movingAvgMetric: Metric = {
    id: 'some-id-0',
    type: TSVB_METRIC_TYPES.MOVING_AVERAGE,
    field: dataView.fields[0].name,
  };

  const cumulativeSumMetric: Metric = {
    id: 'some-id-0',
    type: METRIC_TYPES.CUMULATIVE_SUM,
    field: dataView.fields[0].name,
  };

  const derivativeMetric: Metric = {
    id: 'some-id-0',
    type: METRIC_TYPES.DERIVATIVE,
    field: dataView.fields[0].name,
  };

  test.each<
    [
      string,
      Parameters<typeof createParentPipelineAggregationColumn>,
      Partial<ParentPipelineAggColumn>
    ]
  >([
    [
      'moving average column',
      [
        Operations.MOVING_AVERAGE,
        {
          series,
          metric: movingAvgMetric,
          dataView,
        },
      ],
      {
        meta: { metricId: 'some-id-0' },
        operationType: 'moving_average',
        params: { window: 5 },
      },
    ],
    [
      'moving average column with window',
      [
        Operations.MOVING_AVERAGE,
        {
          series,
          metric: {
            ...movingAvgMetric,
            window: 10,
          },
          dataView,
        },
      ],
      {
        meta: { metricId: 'some-id-0' },
        operationType: 'moving_average',
        params: { window: 10 },
      },
    ],
    [
      'cumulative sum column',
      [
        Operations.CUMULATIVE_SUM,
        {
          series,
          metric: cumulativeSumMetric,
          dataView,
        },
      ],
      {
        meta: { metricId: 'some-id-0' },
        operationType: 'cumulative_sum',
        params: {},
      },
    ],
    [
      'derivative column',
      [
        Operations.DIFFERENCES,
        {
          series,
          metric: derivativeMetric,
          dataView,
        },
      ],
      {
        meta: { metricId: 'some-id-0' },
        operationType: 'differences',
        params: {},
      },
    ],
  ])('should return %s', (_, input, expected) => {
    if (expected === null) {
      expect(createParentPipelineAggregationColumn(...input)).toBeNull();
    } else if (Array.isArray(expected)) {
      expect(createParentPipelineAggregationColumn(...input)).toEqual(
        expected.map(expect.objectContaining)
      );
    } else {
      expect(createParentPipelineAggregationColumn(...input)).toEqual(
        expect.objectContaining(expected)
      );
    }
  });
});
