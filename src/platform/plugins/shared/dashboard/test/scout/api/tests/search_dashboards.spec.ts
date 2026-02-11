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
import { apiTest, COMMON_HEADERS, KBN_ARCHIVES } from '../fixtures';

const SEARCH_ENDPOINT = 'api/dashboards/search';

apiTest.describe('dashboards - search', { tag: tags.deploymentAgnostic }, () => {
  let viewerCredentials: RoleApiCredentials;

  apiTest.beforeAll(async ({ kbnClient, requestAuth }) => {
    viewerCredentials = await requestAuth.getApiKey('viewer');
    await kbnClient.importExport.load(KBN_ARCHIVES.MANY_DASHBOARDS);
  });

  apiTest.afterAll(async ({ kbnClient }) => {
    await kbnClient.savedObjects.cleanStandardList();
  });

  apiTest('should retrieve a paginated list of dashboards', async ({ apiClient }) => {
    const response = await apiClient.post(SEARCH_ENDPOINT, {
      headers: {
        ...COMMON_HEADERS,
        ...viewerCredentials.apiKeyHeader,
      },
      body: {},
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(200);
    expect(response.body.total).toBe(100);
    expect(response.body.dashboards).toHaveLength(20);
    expect(response.body.dashboards[0].id).toBe('test-dashboard-00');
  });

  apiTest('should narrow results by search', async ({ apiClient }) => {
    const response = await apiClient.post(SEARCH_ENDPOINT, {
      headers: {
        ...COMMON_HEADERS,
        ...viewerCredentials.apiKeyHeader,
      },
      body: {
        search: '0*',
      },
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(200);
    expect(response.body.total).toBe(1);
    expect(response.body.dashboards).toHaveLength(1);
  });

  apiTest('should allow users to set a per page limit', async ({ apiClient }) => {
    const response = await apiClient.post(SEARCH_ENDPOINT, {
      headers: {
        ...COMMON_HEADERS,
        ...viewerCredentials.apiKeyHeader,
      },
      body: {
        per_page: 10,
      },
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(200);
    expect(response.body.total).toBe(100);
    expect(response.body.dashboards).toHaveLength(10);
  });

  apiTest(
    'should allow users to paginate through the list of dashboards',
    async ({ apiClient }) => {
      const response = await apiClient.post(SEARCH_ENDPOINT, {
        headers: {
          ...COMMON_HEADERS,
          ...viewerCredentials.apiKeyHeader,
        },
        body: {
          page: 5,
          per_page: 10,
        },
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body.total).toBe(100);
      expect(response.body.dashboards).toHaveLength(10);
      expect(response.body.dashboards[0].id).toBe('test-dashboard-40');
    }
  );
});
