/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DatatableState } from '../../schema';

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
};

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
};

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
            type: 'from',
            color: '#d4efe6',
            from: 20,
          },
          {
            type: 'exact',
            color: '#b1e4d1',
            value: 40,
          },
          {
            type: 'exact',
            color: '#8cd9bb',
            value: 60,
          },
          {
            type: 'exact',
            color: '#62cea6',
            value: 80,
          },
          {
            type: 'to',
            color: '#24c292',
            to: 100,
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
};

/**
 * ESQL datatable sorted by a pivoted metric column (split_metrics_by)
 */
export const sortedByPivotedMetricColumnESQLDatatable: DatatableState = {
  title: 'Sorted by pivoted metric column',
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
            type: 'from',
            color: '#d4efe6',
            from: 20,
          },
          {
            type: 'exact',
            color: '#b1e4d1',
            value: 40,
          },
          {
            type: 'exact',
            color: '#8cd9bb',
            value: 60,
          },
          {
            type: 'exact',
            color: '#62cea6',
            value: 80,
          },
          {
            type: 'to',
            color: '#24c292',
            to: 100,
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
    column_type: 'pivoted_metric',
    index: 0,
    values: ['US', 'MM'],
    direction: 'desc',
  },
};

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
            type: 'from',
            color: '#d4efe6',
            from: 20,
          },
          {
            type: 'exact',
            color: '#b1e4d1',
            value: 40,
          },
          {
            type: 'exact',
            color: '#8cd9bb',
            value: 60,
          },
          {
            type: 'exact',
            color: '#62cea6',
            value: 80,
          },
          {
            type: 'to',
            color: '#24c292',
            to: 100,
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
};
