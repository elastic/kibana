/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { createSeries } from '../__mocks__';
import {
  createFormulaColumn,
  convertMathToFormulaColumn,
  convertOtherAggsToFormulaColumn,
} from './formula';
import { FormulaColumn } from './types';
import { Metric } from '../../../../common/types';
import { TSVB_METRIC_TYPES } from '../../../../common/enums';
import {
  createStubDataView,
  stubLogstashDataView,
} from '@kbn/data-views-plugin/common/data_view.stub';
import { METRIC_TYPES } from '@kbn/data-plugin/public';
import { stubLogstashFieldSpecMap } from '@kbn/data-views-plugin/common/field.stub';

describe('createFormulaColumn', () => {
  const dataView = stubLogstashDataView;
  const dataViewWithInvalidFormats = createStubDataView({
    spec: {
      id: 'logstash-*',
      title: 'logstash-*',
      timeFieldName: 'time',
      fields: stubLogstashFieldSpecMap,
    },
  });

  dataViewWithInvalidFormats.getFormatterForField = jest.fn().mockImplementation(() => ({
    type: {
      id: 'date',
    },
  }));

  const series = createSeries();
  const seriesWithValidFormatter = createSeries({ formatter: 'percent' });
  const seriesWithDefaultFormatter = createSeries({ formatter: '' });

  const metric: Metric = {
    id: 'some-id',
    type: TSVB_METRIC_TYPES.MATH,
  };
  const metricWithField: Metric = {
    id: 'some-id',
    type: METRIC_TYPES.AVG,
    field: dataView.fields[0].name,
  };

  const metricWithFieldWithUnsupportedFormat: Metric = {
    id: 'some-id',
    type: METRIC_TYPES.AVG,
    field: dataView.fields[2].name, // 'date' formatter
  };

  const formula = 'count() / 2';

  test.each<[string, Parameters<typeof createFormulaColumn>, Partial<FormulaColumn> | null]>([
    [
      'formula column',
      [formula, { series, metric, dataView }],
      {
        meta: { metricId: 'some-id' },
        operationType: 'formula',
        params: { formula },
      },
    ],
    [
      'formula column with format of series',
      [formula, { series: seriesWithValidFormatter, metric: metricWithField, dataView }],
      {
        meta: { metricId: 'some-id' },
        operationType: 'formula',
        params: { format: { id: 'percent' }, formula },
      },
    ],
    [
      'formula column without format if custom formatter is not supported',
      [formula, { series: seriesWithDefaultFormatter, metric: metricWithField, dataView }],
      {
        meta: { metricId: 'some-id' },
        operationType: 'formula',
        params: { formula },
      },
    ],
    [
      'formula column without format if field format is not supported',
      [
        formula,
        {
          series,
          metric: metricWithFieldWithUnsupportedFormat,
          dataView: dataViewWithInvalidFormats,
        },
      ],
      {
        meta: { metricId: 'some-id' },
        operationType: 'formula',
        params: { formula },
      },
    ],
  ])('should return %s', (_, input, expected) => {
    if (expected === null) {
      expect(createFormulaColumn(...input)).toBeNull();
    } else if (Array.isArray(expected)) {
      expect(createFormulaColumn(...input)).toEqual(expected.map(expect.objectContaining));
    } else {
      expect(createFormulaColumn(...input)).toEqual(expect.objectContaining(expected));
    }
  });
});

