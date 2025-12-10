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

apiTest.describe('GET /api/data_views - get all', { tag: tags.PLATFORM }, () => {
  let adminApiCredentials: RoleApiCredentials;

  apiTest.beforeAll(async ({ requestAuth }) => {
    // TODO: Implement test setup
    // 1. Get admin API credentials using requestAuth.getApiKey('admin')
  });

  apiTest.describe('legacy API', () => {
    apiTest('returns empty array when no index patterns exist', async ({ apiClient, kbnClient }) => {
      // TODO: Implement test
      // 1. Clean all saved objects
      // 2. GET request to /api/index_patterns
      // 3. Set COMMON_HEADERS and adminApiCredentials.apiKeyHeader
      // 4. Verify response.body.index_pattern is an empty array
    });

    apiTest('returns all index patterns', async ({ apiClient }) => {
      // TODO: Implement test
      // 1. Create 2-3 index patterns
      // 2. GET request to /api/index_patterns
      // 3. Verify response contains all created index patterns
      // 4. Delete all created index patterns
    });
  });

  apiTest.describe('data view API', () => {
    apiTest('returns empty array when no data views exist', async ({ apiClient, kbnClient }) => {
      // TODO: Implement test
      // 1. Clean all saved objects
      // 2. GET request to /api/data_views
      // 3. Set COMMON_HEADERS and adminApiCredentials.apiKeyHeader
      // 4. Verify response.body.data_view is an empty array
    });

    apiTest('returns all data views', async ({ apiClient }) => {
      // TODO: Implement test
      // 1. Create 2-3 data views
      // 2. GET request to /api/data_views
      // 3. Verify response contains all created data views
      // 4. Delete all created data views
    });
  });
});
