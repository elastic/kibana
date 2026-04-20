/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { RoleApiCredentials } from '@kbn/scout';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { apiTest, testData } from '../fixtures';

const { KBN_ARCHIVES, relationshipsUrl } = testData;

const NON_EXISTENT_ID = 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx';

apiTest.describe('relationships - should return 404', { tag: tags.deploymentAgnostic }, () => {
  let adminCredentials: RoleApiCredentials;

  apiTest.beforeAll(async ({ requestAuth, kbnClient }) => {
    adminCredentials = await requestAuth.getApiKey('viewer');
    await kbnClient.importExport.load(KBN_ARCHIVES.RELATIONSHIPS);
  });

  apiTest.afterAll(async ({ kbnClient }) => {
    await kbnClient.importExport.unload(KBN_ARCHIVES.RELATIONSHIPS);
    await kbnClient.savedObjects.cleanStandardList();
  });

  apiTest('a search', async ({ apiClient }) => {
    const response = await apiClient.get(relationshipsUrl('search', NON_EXISTENT_ID), {
      headers: { ...adminCredentials.apiKeyHeader, ...testData.COMMON_HEADERS },
    });
    expect(response).toHaveStatusCode(404);
  });

  apiTest('a dashboard', async ({ apiClient }) => {
    const response = await apiClient.get(relationshipsUrl('dashboard', NON_EXISTENT_ID), {
      headers: { ...adminCredentials.apiKeyHeader, ...testData.COMMON_HEADERS },
    });
    expect(response).toHaveStatusCode(404);
  });

  apiTest('a visualization', async ({ apiClient }) => {
    const response = await apiClient.get(relationshipsUrl('visualization', NON_EXISTENT_ID), {
      headers: { ...adminCredentials.apiKeyHeader, ...testData.COMMON_HEADERS },
    });
    expect(response).toHaveStatusCode(404);
  });

  apiTest('an index pattern', async ({ apiClient }) => {
    const response = await apiClient.get(relationshipsUrl('index-pattern', NON_EXISTENT_ID), {
      headers: { ...adminCredentials.apiKeyHeader, ...testData.COMMON_HEADERS },
    });
    expect(response).toHaveStatusCode(404);
  });
});
