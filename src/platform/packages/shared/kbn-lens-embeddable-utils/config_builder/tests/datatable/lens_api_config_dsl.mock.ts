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
 * Basic datatable with single metric column and ad hoc dataView
 */
export const singleMetricDatatableWithAdhocDataView: DatatableState = {
  title: 'Single metric',
  type: 'datatable',
  dataset: {
    type: 'index',
    index: 'test-index',
    time_field: '@timestamp',
  },
  sampling: 1,
  ignore_global_filters: false,
  metrics: [
    {
      operation: 'count',
      empty_as_null: true,
    },
  ],
};

/**
 * Datatable with multiple metrics, rows, and split_metrics_by columns
 */
export const multiMetricRowSplitByDatatableWithAdhocDataView: DatatableState = {
  title: 'Multiple metrics, rows, split by with ad hoc dataView',
  type: 'datatable',
  dataset: {
    type: 'index',
    index: 'test-index',
    time_field: '@timestamp',
  },
  sampling: 1,
  ignore_global_filters: false,
  metrics: [
    {
      operation: 'median',
      field: 'bytes',
    },
    {
      operation: 'average',
      field: 'bytes',
    },
  ],
  rows: [
    {
      operation: 'terms',
      fields: ['agent.keyword'],
      size: 3,
      other_bucket: {
        include_documents_without_field: false,
      },
      rank_by: {
        type: 'column',
        metric: 0,
        direction: 'desc',
      },
    },
    {
      operation: 'date_histogram',
      field: '@timestamp',
      suggested_interval: 'h',
      use_original_time_range: false,
      include_empty_rows: true,
      drop_partial_intervals: false,
    },
  ],
  split_metrics_by: [
    {
      operation: 'terms',
      fields: ['geo.src'],
      size: 3,
      other_bucket: {
        include_documents_without_field: false,
      },
      rank_by: {
        type: 'column',
        metric: 0,
        direction: 'desc',
      },
    },
    {
      operation: 'terms',
      fields: ['geo.dest'],
      size: 5,
      other_bucket: {
        include_documents_without_field: false,
      },
      rank_by: {
        type: 'column',
        metric: 0,
        direction: 'desc',
      },
    },
  ],
};

/**
 * Full config datatable and ad hoc dataView
 */
