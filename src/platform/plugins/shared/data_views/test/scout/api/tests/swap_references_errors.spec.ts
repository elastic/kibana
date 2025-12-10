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

apiTest.describe('swap data view references - errors', { tag: tags.PLATFORM }, () => {
  let adminApiCredentials: RoleApiCredentials;
  let dataViewId: string;
  const prevDataViewId = '91200a00-9efd-11e7-acb3-3dab96693fab';

  apiTest.beforeAll(async ({ apiClient, requestAuth }) => {
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

  apiTest('requires toId parameter', async ({ apiClient }) => {
    // TODO: Implement test
    // 1. POST request to /api/data_views/swap_references
    // 2. Set COMMON_HEADERS and adminApiCredentials.apiKeyHeader
    // 3. Send body without toId: { fromId: prevDataViewId }
    // 4. Verify response statusCode equals 400
  });

  apiTest('requires fromId parameter', async ({ apiClient }) => {
    // TODO: Implement test
    // 1. POST request to /api/data_views/swap_references
    // 2. Set COMMON_HEADERS and adminApiCredentials.apiKeyHeader
    // 3. Send body without fromId: { toId: dataViewId }
    // 4. Verify response statusCode equals 400
  });
});
