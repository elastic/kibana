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
import { COMMON_HEADERS, DISCOVER_SESSION_API_BASE_PATH } from '../fixtures/constants';

const createRequestBody = (title: string) => ({
  title,
  tabs: [
    {
      id: 'main',
      label: 'Main',
      data_source: {
        type: 'esql',
        query: 'FROM logs-* | LIMIT 10',
      },
    },
  ],
});

const createUnresolvedReferenceRequestBody = (title: string) => ({
  title,
  tabs: [
    {
      id: 'main',
      label: 'Main',
      data_source: {
        type: 'data_view_reference',
        ref_id: 'missing-data-view',
      },
    },
  ],
});

apiTest.describe('POST /api/discover_sessions', { tag: tags.deploymentAgnostic }, () => {
  let editorCredentials: RoleApiCredentials;
  let viewerCredentials: RoleApiCredentials;

  apiTest.beforeAll(async ({ requestAuth }) => {
    editorCredentials = await requestAuth.getApiKeyForPrivilegedUser();
    viewerCredentials = await requestAuth.getApiKeyForViewer();
  });

  apiTest.afterAll(async ({ kbnClient }) => {
    await kbnClient.savedObjects.clean({ types: ['search'] });
  });

  apiTest('creates a Discover session', async ({ apiClient }) => {
    const title = `Scout Discover session ${Date.now()} ${Math.random()}`;

    const response = await apiClient.post(DISCOVER_SESSION_API_BASE_PATH, {
      headers: {
        ...COMMON_HEADERS,
        ...editorCredentials.apiKeyHeader,
      },
      body: createRequestBody(title),
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(201);
    expect(response.body.id).toBeDefined();
    expect(response.body.data).toMatchObject({
      title,
      description: '',
      tabs: [
        expect.objectContaining({
          id: 'main',
          label: 'Main',
          hide_chart: false,
          hide_table: false,
          sort: [],
          time_restore: false,
          data_source: {
            type: 'esql',
            query: 'FROM logs-* | LIMIT 10',
          },
        }),
      ],
    });
    expect(response.body.meta.managed).toBe(false);
    expect(response.body.meta.version).toBeDefined();
  });

  apiTest(
    'creates a Discover session with an unresolved data view reference',
    async ({ apiClient }) => {
      const title = `Scout unresolved reference ${Date.now()} ${Math.random()}`;

      const response = await apiClient.post(DISCOVER_SESSION_API_BASE_PATH, {
        headers: {
          ...COMMON_HEADERS,
          ...editorCredentials.apiKeyHeader,
        },
        body: createUnresolvedReferenceRequestBody(title),
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(201);
      expect(response.body.data.tabs[0].data_source).toStrictEqual({
        type: 'data_view_reference',
        ref_id: 'missing-data-view',
      });
    }
  );

  apiTest('returns 400 for invalid request bodies', async ({ apiClient }) => {
    const response = await apiClient.post(DISCOVER_SESSION_API_BASE_PATH, {
      headers: {
        ...COMMON_HEADERS,
        ...editorCredentials.apiKeyHeader,
      },
      body: {},
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(400);
  });

  apiTest('returns 403 when the user cannot create Discover sessions', async ({ apiClient }) => {
    const response = await apiClient.post(DISCOVER_SESSION_API_BASE_PATH, {
      headers: {
        ...COMMON_HEADERS,
        ...viewerCredentials.apiKeyHeader,
      },
      body: createRequestBody('Forbidden Discover session'),
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(403);
  });
});
