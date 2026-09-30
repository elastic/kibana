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
import {
  apiTest,
  COMMON_HEADERS,
  VEGA_API_PATH,
  VEGA_FILTERS,
  VEGA_QUERY,
  VEGA_SPEC_HJSON,
} from '../fixtures';

apiTest.describe('vega - get', { tag: tags.deploymentAgnostic }, () => {
  let viewerCredentials: RoleApiCredentials;
  let editorCredentials: RoleApiCredentials;
  let createdId: string;
  let filteredId: string;

  apiTest.beforeAll(async ({ requestAuth, apiClient }) => {
    viewerCredentials = await requestAuth.getApiKeyForViewer();
    editorCredentials = await requestAuth.getApiKeyForPrivilegedUser();

    const response = await apiClient.post(VEGA_API_PATH, {
      headers: { ...COMMON_HEADERS, ...editorCredentials.apiKeyHeader },
      body: { title: 'Get Test Chart', spec: VEGA_SPEC_HJSON },
      responseType: 'json',
    });
    createdId = response.body.id;

    const filteredResponse = await apiClient.post(VEGA_API_PATH, {
      headers: { ...COMMON_HEADERS, ...editorCredentials.apiKeyHeader },
      body: {
        title: 'Get Filtered Chart',
        spec: VEGA_SPEC_HJSON,
        query: VEGA_QUERY,
        filters: VEGA_FILTERS,
      },
      responseType: 'json',
    });
    filteredId = filteredResponse.body.id;
  });

  apiTest.afterAll(async ({ kbnClient }) => {
    await kbnClient.savedObjects.clean({ types: ['vega'] });
  });

  apiTest('should return filters and query', async ({ apiClient }) => {
    const response = await apiClient.get(`${VEGA_API_PATH}/${filteredId}`, {
      headers: { ...COMMON_HEADERS, ...viewerCredentials.apiKeyHeader },
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(200);
    expect(response.body.data.query).toStrictEqual(VEGA_QUERY);
    expect(response.body.data.filters).toStrictEqual(VEGA_FILTERS);
  });

  apiTest('should return a vega library item by id', async ({ apiClient }) => {
    const response = await apiClient.get(`${VEGA_API_PATH}/${createdId}`, {
      headers: { ...COMMON_HEADERS, ...viewerCredentials.apiKeyHeader },
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(200);
    expect(response.body.id).toBe(createdId);
    expect(response.body.data.title).toBe('Get Test Chart');
    expect(response.body.data.spec).toStrictEqual(VEGA_SPEC_HJSON);
  });

  apiTest('should return 404 for a non-existent id', async ({ apiClient }) => {
    const response = await apiClient.get(`${VEGA_API_PATH}/does-not-exist`, {
      headers: { ...COMMON_HEADERS, ...viewerCredentials.apiKeyHeader },
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(404);
  });
});
