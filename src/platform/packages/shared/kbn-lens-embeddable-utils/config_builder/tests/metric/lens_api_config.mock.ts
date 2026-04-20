/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { AS_CODE_DATA_VIEW_REFERENCE_TYPE } from '@kbn/as-code-data-views-schema';
import type { MetricState } from '../../schema';
import type { MetricStateNoESQL } from '../../schema/charts/metric';
import { DEFAULT_PRIMARY_VALUE_ALIGNMENT } from '../../transforms/charts/metric/defaults';

export const breakdownMetricAPIAttributes = {
  type: 'metric',
  title: 'Metric - Breakdown',
  description: 'Metric with breakdown',
  data_source: { type: AS_CODE_DATA_VIEW_REFERENCE_TYPE, ref_id: 'testId' },
  metrics: [
    {
      type: 'primary',
      operation: 'count',
      empty_as_null: true,
      color: {
        type: 'dynamic',
        range: 'absolute',
        steps: [{ lt: 0, color: 'red' }],
      },
    },
    {
      type: 'secondary',
      operation: 'average',
      field: 'bytes',
    },
  ],
  breakdown_by: {
    operation: 'terms',
    fields: ['extension.keyword'],
    limit: 5,
  },
} as MetricStateNoESQL;

export const complexMetricAPIAttributes = {
  type: 'metric',
  title: 'Metric - Complex case',
  description: 'Metric with background chart and breakdown',
  data_source: { type: AS_CODE_DATA_VIEW_REFERENCE_TYPE, ref_id: 'testId' },
  metrics: [
    {
      type: 'primary',
      operation: 'count',
      empty_as_null: true,
      color: {
        type: 'dynamic',
        range: 'absolute',
        steps: [{ lt: 0, color: 'red' }],
      },
      background_chart: {
        type: 'bar',
        max_value: {
          operation: 'percentile',
          field: 'bytes',
          percentile: 95,
        },
      },
    },
    {
      type: 'secondary',
      operation: 'average',
      field: 'bytes',
      compare: {
        to: 'baseline',
        baseline: 100,
        palette: 'status',
        value: false,
      },
    },
  ],
  breakdown_by: {
    operation: 'terms',
    fields: ['extension.keyword'],
    limit: 5,
  },
  styling: {
    primary: {
      position: 'top',
      value: { alignment: DEFAULT_PRIMARY_VALUE_ALIGNMENT },
    },
  },
} as MetricState;

export const simpleMetricAPIAttributes = {
  type: 'metric',
  title: 'Simple Metric',
  description: 'A simple metric visualization',
  data_source: { type: AS_CODE_DATA_VIEW_REFERENCE_TYPE, ref_id: 'testId' },
  metrics: [
    {
      type: 'primary',
      operation: 'count',
      label: 'Count of records',
      empty_as_null: true,
    },
  ],
} as MetricState;

export const complexESQLMetricAPIAttributes = {
  type: 'metric',
  title: 'Metric - ESQL Complex case',
  description: 'ESQL Metric with background chart and breakdown',
  data_source: { type: 'esql', query: 'FROM logs | STATS ...' },
  metrics: [
    {
      type: 'primary',
      column: 'count',
      color: {
        type: 'dynamic',
        range: 'absolute',
        steps: [{ lt: 0, color: 'red' }],
      },
      background_chart: {
        type: 'bar',
        max_value: {
          column: 'bytes',
        },
      },
    },
    {
      type: 'secondary',
      column: 'bytes',
      compare: {
        to: 'baseline',
        baseline: 100,
        palette: 'status',
        value: false,
      },
    },
  ],
  breakdown_by: {
    column: 'extension.keyword',
  },
} as MetricState;

export const metricAPIWithTermsRankedBySecondary = {
  type: 'metric',
  title: 'Metric - Breakdown ranked by secondary',
  description: 'Metric with breakdown ranked by secondary metric',
  data_source: { type: AS_CODE_DATA_VIEW_REFERENCE_TYPE, ref_id: 'testId' },
  ignore_global_filters: false,
  sampling: 1,
  metrics: [
    {
      type: 'primary',
      operation: 'count',
      empty_as_null: true,
      color: {
        type: 'dynamic',
        range: 'absolute',
        steps: [{ lt: 0, color: 'red' }],
      },
    },
    {
      type: 'secondary',
      operation: 'average',
      field: 'bytes',
    },
  ],
  breakdown_by: {
    operation: 'terms',
    fields: ['extension.keyword'],
    limit: 5,
    rank_by: {
      type: 'metric',
      metric_index: 1,
      direction: 'desc',
    },
  },
} as MetricState;
