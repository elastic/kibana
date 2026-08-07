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
import {
  COMMON_HEADERS,
  DISCOVER_SESSION_API_BASE_PATH,
  KBN_ARCHIVES,
  TEST_DISCOVER_SESSION_ID,
} from '../fixtures/constants';

const createId = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;

const createEsqlTab = (id: string, query: string) => ({
  id,
  label: id,
  data_source: {
    type: 'esql',
    query,
  },
});

apiTest.describe('PUT /api/discover_sessions/{id}', { tag: tags.deploymentAgnostic }, () => {
  let editorCredentials: RoleApiCredentials;
  let viewerCredentials: RoleApiCredentials;

  apiTest.beforeAll(async ({ requestAuth }) => {
    editorCredentials = await requestAuth.getApiKeyForPrivilegedUser();
    viewerCredentials = await requestAuth.getApiKeyForViewer();
  });

  apiTest.beforeEach(async ({ kbnClient }) => {
    await kbnClient.importExport.load(KBN_ARCHIVES.SESSION_WITH_CONTROL);
  });

  apiTest.afterEach(async ({ kbnClient }) => {
    await kbnClient.savedObjects.clean({ types: ['search'] });
  });

  apiTest('creates a Discover session at the requested ID', async ({ apiClient }) => {
    const id = createId('put-create');
    const title = `PUT-created Discover session ${Date.now()}`;

    const response = await apiClient.put(`${DISCOVER_SESSION_API_BASE_PATH}/${id}`, {
      headers: {
        ...COMMON_HEADERS,
        ...editorCredentials.apiKeyHeader,
      },
      body: {
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
      },
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(201);
    expect(response.body).toMatchObject({
      id,
      data: {
        title,
        description: '',
        tabs: [
          expect.objectContaining({
            id: 'main',
            hide_chart: false,
            hide_table: false,
            time_restore: false,
            data_source: {
              type: 'data_view_reference',
              ref_id: 'missing-data-view',
            },
          }),
        ],
      },
      meta: {
        managed: false,
      },
    });
    expect(response.body.meta.version).toBeDefined();
  });

  apiTest('fully replaces an existing Discover session', async ({ apiClient, kbnClient }) => {
    const id = TEST_DISCOVER_SESSION_ID;
    const initialSession = await kbnClient.savedObjects.get({
      type: 'search',
      id,
    });

    const replacementBody = {
      title: 'Replacement session',
      tabs: [
        {
          id: 'replacement',
          label: 'Replacement',
          data_source: {
            type: 'data_view_reference' as const,
            ref_id: 'replacement-data-view',
          },
        },
      ],
    };
    const response = await apiClient.put(`${DISCOVER_SESSION_API_BASE_PATH}/${id}`, {
      headers: {
        ...COMMON_HEADERS,
        ...editorCredentials.apiKeyHeader,
      },
      body: replacementBody,
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(200);
    expect(response.body.id).toBe(id);
    expect(response.body.data).toMatchObject({
      title: 'Replacement session',
      description: '',
      tabs: [
        expect.objectContaining({
          id: 'replacement',
          hide_chart: false,
          hide_table: false,
          time_restore: false,
          data_source: {
            type: 'data_view_reference',
            ref_id: 'replacement-data-view',
          },
        }),
      ],
    });
    expect(response.body.data.tabs).toHaveLength(1);
    expect(response.body.meta.version).not.toBe(initialSession.version);

    const storedSession = await kbnClient.savedObjects.get({ type: 'search', id });
    expect(storedSession.references).toStrictEqual([
      {
        name: 'tab_replacement.kibanaSavedObjectMeta.searchSourceJSON.index',
        type: 'index-pattern',
        id: 'replacement-data-view',
      },
    ]);

    const repeatedResponse = await apiClient.put(`${DISCOVER_SESSION_API_BASE_PATH}/${id}`, {
      headers: {
        ...COMMON_HEADERS,
        ...editorCredentials.apiKeyHeader,
      },
      body: replacementBody,
      responseType: 'json',
    });

    expect(repeatedResponse).toHaveStatusCode(200);
    expect(repeatedResponse.body.data).toStrictEqual(response.body.data);
  });

  apiTest(
    'updates an existing session whose ID predates the as-code format',
    async ({ apiClient, kbnClient }) => {
      const id = `Legacy-Discover-Session-${Date.now()}`;
      await kbnClient.savedObjects.create({
        type: 'search',
        id,
        overwrite: false,
        attributes: {
          title: 'Legacy session',
          description: '',
          tabs: [
            {
              id: 'main',
              label: 'Main',
              attributes: {
                hideChart: false,
                hideTable: false,
                columns: [],
                sort: [],
                grid: {},
                kibanaSavedObjectMeta: {
                  searchSourceJSON: JSON.stringify({
                    query: { esql: 'FROM logs-* | LIMIT 10' },
                    filter: [],
                  }),
                },
                isTextBasedQuery: true,
              },
            },
          ],
        },
        references: [],
      });

      const response = await apiClient.put(
        `${DISCOVER_SESSION_API_BASE_PATH}/${encodeURIComponent(id)}`,
        {
          headers: {
            ...COMMON_HEADERS,
            ...editorCredentials.apiKeyHeader,
          },
          body: {
            title: 'Updated legacy session',
            tabs: [createEsqlTab('main', 'FROM metrics-* | LIMIT 10')],
          },
          responseType: 'json',
        }
      );

      expect(response).toHaveStatusCode(200);
      expect(response.body.id).toBe(id);
      expect(response.body.data.title).toBe('Updated legacy session');
    }
  );

  apiTest('returns 400 for an invalid ID when creating a session', async ({ apiClient }) => {
    const response = await apiClient.put(`${DISCOVER_SESSION_API_BASE_PATH}/INVALID-ID`, {
      headers: {
        ...COMMON_HEADERS,
        ...editorCredentials.apiKeyHeader,
      },
      body: {
        title: 'Invalid ID',
        tabs: [createEsqlTab('main', 'FROM logs-* | LIMIT 10')],
      },
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(400);
  });

  apiTest('returns 403 when the user cannot update Discover sessions', async ({ apiClient }) => {
    const response = await apiClient.put(
      `${DISCOVER_SESSION_API_BASE_PATH}/${TEST_DISCOVER_SESSION_ID}`,
      {
        headers: {
          ...COMMON_HEADERS,
          ...viewerCredentials.apiKeyHeader,
        },
        body: {
          title: 'Forbidden Discover session',
          tabs: [createEsqlTab('main', 'FROM logs-* | LIMIT 10')],
        },
        responseType: 'json',
      }
    );

    expect(response).toHaveStatusCode(403);
  });
});
