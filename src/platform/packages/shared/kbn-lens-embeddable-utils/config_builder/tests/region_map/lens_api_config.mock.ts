/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { RegionMapState } from '../../schema';

/**
 * Basic region map chart with ad hoc dataView
 */
export const basicRegionMapWithAdHocDataView = {
  title: 'Test Region Map',
  type: 'region_map',
  dataset: {
    type: 'index',
    index: 'test-index',
    time_field: '@timestamp',
  },
  metric: {
    operation: 'count',
    empty_as_null: true,
  },
  region: {
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
  sampling: 1,
  ignore_global_filters: false,
} satisfies RegionMapState;

/**
 * Basic region map chart with existing dataView
 */
export const basicRegionMapWithDataView = {
  title: 'Test Region Map',
  type: 'region_map',
  dataset: {
    type: 'dataView',
    id: 'test-id',
  },
  metric: {
    operation: 'percentile',
    field: 'bytes',
    percentile: 95,
  },
  region: {
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
    ems: {
      boundaries: 'world_countries',
      join: 'iso2',
    },
  },
  sampling: 1,
  ignore_global_filters: false,
} satisfies RegionMapState;

/**
 * ESQL-based region map chart
 */
export const basicEsqlRegionMap = {
  title: 'Test Region Map',
  type: 'region_map',
  dataset: {
    type: 'esql',
    query: 'FROM test-index | STATS bytes=AVG(bytes) BY geo.dest',
  },
  metric: {
    operation: 'value',
    column: 'bytes',
  },
  region: {
    operation: 'value',
    column: 'geo.dest',
    ems: {
      boundaries: 'world_countries',
      join: 'iso2',
    },
  },
  sampling: 1,
  ignore_global_filters: false,
} satisfies RegionMapState;

/**
 * Comprehensive region map chart with ad hoc dataView
 */
export const comprehensiveRegionMapWithAdHocDataView = {
  title: 'Comprehensive Test Region Map',
  type: 'region_map',
  dataset: {
    type: 'index',
    index: 'test-index',
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
          query: 'geo.dest : "US"',
          language: 'kuery',
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
} satisfies RegionMapState;

/**
 * Comprehensive region map chart with existing dataView
 */
export const comprehensiveRegionMapWithDataView = {
  title: 'Comprehensive Test Region Map',
  type: 'region_map',
  dataset: {
    type: 'dataView',
    id: 'my-custom-data-view-id',
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
          query: 'geo.dest : "US"',
          language: 'kuery',
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
} satisfies RegionMapState;

/**
 * Comprehensive ESQL-based region map chart
 */
export const comprehensiveEsqlRegionMap = {
  title: 'Comprehensive Test Region Map',
  type: 'region_map',
  dataset: {
    type: 'esql',
    query: 'FROM test-index | STATS bytes=AVG(bytes) BY geo.dest',
  },
  metric: {
    operation: 'value',
    column: 'bytes',
  },
  region: {
    operation: 'value',
    column: 'geo.dest',
    ems: {
      boundaries: 'world_countries',
      join: 'iso2',
    },
  },
  sampling: 1,
  ignore_global_filters: false,
} satisfies RegionMapState;
