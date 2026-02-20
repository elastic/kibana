/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  ELASTIC_HTTP_VERSION_HEADER,
  X_ELASTIC_INTERNAL_ORIGIN_REQUEST,
} from '@kbn/core-http-common';

export const COMMON_HEADERS = {
  'kbn-xsrf': 'some-xsrf-token',
  [X_ELASTIC_INTERNAL_ORIGIN_REQUEST]: 'kibana',
  [ELASTIC_HTTP_VERSION_HEADER]: '2023-10-31',
};

export const ES_ARCHIVE_BASIC_INDEX =
  'src/platform/test/api_integration/fixtures/es_archiver/index_patterns/basic_index';

export const DATA_VIEW_PATH_LEGACY = 'api/index_patterns/index_pattern';
export const DATA_VIEW_PATH = 'api/data_views/data_view';
export const SERVICE_PATH_LEGACY = 'api/index_patterns';
export const SERVICE_PATH = 'api/data_views';
export const SERVICE_KEY_LEGACY = 'index_pattern';
export const SERVICE_KEY = 'data_view';
