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

apiTest.describe('POST /api/data_views/data_view - main', { tag: tags.PLATFORM }, () => {
  let adminApiCredentials: RoleApiCredentials;

  apiTest.beforeAll(async ({ requestAuth }) => {
    // TODO: Implement test setup
    // 1. Get admin API credentials using requestAuth.getApiKey('admin')
  });

  apiTest.describe('legacy API', () => {
    apiTest('can create an index_pattern with just a title', async ({ apiClient }) => {
      // TODO: Implement test
      // 1. Generate unique title using timestamp and random
      // 2. POST request to /api/index_patterns/index_pattern
      // 3. Set COMMON_HEADERS and adminApiCredentials.apiKeyHeader
      // 4. Send body: { index_pattern: { title } }
      // 5. Verify response statusCode equals 200
    });

    apiTest('returns back the created index_pattern object', async ({ apiClient }) => {
      // TODO: Implement test
      // 1. Generate unique title
      // 2. POST request to create index pattern
      // 3. Verify response.body.index_pattern is an object
      // 4. Verify response.body.index_pattern.title equals sent title
      // 5. Verify response.body.index_pattern.id is a non-empty string
    });

    apiTest(
      'can specify primitive optional attributes when creating an index pattern',
      async ({ apiClient }) => {
        // TODO: Implement test
        // 1. Generate unique title and id
        // 2. POST request with optional fields: id, type, timeFieldName
        // 3. Verify all attributes are returned correctly in response
      }
    );

    apiTest(
      'can specify optional sourceFilters attribute when creating an index pattern',
      async ({ apiClient }) => {
        // TODO: Implement test
        // 1. POST request with sourceFilters: [{ value: 'foo' }]
        // 2. Verify sourceFilters is returned in response
      }
    );

    apiTest('can specify optional fields attribute when creating an index pattern', async ({
      apiClient,
    }) => {
      // TODO: Implement test
      // 1. POST request with fieldFormats and fieldAttrs
      // 2. Verify fields object is populated in response
    });

    apiTest('can create index pattern with empty title', async ({ apiClient }) => {
      // TODO: Implement test
      // 1. POST request with allowNoIndex: true and empty title
      // 2. Verify response statusCode equals 200
    });
  });

  apiTest.describe('data view API', () => {
    apiTest('can create a data_view with just a title', async ({ apiClient }) => {
      // TODO: Implement test
      // 1. Generate unique title
      // 2. POST request to /api/data_views/data_view
      // 3. Set COMMON_HEADERS and adminApiCredentials.apiKeyHeader
      // 4. Send body: { data_view: { title } }
      // 5. Verify response statusCode equals 200
    });

    apiTest('returns back the created data_view object', async ({ apiClient }) => {
      // TODO: Implement test
      // 1. Generate unique title
      // 2. POST request to create data view
      // 3. Verify response.body.data_view is an object
      // 4. Verify response.body.data_view.title equals sent title
      // 5. Verify response.body.data_view.id is a non-empty string
    });

    apiTest(
      'can specify primitive optional attributes when creating a data view',
      async ({ apiClient }) => {
        // TODO: Implement test
        // 1. Generate unique title and id
        // 2. POST request with optional fields: id, name, timeFieldName
        // 3. Verify all attributes are returned correctly in response
      }
    );

    apiTest(
      'can specify optional sourceFilters attribute when creating a data view',
      async ({ apiClient }) => {
        // TODO: Implement test
        // 1. POST request with sourceFilters: [{ value: 'foo' }]
        // 2. Verify sourceFilters is returned in response
      }
    );

    apiTest('can specify optional fields attribute when creating a data view', async ({
      apiClient,
    }) => {
      // TODO: Implement test
      // 1. POST request with fieldFormats and fieldAttrs
      // 2. Verify fields object is populated in response
    });

    apiTest('can create data view with empty title', async ({ apiClient }) => {
      // TODO: Implement test
      // 1. POST request with allowNoIndex: true and empty title
      // 2. Verify response statusCode equals 200
    });
  });
});
