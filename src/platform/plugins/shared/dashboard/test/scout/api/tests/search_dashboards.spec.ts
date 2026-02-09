/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { RoleApiCredentials } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { tags } from '@kbn/scout';
import { apiTest, COMMON_HEADERS, DASHBOARD_API_PATH, KBN_ARCHIVES } from '../fixtures';

apiTest.describe('dashboards - list', { tag: tags.DEPLOYMENT_AGNOSTIC }, () => {
  let viewerCredentials: RoleApiCredentials;

  apiTest.beforeAll(async ({ kbnClient, requestAuth }) => {
    viewerCredentials = await requestAuth.getApiKey('viewer');
    await kbnClient.importExport.load(KBN_ARCHIVES.MANY_DASHBOARDS);
  });

  apiTest.afterAll(async ({ kbnClient }) => {
    await kbnClient.savedObjects.cleanStandardList();
  });

  apiTest('should retrieve a paginated list of dashboards', async ({ apiClient }) => {
    const response = await apiClient.get(DASHBOARD_API_PATH, {
      headers: {
        ...COMMON_HEADERS,
        ...viewerCredentials.apiKeyHeader,
      },
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(200);
    expect(response.body.total).toBe(100);
    expect(response.body.items[0].id).toBe('test-dashboard-00');
    expect(response.body.items).toHaveLength(20);
  });

  apiTest('should allow users to set a per page limit', async ({ apiClient }) => {
    const response = await apiClient.get(`${DASHBOARD_API_PATH}?perPage=10`, {
      headers: {
        ...COMMON_HEADERS,
        ...viewerCredentials.apiKeyHeader,
      },
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(200);
    expect(response.body.total).toBe(100);
    expect(response.body.items).toHaveLength(10);
  });

  apiTest(
    'should allow users to paginate through the list of dashboards',
    async ({ apiClient }) => {
      const response = await apiClient.get(`${DASHBOARD_API_PATH}?page=5&perPage=10`, {
        headers: {
          ...COMMON_HEADERS,
          ...viewerCredentials.apiKeyHeader,
        },
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body.total).toBe(100);
      expect(response.body.items).toHaveLength(10);
      expect(response.body.items[0].id).toBe('test-dashboard-40');
    }
  );
});
