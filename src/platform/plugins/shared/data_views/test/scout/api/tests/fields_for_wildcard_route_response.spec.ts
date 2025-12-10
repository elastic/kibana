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
  'GET /internal/data_views/_fields_for_wildcard - response',
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

    apiTest('returns fields sorted alphabetically', async ({ apiClient }) => {
      // TODO: Implement test
      // 1. GET request to /internal/data_views/_fields_for_wildcard
      // 2. Set COMMON_HEADERS and adminApiCredentials.apiKeyHeader
      // 3. Send query params: { pattern: 'basic_index' }
      // 4. Verify response statusCode equals 200
      // 5. Verify response.body.fields is sorted alphabetically by name
    });

    apiTest('returns correct field structure', async ({ apiClient }) => {
      // TODO: Implement test
      // 1. GET request to /internal/data_views/_fields_for_wildcard
      // 2. Set COMMON_HEADERS and adminApiCredentials.apiKeyHeader
      // 3. Send query params: { pattern: 'basic_index' }
      // 4. Verify response contains expected fields with properties:
      //    - name, type, esTypes, searchable, aggregatable, readFromDocValues, metadata_field
      // 5. Verify fields include: bar (boolean), baz (text), baz.keyword (keyword), foo (long), nestedField.child (keyword)
    });

    apiTest('returns nested field metadata', async ({ apiClient }) => {
      // TODO: Implement test
      // 1. GET request to /internal/data_views/_fields_for_wildcard
      // 2. Set COMMON_HEADERS and adminApiCredentials.apiKeyHeader
      // 3. Send query params: { pattern: 'basic_index' }
      // 4. Find nestedField.child in response
      // 5. Verify it has subType.nested.path equals 'nestedField'
    });

    apiTest('returns multi-field metadata', async ({ apiClient }) => {
      // TODO: Implement test
      // 1. GET request to /internal/data_views/_fields_for_wildcard
      // 2. Set COMMON_HEADERS and adminApiCredentials.apiKeyHeader
      // 3. Send query params: { pattern: 'basic_index' }
      // 4. Find baz.keyword in response
      // 5. Verify it has subType.multi.parent equals 'baz'
    });
  }
);
