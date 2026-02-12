/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DatatableState, DatatableStateESQL } from '../../schema';

/**
 * Basic ESQL datatable with single metric column
 */
export const singleMetricESQLDatatable: DatatableState = {
  title: 'Single metric',
  type: 'datatable',
  dataset: {
    type: 'esql',
    query: 'FROM kibana_sample_data_logs | LIMIT 100',
  },
  sampling: 1,
  ignore_global_filters: false,
  metrics: [
    {
      operation: 'value',
      column: 'bytes',
    },
  ],
} satisfies DatatableStateESQL;

/**
 * ESQL datatable with multiple metrics, rows, and split_metrics_by columns
 */
export const multipleMetricRowSplitESQLDatatable: DatatableState = {
  title: 'Multiple metrics, rows, split by',
  type: 'datatable',
  dataset: {
    type: 'esql',
    query: 'FROM kibana_sample_data_logs | LIMIT 10',
  },
  sampling: 1,
  ignore_global_filters: false,
  metrics: [
    {
      operation: 'value',
      column: 'bytes',
    },
    {
      operation: 'value',
      column: 'bytes_counter',
    },
  ],
  rows: [
    {
      operation: 'value',
      column: '@timestamp',
    },
    {
      operation: 'value',
      column: 'agent',
    },
  ],
  split_metrics_by: [
    {
      operation: 'value',
      column: 'geo.src',
    },
    {
      operation: 'value',
      column: 'geo.dest',
    },
  ],
} satisfies DatatableStateESQL;

/**
 * Full config ESQL datatable
 */
export const fullConfigESQLDatatable: DatatableState = {
  title: 'Full config',
  type: 'datatable',
  dataset: {
    type: 'esql',
    query: 'FROM kibana_sample_data_logs | LIMIT 10',
  },
  sampling: 1,
  ignore_global_filters: false,
  metrics: [
    {
      operation: 'value',
      column: 'bytes',
      alignment: 'center',
      apply_color_to: 'value',
      color: {
        type: 'dynamic',
        range: 'absolute',
        steps: [
          {
            color: '#d4efe6',
            lt: 20,
          },
          {
            color: '#b1e4d1',
            gte: 20,
            lt: 40,
          },
          {
            color: '#8cd9bb',
            gte: 40,
            lt: 60,
          },
          {
            color: '#62cea6',
            gte: 60,
            lt: 80,
          },
          {
            color: '#24c292',
            gte: 80,
            lte: 100,
          },
        ],
      },
      summary: {
        type: 'avg',
      },
    },
    {
      operation: 'value',
      column: 'bytes_counter',
      visible: false,
    },
  ],
  rows: [
    {
      operation: 'value',
      column: '@timestamp',
      visible: false,
      click_filter: true,
    },
    {
      operation: 'value',
      column: 'agent',
      alignment: 'center',
      apply_color_to: 'value',
    },
  ],
  split_metrics_by: [
    {
      operation: 'value',
      column: 'geo.src',
    },
    {
      operation: 'value',
      column: 'geo.dest',
    },
  ],
  density: {
    mode: 'compact',
    height: {
      value: {
        type: 'auto',
      },
      header: {
        type: 'custom',
        max_lines: 4,
      },
    },
  },
  paging: 10,
} satisfies DatatableStateESQL;

/**
 * ESQL datatable sorted by a transposed metric column
 */
export const sortedByTransposedMetricColumnESQLDatatable: DatatableState = {
  title: 'Sorted by transposed metric column',
  type: 'datatable',
  dataset: {
    type: 'esql',
    query: 'FROM kibana_sample_data_logs | LIMIT 10',
  },
  sampling: 1,
  ignore_global_filters: false,
  metrics: [
    {
      operation: 'value',
      column: 'bytes',
      alignment: 'center',
      apply_color_to: 'value',
      color: {
        type: 'dynamic',
        range: 'absolute',
        steps: [
          {
            color: '#d4efe6',
            lt: 20,
          },
          {
            color: '#b1e4d1',
            gte: 20,
            lt: 40,
          },
          {
            color: '#8cd9bb',
            gte: 40,
            lt: 60,
          },
          {
            color: '#62cea6',
            gte: 60,
            lt: 80,
          },
          {
            color: '#24c292',
            gte: 80,
            lte: 100,
          },
        ],
      },
      summary: {
        type: 'avg',
      },
    },
    {
      operation: 'value',
      column: 'bytes_counter',
      visible: false,
    },
  ],
  rows: [
    {
      operation: 'value',
      column: '@timestamp',
      visible: false,
      click_filter: true,
    },
    {
      operation: 'value',
      column: 'agent',
      alignment: 'center',
      apply_color_to: 'value',
    },
  ],
  split_metrics_by: [
    {
      operation: 'value',
      column: 'geo.src',
    },
    {
      operation: 'value',
      column: 'geo.dest',
    },
  ],
  density: {
    mode: 'compact',
    height: {
      value: {
        type: 'auto',
      },
      header: {
        type: 'custom',
        max_lines: 4,
      },
    },
  },
  paging: 10,
  sort_by: {
    column_type: 'split_metrics_by',
    metric_index: 0,
    values: ['US', 'MM'],
    direction: 'desc',
  },
} satisfies DatatableStateESQL;

/**
 * ESQL datatable sorted by a row column
 */
export const sortedByRowColumnESQLDatatable: DatatableState = {
  title: 'Sorted by row column',
  type: 'datatable',
  dataset: {
    type: 'esql',
    query: 'FROM kibana_sample_data_logs | LIMIT 10',
  },
  sampling: 1,
  ignore_global_filters: false,
  metrics: [
    {
      operation: 'value',
      column: 'bytes',
      alignment: 'center',
      apply_color_to: 'value',
      color: {
        type: 'dynamic',
        range: 'absolute',
        steps: [
          {
            color: '#d4efe6',
            lt: 20,
          },
          {
            color: '#b1e4d1',
            gte: 20,
            lt: 40,
          },
          {
            color: '#8cd9bb',
            gte: 40,
            lt: 60,
          },
          {
            color: '#62cea6',
            gte: 60,
            lt: 80,
          },
          {
            color: '#24c292',
            gte: 80,
            lte: 100,
          },
        ],
      },
      summary: {
        type: 'avg',
      },
    },
    {
      operation: 'value',
      column: 'bytes_counter',
      visible: false,
    },
  ],
  rows: [
    {
      operation: 'value',
      column: '@timestamp',
      visible: false,
      click_filter: true,
    },
    {
      operation: 'value',
      column: 'agent',
      alignment: 'center',
      apply_color_to: 'value',
    },
  ],
  split_metrics_by: [
    {
      operation: 'value',
      column: 'geo.src',
    },
    {
      operation: 'value',
      column: 'geo.dest',
    },
  ],
  density: {
    mode: 'compact',
    height: {
      value: {
        type: 'auto',
      },
      header: {
        type: 'custom',
        max_lines: 4,
      },
    },
  },
  paging: 10,
  sort_by: {
    column_type: 'row',
    index: 1,
    direction: 'desc',
  },
} satisfies DatatableStateESQL;
