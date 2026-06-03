/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { apiTest, tags, type RoleApiCredentials } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { BASE_PATH, COMMON_HEADERS, ID_OVER_MAX_LENGTH } from '../fixtures/constants';

apiTest.describe('GET /api/data_views/{id} - as code', { tag: tags.deploymentAgnostic }, () => {
  let adminApiCredentials: RoleApiCredentials;

  // Mock data view
  const MOCK_DATA_VIEW = {
    title: 'some-index-pattern-*',
    id: `data-view-${Date.now()}-${Math.random()}`,
  };

  apiTest.beforeAll(async ({ requestAuth, apiServices }) => {
    adminApiCredentials = await requestAuth.getApiKeyForAdmin();
    await apiServices.dataViews.create(MOCK_DATA_VIEW);
  });

  apiTest.afterAll(async ({ apiServices }) => {
    await apiServices.dataViews.delete(MOCK_DATA_VIEW.id);
  });

  apiTest('can retrieve a data view', async ({ apiClient }) => {
    const getResponse = await apiClient.get(`${BASE_PATH}/${MOCK_DATA_VIEW.id}`, {
      headers: {
        ...COMMON_HEADERS,
        ...adminApiCredentials.apiKeyHeader,
      },
      responseType: 'json',
    });

    expect(getResponse).toHaveStatusCode(200);

    // Validate the id
    expect(getResponse.body.id).toBe(MOCK_DATA_VIEW.id);

    // Validate the data (id is only on the top-level response, not in data)
    expect(getResponse.body.data).toMatchObject({
      index_pattern: MOCK_DATA_VIEW.title,
    });

    // Validate the meta
    expect(getResponse.body.meta.managed).toBe(false);
    expect(getResponse.body.meta.version).toBeDefined();
    expect(getResponse.body.meta.namespaces).toBeDefined();
  });

  apiTest('returns 404 for a non-existing data view', async ({ apiClient }) => {
    const nonExistingId = `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx-${Date.now()}`;

    const response = await apiClient.get(`${BASE_PATH}/${nonExistingId}`, {
      headers: {
        ...COMMON_HEADERS,
        ...adminApiCredentials.apiKeyHeader,
      },
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(404);
  });

  apiTest('returns 400 when ID is too long', async ({ apiClient }) => {
    const response = await apiClient.get(`${BASE_PATH}/${ID_OVER_MAX_LENGTH}`, {
      headers: {
        ...COMMON_HEADERS,
        ...adminApiCredentials.apiKeyHeader,
      },
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(400);
    expect(response.body.message).toBe(
      '[request params.id]: value has length [1759] but it must have a maximum length of [1000].'
    );
  });
});
