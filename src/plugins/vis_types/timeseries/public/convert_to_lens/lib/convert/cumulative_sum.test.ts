/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { METRIC_TYPES } from '@kbn/data-plugin/public';
import { stubLogstashDataView } from '@kbn/data-views-plugin/common/data_view.stub';
import { TSVB_METRIC_TYPES } from '../../../../common/enums';
import type { Metric } from '../../../../common/types';
import { createSeries } from '../__mocks__';
import { convertToCumulativeSumColumns } from './cumulative_sum';
import { Column, CommonColumnsConverterArgs, FormulaColumn } from './types';

const dataView = stubLogstashDataView;
const series = createSeries();
const metric: Metric = {
  id: 'some-id',
  type: METRIC_TYPES.CUMULATIVE_SUM,
};
const subAggMetric: Metric = {
  id: 'some-random-value',
  type: METRIC_TYPES.AVG,
  field: dataView.fields[0].name,
};

const countValueMetric: Metric = {
  id: 'some-random-value',
  type: METRIC_TYPES.VALUE_COUNT,
  field: dataView.fields[0].name,
};

const countMetric: Metric = {
  id: 'some-random-value',
  type: METRIC_TYPES.COUNT,
  field: dataView.fields[0].name,
};

const notSupportedSubAggMetric: Metric = {
  id: 'some-random-value',
  type: METRIC_TYPES.MEDIAN,
};
const staticSubAggMetric: Metric = {
  id: 'some-random-value',
  type: TSVB_METRIC_TYPES.STATIC,
};
const metaValue = `50`;
const reducedTimeRange = '1h';

describe('convertToCumulativeSumColumns', () => {
  test.each<
    [
      string,
      [common: CommonColumnsConverterArgs, reducedTimeRange?: string],
      Partial<FormulaColumn> | Array<Partial<Column>> | null
    ]
  >([
    ['null if metric contains empty field param', [{ series, metrics: [metric], dataView }], null],
    [
      "null if metrics array doesn't contain metric with specified id",
      [
        {
          series,
          metrics: [subAggMetric, { ...metric, field: dataView.fields[0].name }],
          dataView,
        },
      ],
      null,
    ],
    [
      'null if submetric is pointing to the static aggregation',
      [
        {
          series,
          metrics: [staticSubAggMetric, { ...metric, field: `${staticSubAggMetric.id}[50]` }],
          dataView,
        },
      ],
      null,
    ],
    [
      'null if submetric is pointing to the not supported aggregation',
      [
        {
          series,
          metrics: [
            notSupportedSubAggMetric,
            { ...metric, field: `${notSupportedSubAggMetric.id}[50]` },
          ],
          dataView,
        },
      ],
      null,
    ],
    [
      'formula if submetric is pointing to aggregation',
      [
        {
          series,
          metrics: [subAggMetric, { ...metric, field: `${subAggMetric.id}[50]` }],
          dataView,
        },
      ],
      {
        operationType: 'formula',
        meta: { metricId: metric.id },
        params: { formula: 'cumulative_sum(average(bytes))' },
      },
    ],
    [
      'formula if submetric is count with field',
      [
        {
          series,
          metrics: [countValueMetric, { ...metric, field: `${subAggMetric.id}[50]` }],
          dataView,
        },
      ],
      {
        meta: { metricId: 'some-id' },
        operationType: 'formula',
        params: { formula: 'cumulative_sum(count(bytes))' },
      },
    ],

    [
      'columns with parent aggregation if submetric is count',
      [
        {
          series,
          metrics: [countMetric, { ...metric, field: `${subAggMetric.id}[50]` }],
          dataView,
        },
      ],
      [
        {
          operationType: 'count',
          sourceField: 'document',
          meta: { metricId: subAggMetric.id },
        },
        {
          operationType: 'cumulative_sum',
          meta: { metricId: metric.id },
        },
      ],
    ],
    [
      'columns with parent aggregation if submetric is sum',
      [
        {
          series,
          metrics: [
            { ...subAggMetric, type: METRIC_TYPES.SUM },
            { ...metric, field: `${subAggMetric.id}[50]` },
          ],
          dataView,
        },
      ],
      [
        {
          operationType: 'sum',
          sourceField: subAggMetric.field,
          meta: { metricId: subAggMetric.id },
        },
        {
          operationType: 'cumulative_sum',
          meta: { metricId: metric.id },
        },
      ],
    ],
    [
      'formula with used meta if submetric is percentile',
      [
        {
          series,
          metrics: [
            { ...subAggMetric, type: TSVB_METRIC_TYPES.PERCENTILE },
            { ...metric, field: `${subAggMetric.id}[${metaValue}]` },
          ],
          dataView,
        },
      ],
      {
        operationType: 'formula',
        meta: { metricId: 'some-id' },
        params: {
          formula: `cumulative_sum(percentile(${subAggMetric.field}, percentile=${metaValue}))`,
        },
      },
    ],
    [
      'formula with used meta if submetric is percentile rank',
      [
        {
          series,
          metrics: [
            { ...subAggMetric, type: TSVB_METRIC_TYPES.PERCENTILE_RANK },
            { ...metric, field: `${subAggMetric.id}[${metaValue}]` },
          ],
          dataView,
        },
      ],
      {
        operationType: 'formula',
        meta: { metricId: metric.id },
        params: {
          formula: `cumulative_sum(percentile_rank(${subAggMetric.field}, value=${metaValue}))`,
        },
      },
    ],
    [
      'formula with time range if submetric is percentile and reducedTimeRange is specified',
      [
        {
          series,
          metrics: [
            { ...subAggMetric, type: TSVB_METRIC_TYPES.PERCENTILE },
            { ...metric, field: `${subAggMetric.id}[${metaValue}]` },
          ],
          dataView,
        },
        reducedTimeRange,
      ],
      {
        operationType: 'formula',
        meta: { metricId: metric.id },
        params: {
          formula: `cumulative_sum(percentile(${subAggMetric.field}, percentile=${metaValue}, reducedTimeRange='${reducedTimeRange}'))`,
        },
      },
    ],
  ])('should return %s', (_, input, expected) => {
    if (expected === null) {
      expect(convertToCumulativeSumColumns(...input)).toBeNull();
    } else if (Array.isArray(expected)) {
      expect(convertToCumulativeSumColumns(...input)).toEqual(
        expected.map(expect.objectContaining)
      );
    } else {
      expect(convertToCumulativeSumColumns(...input)).toEqual(expect.objectContaining(expected));
    }
  });
});
