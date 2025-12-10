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

apiTest.describe(
  'POST /api/data_views/data_view/{id}/runtime_field - create main',
  { tag: tags.PLATFORM },
  () => {
    let adminApiCredentials: RoleApiCredentials;

    apiTest.beforeAll(async ({ requestAuth }) => {
      // TODO: Implement test setup
      // 1. Get admin API credentials using requestAuth.getApiKey('admin')
    });

    apiTest.describe('legacy API', () => {
      apiTest('can create a new runtime field', async ({ apiClient }) => {
        // TODO: Implement test
        // 1. Create index pattern
        // 2. POST runtime field to /api/index_patterns/index_pattern/{id}/runtime_field
        // 3. Send: { name: 'runtimeFoo', runtimeField: { type: 'long', script: { source: 'emit(doc["foo"].value)' } } }
        // 4. Verify response contains the created runtime field
        // 5. Delete index pattern
      });

      apiTest('newly created runtime field is materialized in the fields list', async ({
        apiClient,
      }) => {
        // TODO: Implement test
        // 1. Create index pattern
        // 2. Create runtime field
        // 3. GET index pattern and verify runtime field appears in fields array
        // 4. Delete index pattern
      });
    });

    apiTest.describe('data view API', () => {
      apiTest('can create a new runtime field', async ({ apiClient }) => {
        // TODO: Implement test for data view API endpoint
      });

      apiTest('newly created runtime field is materialized in the fields list', async ({
        apiClient,
      }) => {
        // TODO: Implement test for data view API
      });
    });
  }
);
