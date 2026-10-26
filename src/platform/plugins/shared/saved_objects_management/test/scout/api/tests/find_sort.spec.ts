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

const { KBN_ARCHIVES, MANAGEMENT_API } = testData;

apiTest.describe('find - sortField and sortOrder', { tag: tags.deploymentAgnostic }, () => {
  let adminCredentials: RoleApiCredentials;

  apiTest.beforeAll(async ({ requestAuth, kbnClient }) => {
    adminCredentials = await requestAuth.getApiKey('viewer');
    await kbnClient.importExport.load(KBN_ARCHIVES.BASIC);
    await kbnClient.importExport.load(KBN_ARCHIVES.REFERENCES);
  });

  apiTest.afterAll(async ({ kbnClient }) => {
    await kbnClient.importExport.unload(KBN_ARCHIVES.REFERENCES);
    await kbnClient.importExport.unload(KBN_ARCHIVES.BASIC);
    await kbnClient.savedObjects.cleanStandardList();
  });

  apiTest('sort objects by "type" in "asc" order', async ({ apiClient }) => {
    const response = await apiClient.get(
      `${MANAGEMENT_API.FIND}?type=visualization&type=dashboard&sortField=type&sortOrder=asc`,
      { headers: { ...adminCredentials.apiKeyHeader, ...testData.COMMON_HEADERS } }
    );

    expect(response).toHaveStatusCode(200);
    const objects = response.body.saved_objects;
    expect(objects.length).toBeGreaterThan(1);
    expect(objects[0].type).toBe('dashboard');
  });

  apiTest(
    'sort objects by "type" in "desc" order - may not sort correctly in serverless',
    async ({ apiClient }) => {
      const response = await apiClient.get(
        `${MANAGEMENT_API.FIND}?type=visualization&type=dashboard&sortField=type&sortOrder=desc`,
        { headers: { ...adminCredentials.apiKeyHeader, ...testData.COMMON_HEADERS } }
      );

      expect(response).toHaveStatusCode(200);
      expect(response.body.saved_objects[0].type).toBe('visualization');
    }
  );
});
