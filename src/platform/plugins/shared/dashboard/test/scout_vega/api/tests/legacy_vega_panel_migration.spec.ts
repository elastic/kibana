/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ApiServicesFixture, RoleApiCredentials } from '@kbn/scout';
import { expect } from '@kbn/scout/api';

import { DASHBOARD_APP_API_PATH, DASHBOARD_APP_API_VERSION } from '../../../../common/constants';
import {
  apiTest,
  COMMON_HEADERS,
  DASHBOARD_API_PATH,
  KBN_ARCHIVES,
  LEGACY_VEGA_DASHBOARD_ID,
  LEGACY_VEGA_BY_VALUE_DASHBOARD_ID,
  LEGACY_VEGA_HYBRID_DASHBOARD_ID,
  LEGACY_VEGA_VISUALIZATION_ID,
} from '../fixtures';

const LEGACY_VEGA_MIGRATION_FLAG = 'dashboard.legacyVegaPanelMigration';

const MIGRATED_PANELS = [
  {
    type: 'vega',
    config: {
      title: 'Legacy Vega by-value',
      spec: {
        format: 'json',
        value: {
          $schema: 'https://vega.github.io/schema/vega/v5.json',
          data: [],
          marks: [],
        },
      },
    },
  },
  {
    type: 'vega',
    config: {
      title: 'Filtered Vega panel',
      query: { expression: 'status:200', language: 'lucene' },
      filters: [{ data_view_id: 'logs-data-view' }],
      spec: {
        format: 'hjson',
        value: [
          '{',
          '  // Comments are allowed in HJSON',
          '  $schema: https://vega.github.io/schema/vega/v5.json',
          '  data: []',
          '  marks: []',
          '}',
        ].join('\n'),
      },
    },
  },
];

