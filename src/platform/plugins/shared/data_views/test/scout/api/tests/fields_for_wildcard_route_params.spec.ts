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
  'GET /internal/data_views/_fields_for_wildcard - params',
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

    apiTest('requires a pattern query param', async ({ apiClient }) => {
      // TODO: Implement test
      // 1. GET request to /internal/data_views/_fields_for_wildcard
      // 2. Set COMMON_HEADERS and adminApiCredentials.apiKeyHeader
      // 3. Send empty query params {}
      // 4. Verify response statusCode equals 400
    });

    apiTest('accepts include_unmapped param', async ({ apiClient }) => {
      // TODO: Implement test
      // 1. GET request to /internal/data_views/_fields_for_wildcard
      // 2. Set COMMON_HEADERS and adminApiCredentials.apiKeyHeader
      // 3. Send query params: { pattern: '*', include_unmapped: true }
      // 4. Verify response statusCode equals 200
    });

    apiTest('rejects unexpected query params', async ({ apiClient }) => {
      // TODO: Implement test
      // 1. GET request to /internal/data_views/_fields_for_wildcard
      // 2. Set COMMON_HEADERS and adminApiCredentials.apiKeyHeader
      // 3. Send query params with pattern and random word key-value pair
      // 4. Verify response statusCode equals 400
    });

    apiTest.describe('fields', () => {
      apiTest('accepts a JSON formatted fields query param', async ({ apiClient }) => {
        // TODO: Implement test
        // 1. GET request to /internal/data_views/_fields_for_wildcard
        // 2. Set COMMON_HEADERS and adminApiCredentials.apiKeyHeader
        // 3. Send query params: { pattern: '*', fields: JSON.stringify(['baz']) }
        // 4. Verify response statusCode equals 200
      });

      apiTest('accepts meta_fields query param in string array', async ({ apiClient }) => {
        // TODO: Implement test
        // 1. GET request to /internal/data_views/_fields_for_wildcard
        // 2. Set COMMON_HEADERS and adminApiCredentials.apiKeyHeader
        // 3. Send query params: { pattern: '*', fields: ['baz', 'foo'] }
        // 4. Verify response statusCode equals 200
      });

      apiTest('accepts single array fields query param', async ({ apiClient }) => {
        // TODO: Implement test
        // 1. GET request to /internal/data_views/_fields_for_wildcard
        // 2. Set COMMON_HEADERS and adminApiCredentials.apiKeyHeader
        // 3. Send query params: { pattern: '*', fields: ['baz'] }
        // 4. Verify response statusCode equals 200
      });

      apiTest('accepts single fields query param', async ({ apiClient }) => {
        // TODO: Implement test
        // 1. GET request to /internal/data_views/_fields_for_wildcard
        // 2. Set COMMON_HEADERS and adminApiCredentials.apiKeyHeader
        // 3. Send query params: { pattern: '*', fields: 'baz' }
        // 4. Verify response statusCode equals 200
      });

      apiTest('rejects a comma-separated list of fields', async ({ apiClient }) => {
        // TODO: Implement test
        // 1. GET request to /internal/data_views/_fields_for_wildcard
        // 2. Set COMMON_HEADERS and adminApiCredentials.apiKeyHeader
        // 3. Send query params: { pattern: '*', fields: 'foo,bar' }
        // 4. Verify response statusCode equals 400
      });
    });

    apiTest.describe('meta_fields', () => {
      apiTest('accepts a JSON formatted meta_fields query param', async ({ apiClient }) => {
        // TODO: Implement test
        // 1. GET request to /internal/data_views/_fields_for_wildcard
        // 2. Set COMMON_HEADERS and adminApiCredentials.apiKeyHeader
        // 3. Send query params: { pattern: '*', meta_fields: JSON.stringify(['meta']) }
        // 4. Verify response statusCode equals 200
      });

      apiTest('accepts meta_fields query param in string array', async ({ apiClient }) => {
        // TODO: Implement test
        // 1. GET request to /internal/data_views/_fields_for_wildcard
        // 2. Set COMMON_HEADERS and adminApiCredentials.apiKeyHeader
        // 3. Send query params: { pattern: '*', meta_fields: ['_id', 'meta'] }
        // 4. Verify response statusCode equals 200
      });

      apiTest('accepts single meta_fields query param', async ({ apiClient }) => {
        // TODO: Implement test
        // 1. GET request to /internal/data_views/_fields_for_wildcard
        // 2. Set COMMON_HEADERS and adminApiCredentials.apiKeyHeader
        // 3. Send query params: { pattern: '*', meta_fields: ['_id'] }
        // 4. Verify response statusCode equals 200
      });

      apiTest('rejects a comma-separated list of meta_fields', async ({ apiClient }) => {
        // TODO: Implement test
        // 1. GET request to /internal/data_views/_fields_for_wildcard
        // 2. Set COMMON_HEADERS and adminApiCredentials.apiKeyHeader
        // 3. Send query params: { pattern: '*', meta_fields: 'foo,bar' }
        // 4. Verify response statusCode equals 400
      });
    });
  }
);
