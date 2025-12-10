/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ELASTIC_HTTP_VERSION_HEADER } from '@kbn/core-http-common';

export const COMMON_HEADERS = {
  [ELASTIC_HTTP_VERSION_HEADER]: '1',
};

export const ES_ARCHIVE_BASIC_INDEX =
  'src/platform/test/api_integration/fixtures/es_archiver/index_patterns/basic_index';

export const KBN_ARCHIVE_SAVED_OBJECTS_BASIC =
  'src/platform/test/api_integration/fixtures/kbn_archiver/saved_objects/basic.json';

export const KBN_ARCHIVE_SAVED_OBJECTS_RELATIONSHIPS =
  'src/platform/test/api_integration/fixtures/kbn_archiver/management/saved_objects/relationships.json';