apiTest.describe(
  'dashboards - legacy Vega panel migration',
  { tag: '@local-stateful-classic' },
  () => {
    let viewerCredentials: RoleApiCredentials;

    let appHeaders: Record<string, string>;

    const setMigrationFlag = async (apiServices: ApiServicesFixture, enabled: boolean) => {
      await apiServices.core.settings({
        'feature_flags.overrides': { [LEGACY_VEGA_MIGRATION_FLAG]: enabled },
      });
    };

    apiTest.beforeAll(async ({ kbnClient, requestAuth, samlAuth }) => {
      viewerCredentials = await requestAuth.getApiKey('viewer');
      appHeaders = {
        ...COMMON_HEADERS,
        'elastic-api-version': DASHBOARD_APP_API_VERSION,
        ...(await samlAuth.asInteractiveUser('viewer')).cookieHeader,
      };
      await kbnClient.importExport.load(KBN_ARCHIVES.LEGACY_VEGA_PANEL_MIGRATION);
      await kbnClient.importExport.load(KBN_ARCHIVES.LEGACY_VEGA_BY_VALUE_PANEL_MIGRATION);
    });

    apiTest.afterAll(async ({ apiServices, kbnClient }) => {
      await apiServices.core.settings({
        'feature_flags.overrides': { [LEGACY_VEGA_MIGRATION_FLAG]: null },
      });
      await kbnClient.savedObjects.cleanStandardList();
    });

    apiTest(
      'public read migrates by-value legacy Vega panels, including query and filters, when the flag is enabled',
      async ({ apiClient, apiServices, kbnClient }) => {
        await setMigrationFlag(apiServices, true);

        const response = await apiClient.get(
          `${DASHBOARD_API_PATH}/${LEGACY_VEGA_BY_VALUE_DASHBOARD_ID}`,
          {
            headers: { ...COMMON_HEADERS, ...viewerCredentials.apiKeyHeader },
            responseType: 'json',
          }
        );

        expect(response).toHaveStatusCode(200);
        expect(response.body.warnings).toBeUndefined();
        expect(response.body.data.panels).toMatchObject(MIGRATED_PANELS);

        const stored = await kbnClient.savedObjects.get<{ panelsJSON?: string }>({
          type: 'dashboard',
          id: LEGACY_VEGA_BY_VALUE_DASHBOARD_ID,
        });
        expect(JSON.parse(stored.attributes.panelsJSON ?? '[]')).toMatchObject([
          { type: 'visualization', embeddableConfig: { savedVis: { type: 'vega' } } },
          { type: 'visualization', embeddableConfig: { savedVis: { type: 'vega' } } },
        ]);
      }
    );

    apiTest(
      'public read drops legacy Vega panels when the flag is disabled',
      async ({ apiClient, apiServices }) => {
        await setMigrationFlag(apiServices, false);

        const response = await apiClient.get(
          `${DASHBOARD_API_PATH}/${LEGACY_VEGA_BY_VALUE_DASHBOARD_ID}`,
          {
            headers: { ...COMMON_HEADERS, ...viewerCredentials.apiKeyHeader },
            responseType: 'json',
          }
        );

        expect(response).toHaveStatusCode(200);
        expect(response.body.data.panels).toHaveLength(0);
        expect(response.body.warnings).toMatchObject([
          { type: 'dropped_panel', panel_type: 'legacy_vis' },
          { type: 'dropped_panel', panel_type: 'legacy_vis' },
        ]);
      }
    );

    apiTest(
      'internal app read migrates by-value legacy Vega panels when the flag is enabled',
      async ({ apiClient, apiServices }) => {
        await setMigrationFlag(apiServices, true);

        const response = await apiClient.get(
          `${DASHBOARD_APP_API_PATH}/${LEGACY_VEGA_BY_VALUE_DASHBOARD_ID}`,
          {
            headers: appHeaders,
            responseType: 'json',
          }
        );

        expect(response).toHaveStatusCode(200);
        expect(response.body.data.panels).toMatchObject(MIGRATED_PANELS);
      }
    );

    apiTest(
      'internal app read keeps legacy_vis when the flag is disabled',
      async ({ apiClient, apiServices }) => {
        await setMigrationFlag(apiServices, false);

        const response = await apiClient.get(
          `${DASHBOARD_APP_API_PATH}/${LEGACY_VEGA_BY_VALUE_DASHBOARD_ID}`,
          {
            headers: appHeaders,
            responseType: 'json',
          }
        );

        expect(response).toHaveStatusCode(200);
        expect(response.body.data.panels).toMatchObject([
          { type: 'legacy_vis', config: { savedVis: { type: 'vega' } } },
          { type: 'legacy_vis', config: { savedVis: { type: 'vega' } } },
        ]);
      }
    );

    apiTest(
      'by-reference legacy Vega panels are not migrated when the flag is enabled',
      async ({ apiClient, apiServices }) => {
        await setMigrationFlag(apiServices, true);

        const publicResponse = await apiClient.get(
          `${DASHBOARD_API_PATH}/${LEGACY_VEGA_DASHBOARD_ID}`,
          {
            headers: { ...COMMON_HEADERS, ...viewerCredentials.apiKeyHeader },
            responseType: 'json',
          }
        );
        expect(publicResponse).toHaveStatusCode(200);
        expect(publicResponse.body.data.panels).toHaveLength(0);
        expect(publicResponse.body.warnings).toMatchObject([
          { type: 'dropped_panel', panel_type: 'legacy_vis' },
        ]);

        const appResponse = await apiClient.get(
          `${DASHBOARD_APP_API_PATH}/${LEGACY_VEGA_DASHBOARD_ID}`,
          {
            headers: appHeaders,
            responseType: 'json',
          }
        );
        expect(appResponse).toHaveStatusCode(200);
        expect(appResponse.body.data.panels).toMatchObject([
          { type: 'legacy_vis', config: { savedObjectId: LEGACY_VEGA_VISUALIZATION_ID } },
        ]);
      }
    );

    apiTest(
      'internal app read gives a visualization reference precedence over inline state',
      async ({ apiClient, apiServices }) => {
        await setMigrationFlag(apiServices, true);

        const response = await apiClient.get(
          `${DASHBOARD_APP_API_PATH}/${LEGACY_VEGA_HYBRID_DASHBOARD_ID}`,
          {
            headers: appHeaders,
            responseType: 'json',
          }
        );

        expect(response).toHaveStatusCode(200);
        expect(response.body.data.panels).toMatchObject([
          { type: 'legacy_vis', config: { savedObjectId: LEGACY_VEGA_VISUALIZATION_ID } },
        ]);
      }
    );
  }
);
