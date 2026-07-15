/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { apiTest, tags, type KibanaRole, type RoleApiCredentials } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { COMMON_HEADERS, DISCOVER_SESSION_API_BASE_PATH } from '../fixtures/constants';

const DEV_TOOLS_READ_ROLE: KibanaRole = {
  elasticsearch: {
    cluster: [],
  },
  kibana: [
    {
      base: [],
      feature: { dev_tools: ['read'] },
      spaces: ['*'],
    },
  ],
};

apiTest.describe('GET /api/discover_sessions/{id}', { tag: tags.deploymentAgnostic }, () => {
  const id = `Legacy-Discover-Session-${Date.now()}`;
  let viewerCredentials: RoleApiCredentials;
  let devToolsReaderCredentials: RoleApiCredentials;

  apiTest.beforeAll(async ({ kbnClient, requestAuth }) => {
    viewerCredentials = await requestAuth.getApiKeyForViewer();
    devToolsReaderCredentials = await requestAuth.getApiKeyForCustomRole(DEV_TOOLS_READ_ROLE);
    await kbnClient.savedObjects.create({
      type: 'search',
      id,
      overwrite: false,
      attributes: {
        title: 'Legacy Discover session',
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
  });

  apiTest.afterAll(async ({ kbnClient }) => {
    await kbnClient.savedObjects.clean({ types: ['search'] });
  });

  apiTest('returns an existing Discover session', async ({ apiClient }) => {
    const response = await apiClient.get(
      `${DISCOVER_SESSION_API_BASE_PATH}/${encodeURIComponent(id)}`,
      {
        headers: {
          ...COMMON_HEADERS,
          ...viewerCredentials.apiKeyHeader,
        },
        responseType: 'json',
      }
    );

    expect(response).toHaveStatusCode(200);
    expect(response.body).toMatchObject({
      id,
      data: {
        title: 'Legacy Discover session',
        description: '',
        tabs: [
          expect.objectContaining({
            id: 'main',
            label: 'Main',
            hide_chart: false,
            hide_table: false,
            time_restore: false,
            data_source: {
              type: 'esql',
              query: 'FROM logs-* | LIMIT 10',
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

  apiTest('returns 404 when the Discover session does not exist', async ({ apiClient }) => {
    const response = await apiClient.get(`${DISCOVER_SESSION_API_BASE_PATH}/does-not-exist`, {
      headers: {
        ...COMMON_HEADERS,
        ...viewerCredentials.apiKeyHeader,
      },
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(404);
  });

  apiTest('returns 403 when the user cannot read Discover sessions', async ({ apiClient }) => {
    const response = await apiClient.get(
      `${DISCOVER_SESSION_API_BASE_PATH}/${encodeURIComponent(id)}`,
      {
        headers: {
          ...COMMON_HEADERS,
          ...devToolsReaderCredentials.apiKeyHeader,
        },
        responseType: 'json',
      }
    );

    expect(response).toHaveStatusCode(403);
  });
});
