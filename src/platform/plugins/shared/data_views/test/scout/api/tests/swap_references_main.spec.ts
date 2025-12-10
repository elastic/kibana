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
import {
  COMMON_HEADERS,
  KBN_ARCHIVE_SAVED_OBJECTS_BASIC,
  KBN_ARCHIVE_SAVED_OBJECTS_RELATIONSHIPS,
} from '../fixtures/constants';

apiTest.describe('swap data view references', { tag: tags.PLATFORM }, () => {
  let adminApiCredentials: RoleApiCredentials;
  let dataViewId: string;
  const title = 'logs-*';
  const prevDataViewId = '91200a00-9efd-11e7-acb3-3dab96693fab';

  apiTest.beforeAll(async ({ apiClient, kbnClient, requestAuth }) => {
    // TODO: Implement test setup
    // 1. Get admin API credentials using requestAuth.getApiKey('admin')
    // 2. POST request to /api/data_views/data_view to create new data view
    // 3. Set COMMON_HEADERS and adminApiCredentials.apiKeyHeader
    // 4. Send body: { data_view: { title: 'logs-*' } }
    // 5. Store the created data view ID in dataViewId variable
  });

  apiTest.afterAll(async ({ apiClient }) => {
    // TODO: Implement cleanup
    // 1. DELETE request to /api/data_views/data_view/{dataViewId}
    // 2. Set COMMON_HEADERS and adminApiCredentials.apiKeyHeader
  });

  apiTest.beforeEach(async ({ kbnClient }) => {
    // TODO: Implement test setup
    // 1. Load Kibana archive: KBN_ARCHIVE_SAVED_OBJECTS_BASIC
  });

  apiTest.afterEach(async ({ kbnClient }) => {
    // TODO: Implement cleanup
    // 1. Unload Kibana archive: KBN_ARCHIVE_SAVED_OBJECTS_BASIC
  });

  apiTest('can preview', async ({ apiClient }) => {
    // TODO: Implement test
    // 1. POST request to /api/data_views/swap_references/_preview
    // 2. Set COMMON_HEADERS and adminApiCredentials.apiKeyHeader
    // 3. Send body: { fromId: prevDataViewId, toId: dataViewId }
    // 4. Verify response statusCode equals 200
  });

  apiTest('can preview specifying type', async ({ apiClient }) => {
    // TODO: Implement test
    // 1. POST request to /api/data_views/swap_references/_preview
    // 2. Set COMMON_HEADERS and adminApiCredentials.apiKeyHeader
    // 3. Send body: { fromId: prevDataViewId, fromType: 'index-pattern', toId: dataViewId }
    // 4. Verify response statusCode equals 200
  });

  apiTest('can save changes', async ({ apiClient }) => {
    // TODO: Implement test
    // 1. POST request to /api/data_views/swap_references
    // 2. Set COMMON_HEADERS and adminApiCredentials.apiKeyHeader
    // 3. Send body: { fromId: prevDataViewId, toId: dataViewId }
    // 4. Verify response statusCode equals 200
    // 5. Verify response.body.result.length equals 1
    // 6. Verify response.body.result[0].id equals 'dd7caf20-9efd-11e7-acb3-3dab96693fab'
    // 7. Verify response.body.result[0].type equals 'visualization'
  });

  apiTest('can save changes and remove old saved object', async ({ apiClient }) => {
    // TODO: Implement test
    // 1. POST request to /api/data_views/swap_references
    // 2. Set COMMON_HEADERS and adminApiCredentials.apiKeyHeader
    // 3. Send body: { fromId: prevDataViewId, toId: dataViewId, delete: true }
    // 4. Verify response statusCode equals 200
    // 5. Verify response.body.result.length equals 1
    // 6. Verify response.body.deleteStatus.remainingRefs equals 0
    // 7. Verify response.body.deleteStatus.deletePerformed equals true
    // 8. GET request to verify prevDataViewId was deleted
    // 9. Verify GET response statusCode equals 404
  });

  apiTest.describe('limit affected saved objects', () => {
    apiTest.beforeEach(async ({ kbnClient }) => {
      // TODO: Implement test setup
      // 1. Load Kibana archive: KBN_ARCHIVE_SAVED_OBJECTS_RELATIONSHIPS
    });

    apiTest.afterEach(async ({ kbnClient }) => {
      // TODO: Implement cleanup
      // 1. Unload Kibana archive: KBN_ARCHIVE_SAVED_OBJECTS_RELATIONSHIPS
    });

    apiTest("won't delete if reference remains", async ({ apiClient }) => {
      // TODO: Implement test
      // 1. POST request to /api/data_views/swap_references
      // 2. Send body: { fromId: '8963ca30-3224-11e8-a572-ffca06da1357', toId: '91200a00-9efd-11e7-acb3-3dab96693fab', forId: ['960372e0-3224-11e8-a572-ffca06da1357'], delete: true }
      // 3. Verify response statusCode equals 200
      // 4. Verify response.body.result.length equals 1
      // 5. Verify response.body.deleteStatus.remainingRefs equals 1
      // 6. Verify response.body.deleteStatus.deletePerformed equals false
    });

    apiTest('can limit by id', async ({ apiClient }) => {
      // TODO: Implement test
      // 1. POST request to preview to confirm it finds two items
      // 2. Verify preview returns 2 results
      // 3. POST request to swap_references with forId limiting to one item
      // 4. Send body: { fromId: '8963ca30-3224-11e8-a572-ffca06da1357', toId: '91200a00-9efd-11e7-acb3-3dab96693fab', forId: ['960372e0-3224-11e8-a572-ffca06da1357'] }
      // 5. Verify response.body.result.length equals 1
    });

    apiTest('can limit by type', async ({ apiClient }) => {
      // TODO: Implement test
      // 1. POST request to preview to confirm it finds two items
      // 2. Verify preview returns 2 results
      // 3. POST request to swap_references with forType limiting to one item
      // 4. Send body: { fromId: '8963ca30-3224-11e8-a572-ffca06da1357', toId: '91200a00-9efd-11e7-acb3-3dab96693fab', forType: 'search' }
      // 5. Verify response.body.result.length equals 1
    });
  });
});