describe('convertMathToFormulaColumn', () => {
  const dataView = stubLogstashDataView;
  const dataViewWithInvalidFormats = createStubDataView({
    spec: {
      id: 'logstash-*',
      title: 'logstash-*',
      timeFieldName: 'time',
      fields: stubLogstashFieldSpecMap,
    },
  });

  dataViewWithInvalidFormats.getFormatterForField = jest.fn().mockImplementation(() => ({
    type: {
      id: 'date',
    },
  }));

  const series = createSeries();
  const avgMetric: Metric = {
    id: 'some-id-0',
    type: METRIC_TYPES.AVG,
    field: dataView.fields[0].name,
  };

  const notSupportedMetric: Metric = {
    id: 'some-id-0',
    type: METRIC_TYPES.MEDIAN,
    field: dataView.fields[0].name,
  };

  const notSupportedTopHitMetricWithSize: Metric = {
    id: 'some-id-0',
    type: TSVB_METRIC_TYPES.TOP_HIT,
    field: dataView.fields[0].name,
    size: 2,
  };

  const notSupportedAvgMetric: Metric = {
    ...avgMetric,
    order: 'asc',
  };

  const script = 'params.avg_bytes / 2';

  const mathMetricWithoutScript: Metric = {
    id: 'some-id-1',
    type: TSVB_METRIC_TYPES.MATH,
  };

  const mathMetricWithoutVariables: Metric = {
    ...mathMetricWithoutScript,
    script,
  };

  const mathMetric: Metric = {
    ...mathMetricWithoutVariables,
    variables: [{ id: 'params.avg_bytes-id', field: avgMetric.id, name: 'avg_bytes' }],
  };

  const percentileScript = 'params.percentile_bytes / 2';

  const percentileMetric: Metric = {
    id: 'percentile_id',
    type: TSVB_METRIC_TYPES.PERCENTILE,
    field: dataView.fields[0].name,
  };

  const mathMetricWithPercentile: Metric = {
    ...mathMetricWithoutVariables,
    script: percentileScript,
    variables: [
      {
        id: 'params.percentile_bytes_id',
        field: `${percentileMetric.id}[50]`,
        name: 'percentile_bytes',
      },
    ],
  };

  const percentileRankMetric: Metric = {
    id: 'percentile_rank_id',
    type: TSVB_METRIC_TYPES.PERCENTILE_RANK,
    field: dataView.fields[0].name,
  };

  const mathMetricWithPercentileRank: Metric = {
    ...mathMetricWithoutVariables,
    script: percentileScript,
    variables: [
      {
        id: 'params.percentile_bytes_id',
        field: `${percentileRankMetric.id}[50]`,
        name: 'percentile_bytes',
      },
    ],
  };

  test.each<[string, Parameters<typeof convertMathToFormulaColumn>, Partial<FormulaColumn> | null]>(
    [
      ['null if no math metric was provided', [{ series, metrics: [avgMetric], dataView }], null],
      [
        "null if math metric doesn't contain script",
        [{ series, metrics: [mathMetricWithoutScript], dataView }],
        null,
      ],
      [
        'null if not supported metric is provided',
        [{ series, metrics: [notSupportedMetric], dataView }],
        null,
      ],
      [
        "null if math metric doesn't contain variables",
        [{ series, metrics: [mathMetricWithoutVariables], dataView }],
        null,
      ],
      [
        "null if math metric's script contains params, not covered by other metrics",
        [{ series, metrics: [mathMetric], dataView }],
        null,
      ],
      [
        'null if some of the metrics is top_hit with size more than 1',
        [{ series, metrics: [notSupportedTopHitMetricWithSize, mathMetric], dataView }],
        null,
      ],
      [
        'null if some of the metrics contains order=asc',
        [{ series, metrics: [notSupportedAvgMetric, mathMetric], dataView }],
        null,
      ],
      [
        'formula column if it is possible to convert script with vars to math formula',
        [{ series, metrics: [avgMetric, mathMetric], dataView }],
        {
          meta: { metricId: 'some-id-1' },
          operationType: 'formula',
          params: { formula: 'average(bytes) / 2' },
        },
      ],
      [
        'formula column if percentile metric is provided',
        [{ series, metrics: [percentileMetric, mathMetricWithPercentile], dataView }],
        {
          meta: { metricId: 'some-id-1' },
          operationType: 'formula',
          params: { formula: 'percentile(bytes, percentile=50) / 2' },
        },
      ],
      [
        'formula column if percentile_rank metric is provided',
        [{ series, metrics: [percentileRankMetric, mathMetricWithPercentileRank], dataView }],
        {
          meta: { metricId: 'some-id-1' },
          operationType: 'formula',
          params: { formula: 'percentile_rank(bytes, value=50) / 2' },
        },
      ],
      [
        'formula column if script is purely math and has something except static number',
        [{ series, metrics: [{ ...mathMetric, script: 'a' }], dataView }],
        {
          meta: { metricId: 'some-id-1' },
          operationType: 'formula',
          params: { formula: 'a' },
        },
      ],
      [
        'null if script is purely math and contains static number only',
        [{ series, metrics: [{ ...mathMetric, script: '1' }], dataView }],
        null,
      ],
    ]
  )('should return %s', (_, input, expected) => {
    if (expected === null) {
      expect(convertMathToFormulaColumn(...input)).toBeNull();
    } else if (Array.isArray(expected)) {
      expect(convertMathToFormulaColumn(...input)).toEqual(expected.map(expect.objectContaining));
    } else {
      expect(convertMathToFormulaColumn(...input)).toEqual(expect.objectContaining(expected));
    }
  });
});

describe('convertOtherAggsToFormulaColumn', () => {
  const dataView = stubLogstashDataView;
  const series = createSeries();
  const avgMetric: Metric = {
    id: 'some-id-0',
    type: METRIC_TYPES.AVG,
    field: dataView.fields[0].name,
  };

  const field = `${avgMetric.id}`;
  const id = 'some-id-1[50]';

  test.each<
    [string, Parameters<typeof convertOtherAggsToFormulaColumn>, Partial<FormulaColumn> | null]
  >([
    [
      'null if no nested metric was provided',
      [
        METRIC_TYPES.AVG_BUCKET,
        { series, metrics: [{ type: METRIC_TYPES.AVG_BUCKET, id, field }], dataView },
      ],
      null,
    ],
    [
      'formula column if no nested metric was provided',
      [
        METRIC_TYPES.AVG_BUCKET,
        {
          series,
          metrics: [avgMetric, { type: METRIC_TYPES.AVG_BUCKET, id, field }],
          dataView,
        },
      ],
      {
        meta: { metricId: 'some-id-1[50]' },
        operationType: 'formula',
        params: { formula: 'overall_average(average(bytes))' },
      },
    ],
    [
      'null if no nested metric was provided and aggregation is positive_only',
      [
        TSVB_METRIC_TYPES.POSITIVE_ONLY,
        { series, metrics: [{ type: TSVB_METRIC_TYPES.POSITIVE_ONLY, id, field }], dataView },
      ],
      null,
    ],
    [
      'formula column if no nested metric was provided and aggregation is positive_only',
      [
        TSVB_METRIC_TYPES.POSITIVE_ONLY,
        {
          series,
          metrics: [avgMetric, { type: TSVB_METRIC_TYPES.POSITIVE_ONLY, id, field }],
          dataView,
        },
      ],
      {
        meta: { metricId: id },
        operationType: 'formula',
        params: { formula: 'pick_max(average(bytes), 0)' },
      },
    ],
  ])('should return %s', (_, input, expected) => {
    if (expected === null) {
      expect(convertOtherAggsToFormulaColumn(...input)).toBeNull();
    } else if (Array.isArray(expected)) {
      expect(convertOtherAggsToFormulaColumn(...input)).toEqual(
        expected.map(expect.objectContaining)
      );
    } else {
      expect(convertOtherAggsToFormulaColumn(...input)).toEqual(expect.objectContaining(expected));
    }
  });
});
