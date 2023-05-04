/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export const UI_SETTINGS = {
  MAX_BUCKETS_SETTING: 'metrics:max_buckets',
  ALLOW_STRING_INDICES: 'metrics:allowStringIndices',
  ALLOW_CHECKING_FOR_FAILED_SHARDS: 'metrics:allowCheckingForFailedShards',
};
export const SERIES_SEPARATOR = '╰┄►';
export const INDEXES_SEPARATOR = ',';
export const AUTO_INTERVAL = 'auto';
export const ROUTES = {
  VIS_DATA: '/api/metrics/vis/data',
  FIELDS: '/api/metrics/fields',
};
export const USE_KIBANA_INDEXES_KEY = 'use_kibana_indexes';
export const TSVB_DEFAULT_COLOR = '#68BC00';
