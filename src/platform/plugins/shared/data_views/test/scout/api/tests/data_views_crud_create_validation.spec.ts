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

apiTest.describe('POST /api/data_views - validation', { tag: tags.PLATFORM }, () => {
  let adminApiCredentials: RoleApiCredentials;

  apiTest.beforeAll(async ({ requestAuth }) => {
    // TODO: Implement test setup
    // 1. Get admin API credentials using requestAuth.getApiKey('admin')
  });

  apiTest.describe('legacy index pattern API', () => {
    apiTest('returns error when index_pattern object is not provided', async ({ apiClient }) => {
      // TODO: Implement test
      // 1. POST request to /api/index_patterns/index_pattern
      // 2. Set COMMON_HEADERS and adminApiCredentials.apiKeyHeader
      // 3. Send no body (null)
      // 4. Verify response statusCode equals 400
      // 5. Verify error message: 'expected a plain object value, but found [null] instead.'
    });

    apiTest('returns error on empty index_pattern object', async ({ apiClient }) => {
      // TODO: Implement test
      // 1. POST request to /api/index_patterns/index_pattern
      // 2. Set COMMON_HEADERS and adminApiCredentials.apiKeyHeader
      // 3. Send body: { index_pattern: {} }
      // 4. Verify response statusCode equals 400
      // 5. Verify error message contains 'expected value of type [string] but got [undefined]'
    });

    apiTest('returns error when "override" parameter is not a boolean', async ({ apiClient }) => {
      // TODO: Implement test
      // 1. POST request to /api/index_patterns/index_pattern
      // 2. Set COMMON_HEADERS and adminApiCredentials.apiKeyHeader
      // 3. Send body: { override: 123, index_pattern: { title: 'foo' } }
      // 4. Verify response statusCode equals 400
      // 5. Verify error message: 'expected value of type [boolean] but got [number]'
    });

    apiTest('returns error when "refresh_fields" parameter is not a boolean', async ({
      apiClient,
    }) => {
      // TODO: Implement test
      // 1. POST request to /api/index_patterns/index_pattern
      // 2. Set COMMON_HEADERS and adminApiCredentials.apiKeyHeader
      // 3. Send body: { refresh_fields: 123, index_pattern: { title: 'foo' } }
      // 4. Verify response statusCode equals 400
      // 5. Verify error message: 'expected value of type [boolean] but got [number]'
    });

    apiTest('returns an error when unknown runtime field type', async ({ apiClient }) => {
      // TODO: Implement test
      // 1. POST request to /api/index_patterns/index_pattern
      // 2. Set COMMON_HEADERS and adminApiCredentials.apiKeyHeader
      // 3. Send body with override: true, title: 'basic_index*'
      // 4. Include runtimeFieldMap with invalid type 'wrong-type'
      // 5. Verify response statusCode equals 400
    });
  });

  apiTest.describe('data view API', () => {
    apiTest('returns error when data_view object is not provided', async ({ apiClient }) => {
      // TODO: Implement test
      // 1. POST request to /api/data_views/data_view
      // 2. Set COMMON_HEADERS and adminApiCredentials.apiKeyHeader
      // 3. Send no body (null)
      // 4. Verify response statusCode equals 400
      // 5. Verify error message: 'expected a plain object value, but found [null] instead.'
    });

    apiTest('returns error on empty data_view object', async ({ apiClient }) => {
      // TODO: Implement test
      // 1. POST request to /api/data_views/data_view
      // 2. Set COMMON_HEADERS and adminApiCredentials.apiKeyHeader
      // 3. Send body: { data_view: {} }
      // 4. Verify response statusCode equals 400
      // 5. Verify error message contains 'expected value of type [string] but got [undefined]'
    });

    apiTest('returns error when "override" parameter is not a boolean', async ({ apiClient }) => {
      // TODO: Implement test
      // 1. POST request to /api/data_views/data_view
      // 2. Set COMMON_HEADERS and adminApiCredentials.apiKeyHeader
      // 3. Send body: { override: 123, data_view: { title: 'foo' } }
      // 4. Verify response statusCode equals 400
      // 5. Verify error message: 'expected value of type [boolean] but got [number]'
    });

    apiTest('returns error when "refresh_fields" parameter is not a boolean', async ({
      apiClient,
    }) => {
      // TODO: Implement test
      // 1. POST request to /api/data_views/data_view
      // 2. Set COMMON_HEADERS and adminApiCredentials.apiKeyHeader
      // 3. Send body: { refresh_fields: 123, data_view: { title: 'foo' } }
      // 4. Verify response statusCode equals 400
      // 5. Verify error message: 'expected value of type [boolean] but got [number]'
    });

    apiTest('returns an error when unknown runtime field type', async ({ apiClient }) => {
      // TODO: Implement test
      // 1. POST request to /api/data_views/data_view
      // 2. Set COMMON_HEADERS and adminApiCredentials.apiKeyHeader
      // 3. Send body with override: true, title: 'basic_index*'
      // 4. Include runtimeFieldMap with invalid type 'wrong-type'
      // 5. Verify response statusCode equals 400
    });
  });
});
