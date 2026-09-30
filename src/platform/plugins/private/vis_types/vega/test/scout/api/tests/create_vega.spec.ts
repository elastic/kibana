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
  VEGA_SPEC_JSON,
} from '../fixtures';

apiTest.describe('vega - create', { tag: tags.deploymentAgnostic }, () => {
  let editorCredentials: RoleApiCredentials;
  let viewerCredentials: RoleApiCredentials;

  apiTest.beforeAll(async ({ requestAuth }) => {
    editorCredentials = await requestAuth.getApiKeyForPrivilegedUser();
    viewerCredentials = await requestAuth.getApiKeyForViewer();
  });

  apiTest.afterAll(async ({ kbnClient }) => {
    await kbnClient.savedObjects.clean({ types: ['vega'] });
  });

  apiTest('should create a vega library item with hjson spec', async ({ apiClient }) => {
    const response = await apiClient.post(VEGA_API_PATH, {
      headers: { ...COMMON_HEADERS, ...editorCredentials.apiKeyHeader },
      body: { title: 'My Vega Chart (HJSON)', spec: VEGA_SPEC_HJSON },
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(201);
    expect(response.body.id).toBeDefined();
    expect(response.body.data.title).toBe('My Vega Chart (HJSON)');
    expect(response.body.data.spec).toStrictEqual(VEGA_SPEC_HJSON);
  });

  apiTest('should create a vega library item with json spec', async ({ apiClient }) => {
    const response = await apiClient.post(VEGA_API_PATH, {
      headers: { ...COMMON_HEADERS, ...editorCredentials.apiKeyHeader },
      body: { title: 'My Vega Chart (JSON)', spec: VEGA_SPEC_JSON },
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(201);
    expect(response.body.id).toBeDefined();
    expect(response.body.data.title).toBe('My Vega Chart (JSON)');
    expect(response.body.data.spec).toStrictEqual(VEGA_SPEC_JSON);
  });

  apiTest(
    'should create a vega library item with a json spec without $schema',
    async ({ apiClient }) => {
      const response = await apiClient.post(VEGA_API_PATH, {
        headers: { ...COMMON_HEADERS, ...editorCredentials.apiKeyHeader },
        body: { title: 'My Vega Chart', spec: { format: 'json', value: {} } },
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(201);
      expect(response.body.data.spec).toStrictEqual({ format: 'json', value: {} });
    }
  );

  apiTest(
    'should create a vega library item with filters and query',
    async ({ apiClient, kbnClient }) => {
      const response = await apiClient.post(VEGA_API_PATH, {
        headers: { ...COMMON_HEADERS, ...editorCredentials.apiKeyHeader },
        body: {
          title: 'My Filtered Chart',
          spec: VEGA_SPEC_HJSON,
          query: VEGA_QUERY,
          filters: VEGA_FILTERS,
        },
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(201);
      expect(response.body.data.query).toStrictEqual(VEGA_QUERY);
      expect(response.body.data.filters).toStrictEqual(VEGA_FILTERS);

      const savedObject = await kbnClient.savedObjects.get({
        type: 'vega',
        id: response.body.id,
      });
      expect(savedObject.attributes.filters[0].data_view_id).toBeUndefined();
      expect(savedObject.attributes.filters[0].data_view_ref_name).toBe('filters[0].data_view_id');
      expect(savedObject.references).toStrictEqual([
        {
          name: 'filters[0].data_view_id',
          type: 'index-pattern',
          id: VEGA_FILTER_DATA_VIEW_ID,
        },
      ]);
    }
  );

  apiTest('validation - returns 400 for an invalid filter', async ({ apiClient }) => {
    const response = await apiClient.post(VEGA_API_PATH, {
      headers: { ...COMMON_HEADERS, ...editorCredentials.apiKeyHeader },
      body: {
        title: 'My Vega Chart',
        spec: VEGA_SPEC_HJSON,
        filters: [{ type: 'condition', condition: { field: 'a', operator: 'unknown' } }],
      },
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(400);
  });

  apiTest('validation - returns 400 for more than 100 filters', async ({ apiClient }) => {
    const response = await apiClient.post(VEGA_API_PATH, {
      headers: { ...COMMON_HEADERS, ...editorCredentials.apiKeyHeader },
      body: {
        title: 'My Vega Chart',
        spec: VEGA_SPEC_HJSON,
        filters: Array.from({ length: 101 }, () => ({ type: 'dsl', dsl: { match_all: {} } })),
      },
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(400);
  });

  apiTest('validation - returns 400 for an invalid query language', async ({ apiClient }) => {
    const response = await apiClient.post(VEGA_API_PATH, {
      headers: { ...COMMON_HEADERS, ...editorCredentials.apiKeyHeader },
      body: {
        title: 'My Vega Chart',
        spec: VEGA_SPEC_HJSON,
        query: { expression: 'a', language: 'sql' },
      },
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(400);
  });

  apiTest('validation - returns 400 when title is missing', async ({ apiClient }) => {
    const response = await apiClient.post(VEGA_API_PATH, {
      headers: { ...COMMON_HEADERS, ...editorCredentials.apiKeyHeader },
      body: { spec: VEGA_SPEC_HJSON },
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(400);
  });

  apiTest('authorization - returns 403 for viewer', async ({ apiClient }) => {
    const response = await apiClient.post(VEGA_API_PATH, {
      headers: { ...COMMON_HEADERS, ...viewerCredentials.apiKeyHeader },
      body: { title: 'My Vega Chart', spec: VEGA_SPEC_HJSON },
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(403);
  });
});