export const fullConfigDatatableWithAdhocDataView: DatatableState = {
  title: 'Multiple metrics, rows, split by with full config',
  type: 'datatable',
  dataset: {
    type: 'index',
    index: 'test-index',
    time_field: '@timestamp',
  },
  sampling: 1,
  ignore_global_filters: false,
  metrics: [
    {
      operation: 'median',
      field: 'bytes',
      alignment: 'center',
      apply_color_to: 'background',
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
    },
    {
      operation: 'average',
      field: 'bytes',
      visible: true,
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
  ],
  rows: [
    {
      operation: 'terms',
      fields: ['agent.keyword'],
      size: 3,
      other_bucket: {
        include_documents_without_field: false,
      },
      rank_by: {
        type: 'column',
        metric: 0,
        direction: 'desc',
      },
      alignment: 'right',
      apply_color_to: 'background',
      color: {
        mode: 'categorical',
        palette: 'default',
        mapping: [],
      },
    },
    {
      operation: 'date_histogram',
      field: '@timestamp',
      suggested_interval: 'h',
      use_original_time_range: false,
      include_empty_rows: true,
      drop_partial_intervals: false,
      visible: false,
    },
  ],
  split_metrics_by: [
    {
      operation: 'terms',
      fields: ['geo.src'],
      size: 3,
      other_bucket: {
        include_documents_without_field: false,
      },
      rank_by: {
        type: 'column',
        metric: 0,
        direction: 'desc',
      },
    },
    {
      operation: 'terms',
      fields: ['geo.dest'],
      size: 5,
      other_bucket: {
        include_documents_without_field: false,
      },
      rank_by: {
        type: 'column',
        metric: 0,
        direction: 'desc',
      },
    },
  ],
  density: {
    mode: 'compact',
    height: {
      value: {
        type: 'custom',
        lines: 3,
      },
      header: {
        type: 'auto',
      },
    },
  },
  paging: 10,
};

/**
 * Full config datatable and dataView
 */
export const fullConfigDatatableWithDataView: DatatableState = {
  title: 'Multiple metrics, rows, split by with full config',
  type: 'datatable',
  dataset: {
    type: 'dataView',
    id: 'my-custom-data-view-id',
  },
  sampling: 1,
  ignore_global_filters: false,
  metrics: [
    {
      operation: 'median',
      field: 'bytes',
      alignment: 'center',
      apply_color_to: 'background',
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
    },
    {
      operation: 'average',
      field: 'bytes',
      visible: true,
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
  ],
  rows: [
    {
      operation: 'terms',
      fields: ['agent.keyword'],
      size: 3,
      other_bucket: {
        include_documents_without_field: false,
      },
      rank_by: {
        type: 'column',
        metric: 0,
        direction: 'desc',
      },
      alignment: 'right',
      apply_color_to: 'background',
      color: {
        mode: 'categorical',
        palette: 'default',
        mapping: [],
      },
    },
    {
      operation: 'date_histogram',
      field: '@timestamp',
      suggested_interval: 'h',
      use_original_time_range: false,
      include_empty_rows: true,
      drop_partial_intervals: false,
      visible: false,
    },
  ],
  split_metrics_by: [
    {
      operation: 'terms',
      fields: ['geo.src'],
      size: 3,
      other_bucket: {
        include_documents_without_field: false,
      },
      rank_by: {
        type: 'column',
        metric: 0,
        direction: 'desc',
      },
    },
    {
      operation: 'terms',
      fields: ['geo.dest'],
      size: 5,
      other_bucket: {
        include_documents_without_field: false,
      },
      rank_by: {
        type: 'column',
        metric: 0,
        direction: 'desc',
      },
    },
  ],
  density: {
    mode: 'compact',
    height: {
      value: {
        type: 'custom',
        lines: 3,
      },
      header: {
        type: 'auto',
      },
    },
  },
  paging: 10,
};

/**
 * Datatable sorted by a pivoted metric column (split_metrics_by)
 */
export const sortedByPivotedMetricColumnDatatable: DatatableState = {
  title: 'Sorted by a pivoted metric column',
  type: 'datatable',
  dataset: {
    type: 'dataView',
    id: '90943e30-9a47-11e8-b64d-95841ca0b247',
  },
  sampling: 1,
  ignore_global_filters: false,
  metrics: [
    {
      operation: 'median',
      field: 'bytes',
      alignment: 'center',
      apply_color_to: 'background',
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
    },
    {
      operation: 'average',
      field: 'bytes',
      visible: true,
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
  ],
  rows: [
    {
      operation: 'terms',
      fields: ['agent.keyword'],
      size: 3,
      other_bucket: {
        include_documents_without_field: false,
      },
      rank_by: {
        type: 'column',
        metric: 0,
        direction: 'desc',
      },
      alignment: 'right',
      apply_color_to: 'background',
      color: {
        mode: 'categorical',
        palette: 'default',
        mapping: [],
      },
    },
    {
      operation: 'date_histogram',
      field: '@timestamp',
      suggested_interval: 'h',
      use_original_time_range: false,
      include_empty_rows: true,
      drop_partial_intervals: false,
      visible: false,
    },
  ],
  split_metrics_by: [
    {
      operation: 'terms',
      fields: ['geo.src'],
      size: 3,
      other_bucket: {
        include_documents_without_field: false,
      },
      rank_by: {
        type: 'column',
        metric: 0,
        direction: 'desc',
      },
    },
    {
      operation: 'terms',
      fields: ['geo.dest'],
      size: 5,
      other_bucket: {
        include_documents_without_field: false,
      },
      rank_by: {
        type: 'column',
        metric: 0,
        direction: 'desc',
      },
    },
  ],
  density: {
    mode: 'compact',
    height: {
      value: {
        type: 'custom',
        lines: 3,
      },
      header: {
        type: 'auto',
      },
    },
  },
  paging: 10,
  sort_by: {
    column_type: 'pivoted_metric',
    index: 0,
    values: ['US', 'CH'],
    direction: 'desc',
  },
};

/**
 * Datatable sorted by a row column
 */
export const sortedByRowDatatable: DatatableState = {
  title: 'Sorted by row column',
  type: 'datatable',
  dataset: {
    type: 'dataView',
    id: '90943e30-9a47-11e8-b64d-95841ca0b247',
  },
  sampling: 1,
  ignore_global_filters: false,
  metrics: [
    {
      operation: 'median',
      field: 'bytes',
      alignment: 'center',
      apply_color_to: 'background',
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
    },
    {
      operation: 'average',
      field: 'bytes',
      visible: true,
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
  ],
  rows: [
    {
      operation: 'terms',
      fields: ['agent.keyword'],
      size: 3,
      other_bucket: {
        include_documents_without_field: false,
      },
      rank_by: {
        type: 'column',
        metric: 0,
        direction: 'desc',
      },
      alignment: 'right',
      apply_color_to: 'background',
      color: {
        mode: 'categorical',
        palette: 'default',
        mapping: [],
      },
    },
    {
      operation: 'date_histogram',
      field: '@timestamp',
      suggested_interval: 'h',
      use_original_time_range: false,
      include_empty_rows: true,
      drop_partial_intervals: false,
      visible: false,
    },
  ],
  split_metrics_by: [
    {
      operation: 'terms',
      fields: ['geo.src'],
      size: 3,
      other_bucket: {
        include_documents_without_field: false,
      },
      rank_by: {
        type: 'column',
        metric: 0,
        direction: 'desc',
      },
    },
    {
      operation: 'terms',
      fields: ['geo.dest'],
      size: 5,
      other_bucket: {
        include_documents_without_field: false,
      },
      rank_by: {
        type: 'column',
        metric: 0,
        direction: 'desc',
      },
    },
  ],
  density: {
    mode: 'compact',
    height: {
      value: {
        type: 'custom',
        lines: 3,
      },
      header: {
        type: 'auto',
      },
    },
  },
  paging: 30,
  sort_by: {
    column_type: 'row',
    index: 1,
    direction: 'asc',
  },
};
