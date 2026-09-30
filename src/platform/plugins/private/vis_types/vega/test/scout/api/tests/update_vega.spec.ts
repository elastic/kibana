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
  VEGA_FILTER_DATA_VIEW_ID,
  VEGA_FILTERS,
  VEGA_QUERY,
  VEGA_SPEC_HJSON,
} from '../fixtures';

apiTest.describe('vega - update', { tag: tags.deploymentAgnostic }, () => {
  let editorCredentials: RoleApiCredentials;
  let viewerCredentials: RoleApiCredentials;
  let createdId: string;

  apiTest.beforeAll(async ({ requestAuth }) => {
    editorCredentials = await requestAuth.getApiKeyForPrivilegedUser();
    viewerCredentials = await requestAuth.getApiKeyForViewer();
  });

  apiTest.beforeEach(async ({ apiClient }) => {
    const response = await apiClient.post(VEGA_API_PATH, {
      headers: { ...COMMON_HEADERS, ...editorCredentials.apiKeyHeader },
      body: { title: 'Original Title', spec: VEGA_SPEC_HJSON },
      responseType: 'json',
    });
    createdId = response.body.id;
  });

  apiTest.afterEach(async ({ kbnClient }) => {
    await kbnClient.savedObjects.clean({ types: ['vega'] });
  });

  apiTest('should update a vega library item', async ({ apiClient }) => {
    const response = await apiClient.put(`${VEGA_API_PATH}/${createdId}`, {
      headers: { ...COMMON_HEADERS, ...editorCredentials.apiKeyHeader },
      body: { title: 'Updated Title', spec: VEGA_SPEC_HJSON },
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(200);
    expect(response.body.id).toBe(createdId);
    expect(response.body.data.title).toBe('Updated Title');
  });

  apiTest(
    'should add, then clear filters, query, and references',
    async ({ apiClient, kbnClient }) => {
      const withFilters = await apiClient.put(`${VEGA_API_PATH}/${createdId}`, {
        headers: { ...COMMON_HEADERS, ...editorCredentials.apiKeyHeader },
        body: {
          title: 'Filtered Title',
          spec: VEGA_SPEC_HJSON,
          query: VEGA_QUERY,
          filters: VEGA_FILTERS,
        },
        responseType: 'json',
      });

      expect(withFilters).toHaveStatusCode(200);
      const filteredSavedObject = await kbnClient.savedObjects.get({
        type: 'vega',
        id: createdId,
      });
      expect(filteredSavedObject.references).toStrictEqual([
        {
          name: 'filters[0].data_view_id',
          type: 'index-pattern',
          id: VEGA_FILTER_DATA_VIEW_ID,
        },
      ]);

      const cleared = await apiClient.put(`${VEGA_API_PATH}/${createdId}`, {
        headers: { ...COMMON_HEADERS, ...editorCredentials.apiKeyHeader },
        body: { title: 'Cleared Title', spec: VEGA_SPEC_HJSON },
        responseType: 'json',
      });

      expect(cleared).toHaveStatusCode(200);
      expect(cleared.body.data.query).toBeUndefined();
      expect(cleared.body.data.filters).toBeUndefined();
      const clearedSavedObject = await kbnClient.savedObjects.get({
        type: 'vega',
        id: createdId,
      });
      expect(clearedSavedObject.references).toStrictEqual([]);
    }
  );

  apiTest('should create when id does not exist (upsert)', async ({ apiClient }) => {
    const response = await apiClient.put(`${VEGA_API_PATH}/new-id-for-upsert`, {
      headers: { ...COMMON_HEADERS, ...editorCredentials.apiKeyHeader },
      body: { title: 'Upserted Chart', spec: VEGA_SPEC_HJSON },
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(201);
    expect(response.body.id).toBe('new-id-for-upsert');
    expect(response.body.data.title).toBe('Upserted Chart');
  });

  apiTest('authorization - returns 403 for viewer', async ({ apiClient }) => {
    const response = await apiClient.put(`${VEGA_API_PATH}/${createdId}`, {
      headers: { ...COMMON_HEADERS, ...viewerCredentials.apiKeyHeader },
      body: { title: 'Updated Title', spec: VEGA_SPEC_HJSON },
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(403);
  });
});
