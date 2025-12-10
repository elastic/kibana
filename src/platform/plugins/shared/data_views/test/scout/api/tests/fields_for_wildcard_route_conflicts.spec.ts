/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { expect, apiTest, tags } from '@kbn/scout';
import type { RoleApiCredentials } from '@kbn/scout';
import { COMMON_HEADERS } from '../fixtures/constants';

const ES_ARCHIVE_CONFLICTS =
  'src/platform/test/api_integration/fixtures/es_archiver/index_patterns/conflicts';

apiTest.describe(
  'GET /internal/data_views/_fields_for_wildcard - conflicts',
  { tag: tags.PLATFORM },
  () => {
    let adminApiCredentials: RoleApiCredentials;

    apiTest.beforeAll(async ({ kbnClient, requestAuth }) => {
      // TODO: Implement test setup
      // 1. Get admin API credentials using requestAuth.getApiKey('admin')
      // 2. Load ES archive: ES_ARCHIVE_CONFLICTS
    });

    apiTest.afterAll(async ({ kbnClient }) => {
      // TODO: Implement cleanup
      // 1. Unload ES archive: ES_ARCHIVE_CONFLICTS
    });

    apiTest('flags fields with mismatched types as conflicting', async ({ apiClient }) => {
      // TODO: Implement test
      // 1. GET request to /internal/data_views/_fields_for_wildcard
      // 2. Set COMMON_HEADERS and adminApiCredentials.apiKeyHeader
      // 3. Send query params: { pattern: 'logs-2017.01.*' }
      // 4. Verify response statusCode equals 200
      // 5. Verify response contains fields:
      //    - @timestamp (type: date)
      //    - number_conflict (type: number, esTypes: ['float', 'integer'])
      //    - string_conflict (type: string, esTypes: ['keyword', 'text'])
      //    - success (type: conflict, esTypes: ['keyword', 'boolean'])
      // 6. Verify conflict field has conflictDescriptions property
    });
  }
);
