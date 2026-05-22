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

const { KBN_ARCHIVES, MANAGEMENT_API, SAVED_OBJECT_IDS } = testData;

apiTest.describe('find - basic', { tag: tags.deploymentAgnostic }, () => {
  let adminCredentials: RoleApiCredentials;

  apiTest.beforeAll(async ({ requestAuth, kbnClient }) => {
    adminCredentials = await requestAuth.getApiKey('viewer');
    await kbnClient.savedObjects.cleanStandardList();
    await kbnClient.importExport.load(KBN_ARCHIVES.BASIC);
  });

  apiTest.afterAll(async ({ kbnClient }) => {
    await kbnClient.importExport.unload(KBN_ARCHIVES.BASIC);
    await kbnClient.savedObjects.cleanStandardList();
  });

  apiTest('should return 200 with individual responses', async ({ apiClient }) => {
    const response = await apiClient.get(`${MANAGEMENT_API.FIND}?type=visualization`, {
      headers: { ...adminCredentials.apiKeyHeader, ...testData.COMMON_HEADERS },
    });

    expect(response).toHaveStatusCode(200);
    expect(response.body.saved_objects.map((so: { id: string }) => so.id)).toStrictEqual([
      SAVED_OBJECT_IDS.VISUALIZATION,
    ]);
  });

  apiTest('unknown type - should return 200 with empty response', async ({ apiClient }) => {
    const response = await apiClient.get(`${MANAGEMENT_API.FIND}?type=wigwags`, {
      headers: { ...adminCredentials.apiKeyHeader, ...testData.COMMON_HEADERS },
    });

    expect(response).toHaveStatusCode(200);
    expect(response.body).toStrictEqual({
      page: 1,
      per_page: 20,
      total: 0,
      saved_objects: [],
    });
  });

  apiTest('page beyond total - should return 200 with empty response', async ({ apiClient }) => {
    const response = await apiClient.get(
      `${MANAGEMENT_API.FIND}?type=visualization&page=100&perPage=100`,
      { headers: { ...adminCredentials.apiKeyHeader, ...testData.COMMON_HEADERS } }
    );

    expect(response).toHaveStatusCode(200);
    expect(response.body).toStrictEqual({
      page: 100,
      per_page: 100,
      total: 1,
      saved_objects: [],
    });
  });

  apiTest(
    'unknown search field - should return 400 when using searchFields',
    async ({ apiClient }) => {
      const response = await apiClient.get(`${MANAGEMENT_API.FIND}?type=url&searchFields=a`, {
        headers: { ...adminCredentials.apiKeyHeader, ...testData.COMMON_HEADERS },
      });

      expect(response).toHaveStatusCode(400);
      expect(response.body).toStrictEqual({
        statusCode: 400,
        error: 'Bad Request',
        message:
          "[request query.searchFields]: Additional properties are not allowed ('searchFields' was unexpected)",
      });
    }
  );
});
