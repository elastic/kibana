/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DatatableConfig, DatatableConfigESQL } from '../../schema';

/**
 * Basic ESQL datatable with single metric column
 */
export const singleMetricESQLDatatable: DatatableConfig = {
  title: 'Single metric',
  type: 'data_table',
  data_source: {
    type: 'esql',
    query: 'FROM kibana_sample_data_logs | LIMIT 100',
  },
  sampling: 1,
  ignore_global_filters: false,
  metrics: [
    {
      column: 'bytes',
    },
  ],
} satisfies DatatableConfigESQL;

/**
 * ESQL datatable with multiple metrics, rows, and split_metrics_by columns
 */
export const multipleMetricRowSplitESQLDatatable: DatatableConfig = {
  title: 'Multiple metrics, rows, split by',
  type: 'data_table',
  data_source: {
    type: 'esql',
    query: 'FROM kibana_sample_data_logs | LIMIT 10',
  },
  sampling: 1,
  ignore_global_filters: false,
  metrics: [
    {
      column: 'bytes',
    },
    {
      column: 'bytes_counter',
    },
  ],
  rows: [
    {
      column: '@timestamp',
    },
    {
      column: 'agent',
    },
  ],
  split_metrics_by: [
    {
      column: 'geo.src',
    },
    {
      column: 'geo.dest',
    },
  ],
} satisfies DatatableConfigESQL;

/**
 * Full config ESQL datatable
 */
export const fullConfigESQLDatatable: DatatableConfig = {
  title: 'Full config',
  type: 'data_table',
  data_source: {
    type: 'esql',
    query: 'FROM kibana_sample_data_logs | LIMIT 10',
  },
  sampling: 1,
  ignore_global_filters: false,
  metrics: [
    {
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
      column: 'bytes_counter',
      visible: false,
    },
  ],
  rows: [
    {
      column: '@timestamp',
      visible: false,
      click_filter: true,
    },
    {
      column: 'agent',
      alignment: 'center',
      apply_color_to: 'value',
    },
  ],
  split_metrics_by: [
    {
      column: 'geo.src',
    },
    {
      column: 'geo.dest',
    },
  ],
  styling: {
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
  },
} satisfies DatatableConfigESQL;

/**
 * ESQL datatable sorted by a pivoted metric column (split_metrics_by)
 */
export const sortedByPivotedMetricColumnESQLDatatable: DatatableConfig = {
  title: 'Sorted by pivoted metric column',
  type: 'data_table',
  data_source: {
    type: 'esql',
    query: 'FROM kibana_sample_data_logs | LIMIT 10',
  },
  sampling: 1,
  ignore_global_filters: false,
  metrics: [
    {
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
      column: 'bytes_counter',
      visible: false,
    },
  ],
  rows: [
    {
      column: '@timestamp',
      visible: false,
      click_filter: true,
    },
    {
      column: 'agent',
      alignment: 'center',
      apply_color_to: 'value',
    },
  ],
  split_metrics_by: [
    {
      column: 'geo.src',
    },
    {
      column: 'geo.dest',
    },
  ],
  styling: {
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
      column_type: 'pivoted_metric',
      index: 0,
      values: ['US', 'MM'],
      direction: 'desc',
    },
  },
} satisfies DatatableConfigESQL;

/**
 * ESQL datatable sorted by a row column
 */
export const sortedByRowColumnESQLDatatable: DatatableConfig = {
  title: 'Sorted by row column',
  type: 'data_table',
  data_source: {
    type: 'esql',
    query: 'FROM kibana_sample_data_logs | LIMIT 10',
  },
  sampling: 1,
  ignore_global_filters: false,
  metrics: [
    {
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
      column: 'bytes_counter',
      visible: false,
    },
  ],
  rows: [
    {
      column: '@timestamp',
      visible: false,
      click_filter: true,
    },
    {
      column: 'agent',
      alignment: 'center',
      apply_color_to: 'value',
    },
  ],
  split_metrics_by: [
    {
      column: 'geo.src',
    },
    {
      column: 'geo.dest',
    },
  ],
  styling: {
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
  },
} satisfies DatatableConfigESQL;
