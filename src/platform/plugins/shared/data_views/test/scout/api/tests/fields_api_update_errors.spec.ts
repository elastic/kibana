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

apiTest.describe('POST /api/data_views/data_view/{id}/fields - errors', { tag: tags.PLATFORM }, () => {
  let adminApiCredentials: RoleApiCredentials;

  apiTest.beforeAll(async ({ requestAuth }) => {
    // TODO: Implement test setup
    // 1. Get admin API credentials using requestAuth.getApiKey('admin')
  });

  apiTest.describe('legacy API', () => {
    apiTest('returns 404 when updating fields for non-existent index pattern', async ({
      apiClient,
    }) => {
      // TODO: Implement test
      // 1. POST request to /api/index_patterns/index_pattern/non-existent-id/fields
      // 2. Set COMMON_HEADERS and adminApiCredentials.apiKeyHeader
      // 3. Send body with fields update
      // 4. Verify response statusCode equals 404
    });

    apiTest('returns error when fields object is not provided', async ({ apiClient }) => {
      // TODO: Implement test
      // 1. Create an index pattern
      // 2. POST to fields endpoint without fields in body
      // 3. Verify response statusCode equals 400
      // 4. Delete the index pattern
    });

    apiTest('returns error when fields is not an object', async ({ apiClient }) => {
      // TODO: Implement test
      // 1. Create an index pattern
      // 2. POST with fields as non-object value
      // 3. Verify response statusCode equals 400
      // 4. Delete the index pattern
    });
  });

  apiTest.describe('data view API', () => {
    apiTest('returns 404 when updating fields for non-existent data view', async ({
      apiClient,
    }) => {
      // TODO: Implement test
      // 1. POST request to /api/data_views/data_view/non-existent-id/fields
      // 2. Set COMMON_HEADERS and adminApiCredentials.apiKeyHeader
      // 3. Send body with fields update
      // 4. Verify response statusCode equals 404
    });

    apiTest('returns error when fields object is not provided', async ({ apiClient }) => {
      // TODO: Implement test
      // 1. Create a data view
      // 2. POST to fields endpoint without fields in body
      // 3. Verify response statusCode equals 400
      // 4. Delete the data view
    });

    apiTest('returns error when fields is not an object', async ({ apiClient }) => {
      // TODO: Implement test
      // 1. Create a data view
      // 2. POST with fields as non-object value
      // 3. Verify response statusCode equals 400
      // 4. Delete the data view
    });
  });
});
