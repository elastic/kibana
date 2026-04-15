/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  AS_CODE_DATA_VIEW_REFERENCE_TYPE,
  AS_CODE_DATA_VIEW_SPEC_TYPE,
} from '@kbn/as-code-data-views-schema';
import type { DatatableState, DatatableStateNoESQL } from '../../schema';

/**
 * Basic datatable with single metric column and ad hoc dataView
 */
export const singleMetricDatatableWithAdhocDataView: DatatableState = {
  title: 'Single metric',
  type: 'data_table',
  data_source: {
    type: AS_CODE_DATA_VIEW_SPEC_TYPE,
    index_pattern: 'test-index',
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
} satisfies DatatableStateNoESQL;

/**
 * Datatable with multiple metrics, rows, and split_metrics_by columns
 */
export const multiMetricRowSplitByDatatableWithAdhocDataView: DatatableState = {
  title: 'Multiple metrics, rows, split by with ad hoc dataView',
  type: 'data_table',
  data_source: {
    type: AS_CODE_DATA_VIEW_SPEC_TYPE,
    index_pattern: 'test-index',
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
      limit: 3,
      other_bucket: {
        include_documents_without_field: false,
      },
      rank_by: {
        type: 'metric',
        metric_index: 0,
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
      limit: 3,
      other_bucket: {
        include_documents_without_field: false,
      },
      rank_by: {
        type: 'metric',
        metric_index: 0,
        direction: 'desc',
      },
    },
    {
      operation: 'terms',
      fields: ['geo.dest'],
      limit: 5,
      other_bucket: {
        include_documents_without_field: false,
      },
      rank_by: {
        type: 'metric',
        metric_index: 0,
        direction: 'desc',
      },
    },
  ],
} satisfies DatatableStateNoESQL;

/**
 * Full config datatable and ad hoc dataView
 */
export const fullConfigDatatableWithAdhocDataView: DatatableState = {
  title: 'Multiple metrics, rows, split by with full config',
  type: 'data_table',
  data_source: {
    type: AS_CODE_DATA_VIEW_SPEC_TYPE,
    index_pattern: 'test-index',
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
  ],
  rows: [
    {
      operation: 'terms',
      fields: ['agent.keyword'],
      limit: 3,
      other_bucket: {
        include_documents_without_field: false,
      },
      rank_by: {
        type: 'metric',
        metric_index: 0,
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
      limit: 3,
      other_bucket: {
        include_documents_without_field: false,
      },
      rank_by: {
        type: 'metric',
        metric_index: 0,
        direction: 'desc',
      },
    },
    {
      operation: 'terms',
      fields: ['geo.dest'],
      limit: 5,
      other_bucket: {
        include_documents_without_field: false,
      },
      rank_by: {
        type: 'metric',
        metric_index: 0,
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
  row_numbers: { visible: true },
} satisfies DatatableStateNoESQL;

/**
 * Full config datatable and dataView
 */
export const fullConfigDatatableWithDataView: DatatableState = {
  title: 'Multiple metrics, rows, split by with full config',
  type: 'data_table',
  data_source: {
    type: AS_CODE_DATA_VIEW_REFERENCE_TYPE,
    ref_id: 'my-custom-data-view-id',
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
  ],
  rows: [
    {
      operation: 'terms',
      fields: ['agent.keyword'],
      limit: 3,
      other_bucket: {
        include_documents_without_field: false,
      },
      rank_by: {
        type: 'metric',
        metric_index: 0,
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
      limit: 3,
      other_bucket: {
        include_documents_without_field: false,
      },
      rank_by: {
        type: 'metric',
        metric_index: 0,
        direction: 'desc',
      },
    },
    {
      operation: 'terms',
      fields: ['geo.dest'],
      limit: 5,
      other_bucket: {
        include_documents_without_field: false,
      },
      rank_by: {
        type: 'metric',
        metric_index: 0,
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
} satisfies DatatableStateNoESQL;

/**
 * Datatable sorted by a pivoted metric column (split_metrics_by)
 */
export const sortedByPivotedMetricColumnDatatable: DatatableState = {
  title: 'Sorted by a pivoted metric column',
  type: 'data_table',
  data_source: {
    type: AS_CODE_DATA_VIEW_REFERENCE_TYPE,
    ref_id: '90943e30-9a47-11e8-b64d-95841ca0b247',
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
  ],
  rows: [
    {
      operation: 'terms',
      fields: ['agent.keyword'],
      limit: 3,
      other_bucket: {
        include_documents_without_field: false,
      },
      rank_by: {
        type: 'metric',
        metric_index: 0,
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
      limit: 3,
      other_bucket: {
        include_documents_without_field: false,
      },
      rank_by: {
        type: 'metric',
        metric_index: 0,
        direction: 'desc',
      },
    },
    {
      operation: 'terms',
      fields: ['geo.dest'],
      limit: 5,
      other_bucket: {
        include_documents_without_field: false,
      },
      rank_by: {
        type: 'metric',
        metric_index: 0,
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
} satisfies DatatableStateNoESQL;

/**
 * Datatable sorted by a row column
 */
export const sortedByRowDatatable: DatatableState = {
  title: 'Sorted by row column',
  type: 'data_table',
  data_source: {
    type: AS_CODE_DATA_VIEW_REFERENCE_TYPE,
    ref_id: '90943e30-9a47-11e8-b64d-95841ca0b247',
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
  ],
  rows: [
    {
      operation: 'terms',
      fields: ['agent.keyword'],
      limit: 3,
      other_bucket: {
        include_documents_without_field: false,
      },
      rank_by: {
        type: 'metric',
        metric_index: 0,
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
      limit: 3,
      other_bucket: {
        include_documents_without_field: false,
      },
      rank_by: {
        type: 'metric',
        metric_index: 0,
        direction: 'desc',
      },
    },
    {
      operation: 'terms',
      fields: ['geo.dest'],
      limit: 5,
      other_bucket: {
        include_documents_without_field: false,
      },
      rank_by: {
        type: 'metric',
        metric_index: 0,
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
} satisfies DatatableStateNoESQL;
