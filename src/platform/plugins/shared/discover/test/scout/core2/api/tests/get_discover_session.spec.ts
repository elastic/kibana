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
  const createdLegacyAliasIds: string[] = [];

  apiTest.beforeAll(async ({ kbnClient, requestAuth }) => {
    viewerCredentials = await requestAuth.getApiKeyForViewer();
    devToolsReaderCredentials = await requestAuth.getApiKeyForCustomRole(DEV_TOOLS_READ_ROLE);
    await kbnClient.importExport.load(KBN_ARCHIVES.SESSION_WITH_CONTROL);
  });

  apiTest.afterAll(async ({ kbnClient }) => {
    if (createdLegacyAliasIds.length > 0) {
      await kbnClient.savedObjects.bulkDelete({
        objects: createdLegacyAliasIds.map((id) => ({ type: 'legacy-url-alias', id })),
      });
    }
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
        tags: [],
        tabs: [
          expect.objectContaining({
            id: 'bdf27597-150b-445e-90ca-ce1b52b0b5af',
            label: 'Untitled',
            hide_chart: false,
            hide_table: false,
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

  apiTest(
    'returns the session and resolution headers when an ID is in conflict',
    async ({ apiClient, kbnClient }) => {
      const suffix = Date.now();
      const conflictingId = `discover-session-conflict-${suffix}`;
      const aliasTargetId = `discover-session-alias-target-${suffix}`;
      const legacyAliasId = `default:search:${conflictingId}`;
      const { attributes, references } =
        await kbnClient.savedObjects.get<DiscoverSessionAttributes>({
          type: 'search',
          id: TEST_DISCOVER_SESSION_ID,
        });

      await kbnClient.savedObjects.create({
        type: 'search',
        id: conflictingId,
        overwrite: true,
        attributes,
        references,
      });
      await kbnClient.savedObjects.create({
        type: 'search',
        id: aliasTargetId,
        overwrite: true,
        attributes,
        references,
      });
      await kbnClient.savedObjects.create({
        type: 'legacy-url-alias',
        id: legacyAliasId,
        overwrite: true,
        attributes: {
          targetType: 'search',
          targetId: aliasTargetId,
          targetNamespace: 'default',
          sourceId: conflictingId,
          purpose: 'savedObjectConversion',
        },
        references: [],
        migrationVersion: { 'legacy-url-alias': '8.2.0' },
      });
      createdLegacyAliasIds.push(legacyAliasId);

      const response = await apiClient.get(`${DISCOVER_SESSION_API_BASE_PATH}/${conflictingId}`, {
        headers: {
          ...COMMON_HEADERS,
          ...viewerCredentials.apiKeyHeader,
        },
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(200);
      expect(response).toHaveHeaders({
        'kbn-resolve-outcome': 'conflict',
        'kbn-resolve-alias-target-id': aliasTargetId,
        'kbn-resolve-purpose': 'savedObjectConversion',
      });
      expect(response.body).toMatchObject({
        id: conflictingId,
        data: { title: attributes.title },
      });
    }
  );

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
    'returns warnings and preserves valid controls when a stored control is invalid',
    async ({ apiClient, kbnClient }) => {
      const { attributes, references } =
        await kbnClient.savedObjects.get<DiscoverSessionAttributes>({
          type: 'search',
          id: TEST_DISCOVER_SESSION_ID,
        });
      const [firstTab, ...otherTabs] = attributes.tabs;
      const controlGroup = JSON.parse(firstTab.attributes.controlGroupJson!);
      const controlId = Object.keys(controlGroup)[0];
      const validControlId = 'valid-control';

      controlGroup[validControlId] = { ...controlGroup[controlId], order: 1 };
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

      expect(response).toHaveStatusCode(200);
      expect(response.body.data.tabs[0].control_panels).toStrictEqual([
        expect.objectContaining({ id: validControlId }),
      ]);
      expect(response.body.warnings).toStrictEqual([
        expect.objectContaining({
          type: 'dropped_panel',
          tab_id: firstTab.id,
          panel_id: controlId,
        }),
      ]);
    }
  );
});
