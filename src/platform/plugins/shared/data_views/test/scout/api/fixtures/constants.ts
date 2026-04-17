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

export const ES_ARCHIVE_CONFLICTS =
  'src/platform/test/api_integration/fixtures/es_archiver/index_patterns/conflicts';

export const KBN_ARCHIVE_SAVED_OBJECTS_BASIC =
  'src/platform/test/api_integration/fixtures/kbn_archiver/saved_objects/basic.json';

export const KBN_ARCHIVE_SAVED_OBJECTS_RELATIONSHIPS =
  'src/platform/test/api_integration/fixtures/kbn_archiver/management/saved_objects/relationships.json';

export const DATA_VIEW_PATH_LEGACY = 'api/index_patterns/index_pattern';
export const DATA_VIEW_PATH = 'api/data_views/data_view';
export const SERVICE_PATH_LEGACY = 'api/index_patterns';
export const SERVICE_PATH = 'api/data_views';
export const SERVICE_KEY_LEGACY = 'index_pattern';
export const SERVICE_KEY = 'data_view';
export const HAS_USER_DATA_VIEW_PATH = 'api/data_views/has_user_data_view';
export const HAS_USER_INDEX_PATTERN_PATH = 'api/index_patterns/has_user_index_pattern';

export const ID_OVER_MAX_LENGTH = 'x'.repeat(1759);

export const INTERNAL_COMMON_HEADERS = {
  'kbn-xsrf': 'some-xsrf-token',
  [X_ELASTIC_INTERNAL_ORIGIN_REQUEST]: 'kibana',
  [ELASTIC_HTTP_VERSION_HEADER]: '1',
};

export const EXISTING_INDICES_PATH = 'internal/data_views/_existing_indices';
export const FIELDS_FOR_WILDCARD_PATH = 'internal/data_views/_fields_for_wildcard';
export const FIELDS_ROUTE_PATH = 'internal/data_views/fields';
export const RESOLVE_INDEX_PATH = 'internal/index-pattern-management/resolve_index';
export const SWAP_REFERENCES_PATH = `${SERVICE_PATH}/swap_references`;
export const SWAP_REFERENCES_PREVIEW_PATH = `${SERVICE_PATH}/swap_references/_preview`;
