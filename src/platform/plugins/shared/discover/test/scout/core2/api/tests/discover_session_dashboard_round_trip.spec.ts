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
import { DASHBOARD_API_PATH, DASHBOARD_API_VERSION } from '@kbn/scout/constants';
import {
  BASE_HEADERS,
  COMMON_HEADERS as DISCOVER_SESSION_HEADERS,
  DISCOVER_SESSION_API_BASE_PATH,
} from '../fixtures/constants';

const DASHBOARD_HEADERS = {
  ...BASE_HEADERS,
  'elastic-api-version': DASHBOARD_API_VERSION,
} as const;

const LEGACY_DISCOVER_PANEL_KEYS = [
  'attributes',
  'embeddableConfig',
  'kibanaSavedObjectMeta',
  'panelConfig',
  'savedObjectId',
  'searchSourceJSON',
  'selectedTabId',
] as const;

const expectNoLegacyDiscoverPanelKeys = (panels: readonly object[]) => {
  const serializedPanels = JSON.stringify(panels);

  for (const key of LEGACY_DISCOVER_PANEL_KEYS) {
    expect(serializedPanels).not.toContain(`"${key}"`);
  }
};

apiTest.describe(
  'dashboards - Discover session panel round trip',
  { tag: tags.deploymentAgnostic },
  () => {
    let editorCredentials: RoleApiCredentials;

    apiTest.beforeAll(async ({ requestAuth }) => {
      editorCredentials = await requestAuth.getApiKeyForPrivilegedUser();
    });

    apiTest.afterAll(async ({ kbnClient }) => {
      await kbnClient.savedObjects.clean({ types: ['search', 'dashboard'] });
    });

    apiTest(
      'preserves the public by-reference and by-value panel shapes',
      async ({ apiClient }) => {
        const sessionResponse = await apiTest.step('create Discover session', async () => {
          const response = await apiClient.post(DISCOVER_SESSION_API_BASE_PATH, {
            headers: {
              ...DISCOVER_SESSION_HEADERS,
              ...editorCredentials.apiKeyHeader,
            },
            body: {
              title: `Discover session for Dashboard API ${Date.now()} ${Math.random()}`,
              tabs: [
                {
                  id: 'first-tab',
                  label: 'First tab',
                  data_source: {
                    type: 'esql',
                    query: 'FROM logs-* | LIMIT 10',
                  },
                },
                {
                  id: 'selected-tab',
                  label: 'Selected tab',
                  data_source: {
                    type: 'esql',
                    query: 'FROM logs-* | WHERE bytes > 5000 | LIMIT 10',
                  },
                },
              ],
            },
            responseType: 'json',
          });

          expect(response).toHaveStatusCode(201);
          return response;
        });

        const byReferenceConfig = {
          title: 'Discover by reference',
          ref_id: sessionResponse.body.id,
          selected_tab_id: 'selected-tab',
          overrides: {
            column_order: ['bytes', 'clientip'],
            column_settings: {
              bytes: { width: 180 },
            },
            sort: [{ name: 'bytes', direction: 'asc' }],
            density: 'compact',
            row_height: 2,
          },
        };
        const byValueTab = {
          column_order: ['clientip', 'bytes'],
          column_settings: {
            bytes: { width: 180 },
          },
          sort: [{ name: 'bytes', direction: 'asc' }],
          density: 'compact',
          row_height: 2,
          query: { language: 'kql', expression: 'response: 200' },
          filters: [],
          data_source: {
            type: 'data_view_reference',
            ref_id: 'unresolved-data-view',
          },
          view_mode: 'documents',
        };

        const createResponse = await apiTest.step('create source dashboard', async () => {
          const response = await apiClient.post(DASHBOARD_API_PATH, {
            headers: {
              ...DASHBOARD_HEADERS,
              ...editorCredentials.apiKeyHeader,
            },
            body: {
              title: `Discover panel round trip source ${Date.now()} ${Math.random()}`,
              panels: [
                {
                  id: 'discover-by-reference',
                  grid: { x: 0, y: 0, w: 24, h: 15 },
                  type: 'discover_session',
                  config: byReferenceConfig,
                },
                {
                  id: 'discover-by-value',
                  grid: { x: 24, y: 0, w: 24, h: 15 },
                  type: 'discover_session',
                  config: {
                    title: 'Discover by value',
                    tabs: [byValueTab],
                  },
                },
              ],
            },
            responseType: 'json',
          });

          expect(response).toHaveStatusCode(201);
          return response;
        });

        const sourceResponse = await apiTest.step('read source dashboard', async () => {
          const response = await apiClient.get(`${DASHBOARD_API_PATH}/${createResponse.body.id}`, {
            headers: {
              ...DASHBOARD_HEADERS,
              ...editorCredentials.apiKeyHeader,
            },
            responseType: 'json',
          });

          expect(response).toHaveStatusCode(200);
          expect(response.body.warnings).toBeUndefined();
          expect(response.body.data.panels).toStrictEqual([
            expect.objectContaining({
              id: 'discover-by-reference',
              type: 'discover_session',
              config: expect.objectContaining(byReferenceConfig),
            }),
            expect.objectContaining({
              id: 'discover-by-value',
              type: 'discover_session',
              config: expect.objectContaining({
                title: 'Discover by value',
                tabs: [expect.objectContaining(byValueTab)],
              }),
            }),
          ]);
          expectNoLegacyDiscoverPanelKeys(response.body.data.panels);
          return response;
        });

        const cloneResponse = await apiTest.step('clone dashboard', async () => {
          const response = await apiClient.post(DASHBOARD_API_PATH, {
            headers: {
              ...DASHBOARD_HEADERS,
              ...editorCredentials.apiKeyHeader,
            },
            body: {
              title: `Discover panel round trip clone ${Date.now()} ${Math.random()}`,
              panels: sourceResponse.body.data.panels,
            },
            responseType: 'json',
          });

          expect(response).toHaveStatusCode(201);
          return response;
        });

        await apiTest.step('read cloned dashboard', async () => {
          const cloneReadResponse = await apiClient.get(
            `${DASHBOARD_API_PATH}/${cloneResponse.body.id}`,
            {
              headers: {
                ...DASHBOARD_HEADERS,
                ...editorCredentials.apiKeyHeader,
              },
              responseType: 'json',
            }
          );

          expect(cloneReadResponse).toHaveStatusCode(200);
          expect(cloneReadResponse.body.warnings).toBeUndefined();
          expect(cloneReadResponse.body.data.panels).toStrictEqual(sourceResponse.body.data.panels);
          expectNoLegacyDiscoverPanelKeys(cloneReadResponse.body.data.panels);
        });
      }
    );
  }
);
