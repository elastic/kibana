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
import { COMMON_HEADERS, ES_ARCHIVE_BASIC_INDEX } from '../fixtures/constants';

apiTest.describe(
  'GET /internal/data_views/_existing_indices - response',
  { tag: tags.PLATFORM },
  () => {
    let adminApiCredentials: RoleApiCredentials;

    apiTest.beforeAll(async ({ kbnClient, requestAuth }) => {
      // TODO: Implement test setup
      // 1. Get admin API credentials using requestAuth.getApiKey('admin')
      // 2. Load ES archive: ES_ARCHIVE_BASIC_INDEX
    });

    apiTest.afterAll(async ({ kbnClient }) => {
      // TODO: Implement cleanup
      // 1. Unload ES archive: ES_ARCHIVE_BASIC_INDEX
    });

    apiTest('returns an array of existing indices', async ({ apiClient }) => {
      // TODO: Implement test
      // 1. GET request to /internal/data_views/_existing_indices
      // 2. Set COMMON_HEADERS and adminApiCredentials.apiKeyHeader
      // 3. Send query params: { indices: ['basic_index', 'bad_index'] }
      // 4. Verify response statusCode equals 200
      // 5. Verify response body equals ['basic_index']
    });

    apiTest('returns an empty array when no indices exist', async ({ apiClient }) => {
      // TODO: Implement test
      // 1. GET request to /internal/data_views/_existing_indices
      // 2. Set COMMON_HEADERS and adminApiCredentials.apiKeyHeader
      // 3. Send query params: { indices: ['bad_index'] }
      // 4. Verify response statusCode equals 200
      // 5. Verify response body equals []
    });
  }
);
