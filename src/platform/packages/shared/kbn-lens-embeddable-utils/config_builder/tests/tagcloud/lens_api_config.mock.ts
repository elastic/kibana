/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { TagcloudConfig } from '../../schema';
import {
  AS_CODE_DATA_VIEW_REFERENCE_TYPE,
  AS_CODE_DATA_VIEW_SPEC_TYPE,
} from '@kbn/as-code-data-views-schema';

/**
 * Basic tagcloud chart with ad hoc dataView
 */
export const basicTagcloudWithAdHocDataView = {
  title: 'Test Tagcloud',
  type: 'tag_cloud',
  data_source: {
    type: AS_CODE_DATA_VIEW_SPEC_TYPE,
    index_pattern: 'test-index',
    time_field: '@timestamp',
  },
  metric: {
    operation: 'average',
    field: 'bytes',
  },
  tag_by: {
    operation: 'date_histogram',
    field: '@timestamp',
    suggested_interval: 'd',
    use_original_time_range: false,
    include_empty_rows: true,
  },
  sampling: 1,
  ignore_global_filters: false,
} satisfies TagcloudConfig;

/**
 * Basic tagcloud chart with existing dataView
 */
export const basicTagcloudWithDataView = {
  title: 'Test Tagcloud',
  type: 'tag_cloud',
  data_source: {
    type: AS_CODE_DATA_VIEW_REFERENCE_TYPE,
    ref_id: 'test-id',
  },
  metric: {
    operation: 'average',
    field: 'bytes',
  },
  tag_by: {
    operation: 'date_histogram',
    field: '@timestamp',
    suggested_interval: 'd',
    use_original_time_range: false,
    include_empty_rows: true,
  },
  sampling: 1,
  ignore_global_filters: false,
} satisfies TagcloudConfig;

/**
 * ESQL-based tagcloud chart
 */
export const basicEsqlTagcloud = {
  title: 'Test Tagcloud',
  type: 'tag_cloud',
  data_source: {
    type: 'esql',
    query: 'FROM test-index | STATS bytes=AVG(bytes) BY geo.dest',
  },
  metric: {
    column: 'bytes',
  },
  tag_by: {
    column: 'geo.dest',
  },
  sampling: 1,
  ignore_global_filters: false,
} satisfies TagcloudConfig;

/**
 * Comprehensive tagcloud chart with ad hoc dataView
 */
export const comprehensiveTagcloudWithAdHocDataView = {
  title: 'Comprehensive Test Tagcloud',
  type: 'tag_cloud',
  data_source: {
    type: AS_CODE_DATA_VIEW_SPEC_TYPE,
    index_pattern: 'test-index',
    time_field: '@timestamp',
  },
  styling: {
    orientation: 'angled',
    font_size: {
      min: 35,
      max: 58,
    },
    caption: { visible: false },
  },
  metric: {
    operation: 'sum',
    field: 'bytes',
    empty_as_null: true,
  },
  tag_by: {
    operation: 'terms',
    fields: ['geo.dest'],
    limit: 10,
    other_bucket: {
      include_documents_without_field: false,
    },
    color: {
      mode: 'categorical',
      palette: 'default',
      mapping: [
        {
          values: ['CN'],
          color: {
            type: 'from_palette',
            palette: 'default',
            index: 0,
          },
        },
        {
          values: ['IN'],
          color: {
            type: 'from_palette',
            palette: 'default',
            index: 1,
          },
        },
        {
          values: ['ID'],
          color: {
            type: 'from_palette',
            palette: 'default',
            index: 2,
          },
        },
      ],
    },
  },
  sampling: 1,
  ignore_global_filters: false,
} satisfies TagcloudConfig;

/**
 * Comprehensive tagcloud chart with existing dataView
 */
export const comprehensiveTagcloudWithDataView = {
  title: 'Comprehensive Test Tagcloud',
  type: 'tag_cloud',
  data_source: {
    type: AS_CODE_DATA_VIEW_REFERENCE_TYPE,
    ref_id: 'my-custom-data-view-id',
  },
  styling: {
    orientation: 'angled',
    font_size: {
      min: 35,
      max: 58,
    },
    caption: { visible: false },
  },
  metric: {
    operation: 'sum',
    field: 'bytes',
    empty_as_null: true,
  },
  tag_by: {
    operation: 'terms',
    fields: ['geo.dest'],
    limit: 10,
    other_bucket: {
      include_documents_without_field: false,
    },
    color: {
      mode: 'categorical',
      palette: 'default',
      mapping: [
        {
          values: ['CN'],
          color: {
            type: 'from_palette',
            palette: 'default',
            index: 0,
          },
        },
        {
          values: ['IN'],
          color: {
            type: 'from_palette',
            palette: 'default',
            index: 1,
          },
        },
        {
          values: ['ID'],
          color: {
            type: 'from_palette',
            palette: 'default',
            index: 2,
          },
        },
      ],
    },
  },
  sampling: 1,
  ignore_global_filters: false,
} satisfies TagcloudConfig;

/**
 * Comprehensive ESQL-based tagcloud chart
 */
export const comprehensiveEsqlTagcloud = {
  title: 'Comprehensive Test Tagcloud',
  type: 'tag_cloud',
  data_source: {
    type: 'esql',
    query: 'FROM test-index | STATS bytes=AVG(bytes) BY geo.dest',
  },
  styling: {
    orientation: 'angled',
    font_size: {
      min: 35,
      max: 58,
    },
    caption: { visible: false },
  },
  metric: {
    column: 'bytes',
  },
  tag_by: {
    column: 'geo.dest',
    color: {
      mode: 'categorical',
      palette: 'default',
      mapping: [],
    },
  },
  sampling: 1,
  ignore_global_filters: false,
} satisfies TagcloudConfig;
