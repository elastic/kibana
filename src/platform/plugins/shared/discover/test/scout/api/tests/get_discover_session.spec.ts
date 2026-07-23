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
import type { DiscoverSessionAttributes } from '@kbn/saved-search-plugin/server';
import {
  COMMON_HEADERS,
  DEV_TOOLS_READ_ROLE,
  DISCOVER_SESSION_API_BASE_PATH,
  KBN_ARCHIVES,
  TEST_DISCOVER_SESSION_ID,
} from '../fixtures/constants';

const INVALID_DISCOVER_SESSION_ID = 'invalid-discover-session';

apiTest.describe('GET /api/discover_sessions/{id}', { tag: tags.deploymentAgnostic }, () => {
  let viewerCredentials: RoleApiCredentials;
  let devToolsReaderCredentials: RoleApiCredentials;

  apiTest.beforeAll(async ({ kbnClient, requestAuth }) => {
    viewerCredentials = await requestAuth.getApiKeyForViewer();
    devToolsReaderCredentials = await requestAuth.getApiKeyForCustomRole(DEV_TOOLS_READ_ROLE);
    await kbnClient.importExport.load(KBN_ARCHIVES.SESSION_WITH_CONTROL);
  });

  apiTest.afterAll(async ({ kbnClient }) => {
    await kbnClient.savedObjects.clean({ types: ['search'] });
  });

  apiTest('returns an existing Discover session', async ({ apiClient }) => {
    const response = await apiClient.get(
      `${DISCOVER_SESSION_API_BASE_PATH}/${TEST_DISCOVER_SESSION_ID}`,
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
      id: TEST_DISCOVER_SESSION_ID,
      data: {
        title: 'ESQL control unlink test',
        description: '',
        tabs: [
          expect.objectContaining({
            id: 'bdf27597-150b-445e-90ca-ce1b52b0b5af',
            label: 'Untitled',
            hide_chart: false,
            hide_table: false,
            time_restore: false,
            data_source: {
              type: 'esql',
              query: 'FROM logstash-* | WHERE geo.dest == ?geo_dest',
            },
            control_panels: [
              expect.objectContaining({
                id: '0f3d53c8-d694-4ccf-81e5-66d97aee259f',
                type: 'esql_control',
                width: 'medium',
                grow: false,
                config: expect.objectContaining({
                  control_type: 'VALUES_FROM_QUERY',
                  variable_name: 'geo_dest',
                  selected_options: ['AE'],
                }),
              }),
            ],
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
    expect(response.body.message).toBe(
      'A Discover session with ID [does-not-exist] was not found.'
    );
  });

  apiTest('returns 403 when the user cannot read Discover sessions', async ({ apiClient }) => {
    const response = await apiClient.get(
      `${DISCOVER_SESSION_API_BASE_PATH}/${TEST_DISCOVER_SESSION_ID}`,
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

  apiTest(
    'returns 500 when the stored Discover session fails response validation',
    async ({ apiClient, kbnClient }) => {
      const { attributes, references } =
        await kbnClient.savedObjects.get<DiscoverSessionAttributes>({
          type: 'search',
          id: TEST_DISCOVER_SESSION_ID,
        });
      const [firstTab, ...otherTabs] = attributes.tabs;
      const controlGroup = JSON.parse(firstTab.attributes.controlGroupJson!);
      const controlId = Object.keys(controlGroup)[0];

      controlGroup[controlId].width = 'extra_large';

      await kbnClient.savedObjects.create({
        type: 'search',
        id: INVALID_DISCOVER_SESSION_ID,
        overwrite: true,
        attributes: {
          ...attributes,
          tabs: [
            {
              ...firstTab,
              attributes: {
                ...firstTab.attributes,
                controlGroupJson: JSON.stringify(controlGroup),
              },
            },
            ...otherTabs,
          ],
        },
        references,
      });

      const response = await apiClient.get(
        `${DISCOVER_SESSION_API_BASE_PATH}/${INVALID_DISCOVER_SESSION_ID}`,
        {
          headers: {
            ...COMMON_HEADERS,
            ...viewerCredentials.apiKeyHeader,
          },
          responseType: 'json',
        }
      );

      expect(response).toHaveStatusCode(500);
    }
  );
});
