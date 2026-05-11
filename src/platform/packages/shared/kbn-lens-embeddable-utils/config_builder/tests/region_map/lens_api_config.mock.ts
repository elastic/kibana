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
import type { RegionMapConfig } from '../../schema';

/**
 * Basic region map chart with ad hoc dataView
 */
export const basicRegionMapWithAdHocDataView = {
  title: 'Test Region Map',
  type: 'region_map',
  data_source: {
    type: AS_CODE_DATA_VIEW_SPEC_TYPE,
    index_pattern: 'test-index',
    time_field: '@timestamp',
  },
  metric: {
    operation: 'count',
    empty_as_null: true,
  },
  region: {
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
  sampling: 1,
  ignore_global_filters: false,
} satisfies RegionMapConfig;

/**
 * Basic region map chart with existing dataView
 */
export const basicRegionMapWithDataView = {
  title: 'Test Region Map',
  type: 'region_map',
  data_source: {
    type: AS_CODE_DATA_VIEW_REFERENCE_TYPE,
    ref_id: 'test-id',
  },
  metric: {
    operation: 'percentile',
    field: 'bytes',
    percentile: 95,
  },
  region: {
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
    ems: {
      boundaries: 'world_countries',
      join: 'iso2',
    },
  },
  sampling: 1,
  ignore_global_filters: false,
} satisfies RegionMapConfig;

/**
 * ESQL-based region map chart
 */
export const basicEsqlRegionMap = {
  title: 'Test Region Map',
  type: 'region_map',
  data_source: {
    type: 'esql',
    query: 'FROM test-index | STATS bytes=AVG(bytes) BY geo.dest',
  },
  metric: {
    column: 'bytes',
  },
  region: {
    column: 'geo.dest',
    ems: {
      boundaries: 'world_countries',
      join: 'iso2',
    },
  },
  sampling: 1,
  ignore_global_filters: false,
} satisfies RegionMapConfig;

/**
 * Comprehensive region map chart with ad hoc dataView
 */
export const comprehensiveRegionMapWithAdHocDataView = {
  title: 'Comprehensive Test Region Map',
  type: 'region_map',
  data_source: {
    type: AS_CODE_DATA_VIEW_SPEC_TYPE,
    index_pattern: 'test-index',
    time_field: '@timestamp',
  },
  metric: {
    operation: 'count',
    empty_as_null: true,
  },
  region: {
    operation: 'filters',
    filters: [
      {
        filter: {
          expression: 'geo.dest : "US"',
          language: 'kql',
        },
        label: 'US',
      },
    ],
    ems: {
      boundaries: 'world_countries',
      join: 'iso2',
    },
  },
  sampling: 1,
  ignore_global_filters: false,
} satisfies RegionMapConfig;

/**
 * Comprehensive region map chart with existing dataView
 */
export const comprehensiveRegionMapWithDataView = {
  title: 'Comprehensive Test Region Map',
  type: 'region_map',
  data_source: {
    type: AS_CODE_DATA_VIEW_REFERENCE_TYPE,
    ref_id: 'my-custom-data-view-id',
  },
  metric: {
    operation: 'count',
    empty_as_null: true,
  },
  region: {
    operation: 'filters',
    filters: [
      {
        filter: {
          expression: 'geo.dest : "US"',
          language: 'kql',
        },
        label: 'US',
      },
    ],
    ems: {
      boundaries: 'world_countries',
      join: 'iso2',
    },
  },
  sampling: 1,
  ignore_global_filters: false,
} satisfies RegionMapConfig;

/**
 * Comprehensive ESQL-based region map chart
 */
export const comprehensiveEsqlRegionMap = {
  title: 'Comprehensive Test Region Map',
  type: 'region_map',
  data_source: {
    type: 'esql',
    query: 'FROM test-index | STATS bytes=AVG(bytes) BY geo.dest',
  },
  metric: {
    column: 'bytes',
  },
  region: {
    column: 'geo.dest',
    ems: {
      boundaries: 'world_countries',
      join: 'iso2',
    },
  },
  sampling: 1,
  ignore_global_filters: false,
} satisfies RegionMapConfig;
