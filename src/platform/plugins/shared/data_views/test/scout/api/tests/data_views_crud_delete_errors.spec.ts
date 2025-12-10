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

apiTest.describe('DELETE /api/data_views/data_view/{id} - errors', { tag: tags.PLATFORM }, () => {
  let adminApiCredentials: RoleApiCredentials;

  apiTest.beforeAll(async ({ requestAuth }) => {
    // TODO: Implement test setup
    // 1. Get admin API credentials using requestAuth.getApiKey('admin')
  });

  apiTest.describe('legacy API', () => {
    apiTest('returns 404 when deleting non-existent index pattern', async ({ apiClient }) => {
      // TODO: Implement test
      // 1. DELETE request to /api/index_patterns/index_pattern/non-existent-id
      // 2. Set COMMON_HEADERS and adminApiCredentials.apiKeyHeader
      // 3. Verify response statusCode equals 404
    });
  });

  apiTest.describe('data view API', () => {
    apiTest('returns 404 when deleting non-existent data view', async ({ apiClient }) => {
      // TODO: Implement test
      // 1. DELETE request to /api/data_views/data_view/non-existent-id
      // 2. Set COMMON_HEADERS and adminApiCredentials.apiKeyHeader
      // 3. Verify response statusCode equals 404
    });
  });
});
