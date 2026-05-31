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

/** Base path for the internal value suggestions route registered by the kql plugin. */
export const SUGGESTIONS_VALUES_PATH = 'internal/kibana/suggestions/values';

/**
 * The value suggestions route is an internal, versioned API (version `1`).
 * State-changing requests need `kbn-xsrf`, and internal Kibana APIs expect the
 * internal-origin header.
 */
export const COMMON_HEADERS = {
  'kbn-xsrf': 'some-xsrf-token',
  [X_ELASTIC_INTERNAL_ORIGIN_REQUEST]: 'kibana',
  [ELASTIC_HTTP_VERSION_HEADER]: '1',
};

/** Small non-time-based index with `baz.keyword` and a `nestedField.child` nested field. */
export const ES_ARCHIVE_BASIC_INDEX =
  'src/platform/test/api_integration/fixtures/es_archiver/index_patterns/basic_index';

/** Index pattern saved object whose id is `basic_index` (used to resolve field meta). */
export const KBN_ARCHIVE_BASIC_KIBANA =
  'src/platform/test/api_integration/fixtures/kbn_archiver/index_patterns/basic_kibana.json';

/** Time-based dataset used to exercise filter behavior across `terms_agg` / `terms_enum`. */
export const ES_ARCHIVE_LOGSTASH_FUNCTIONAL =
  'src/platform/test/functional/fixtures/es_archiver/logstash_functional';

/** Index pattern saved object whose id is `logstash-*`. */
export const KBN_ARCHIVE_SAVED_OBJECTS_BASIC =
  'src/platform/test/api_integration/fixtures/kbn_archiver/saved_objects/basic.json';
