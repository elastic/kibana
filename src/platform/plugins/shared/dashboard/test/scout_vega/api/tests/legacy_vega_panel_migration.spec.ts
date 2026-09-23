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

import { DASHBOARD_APP_API_PATH } from '../../../../common/constants';
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
const DASHBOARD_APP_API_VERSION = '1';

apiTest.describe(
  'dashboards - legacy Vega panel migration',
  { tag: '@local-stateful-classic' },
  () => {
    let viewerCredentials: RoleApiCredentials;
    let viewerCookieHeader: Record<string, string>;

    apiTest.beforeAll(async ({ kbnClient, requestAuth, samlAuth }) => {
      viewerCredentials = await requestAuth.getApiKey('viewer');
      viewerCookieHeader = (await samlAuth.asInteractiveUser('viewer')).cookieHeader;
      await kbnClient.importExport.load(KBN_ARCHIVES.LEGACY_VEGA_PANEL_MIGRATION);
      await kbnClient.importExport.load(KBN_ARCHIVES.LEGACY_VEGA_BY_VALUE_PANEL_MIGRATION);
    });

    apiTest.afterAll(async ({ apiServices, kbnClient }) => {
      await apiServices.core.settings({
        'feature_flags.overrides': {
          [LEGACY_VEGA_MIGRATION_FLAG]: null,
        },
      });
      await kbnClient.savedObjects.cleanStandardList();
    });

    apiTest(
      'public read migrates a by-value legacy Vega panel when the flag is enabled',
      async ({ apiClient, apiServices, kbnClient }) => {
        await apiServices.core.settings({
          'feature_flags.overrides': {
            [LEGACY_VEGA_MIGRATION_FLAG]: true,
          },
        });

        const response = await apiClient.get(
          `${DASHBOARD_API_PATH}/${LEGACY_VEGA_BY_VALUE_DASHBOARD_ID}`,
          {
            headers: {
              ...COMMON_HEADERS,
              ...viewerCredentials.apiKeyHeader,
            },
            responseType: 'json',
          }
        );

        expect(response).toHaveStatusCode(200);
        expect(response.body.warnings).toBeUndefined();
        expect(response.body.data.panels).toHaveLength(1);
        expect(response.body.data.panels[0]).toMatchObject({
          type: 'vega',
          config: {
            spec: {
              format: 'json',
              value: {
                $schema: 'https://vega.github.io/schema/vega/v5.json',
                data: [],
                marks: [],
              },
            },
          },
        });

        const stored = await kbnClient.savedObjects.get<{ panelsJSON?: string }>({
          type: 'dashboard',
          id: LEGACY_VEGA_BY_VALUE_DASHBOARD_ID,
        });
        const storedPanels = JSON.parse(stored.attributes.panelsJSON ?? '[]');
        expect(storedPanels[0]).toMatchObject({
          type: 'visualization',
          embeddableConfig: {
            savedVis: { type: 'vega' },
          },
        });
      }
    );

    apiTest(
      'internal app read keeps legacy_vis when the flag is disabled',
      async ({ apiClient, apiServices }) => {
        await apiServices.core.settings({
          'feature_flags.overrides': {
            [LEGACY_VEGA_MIGRATION_FLAG]: false,
          },
        });

        const response = await apiClient.get(
          `${DASHBOARD_APP_API_PATH}/${LEGACY_VEGA_BY_VALUE_DASHBOARD_ID}`,
          {
            headers: {
              ...COMMON_HEADERS,
              'elastic-api-version': DASHBOARD_APP_API_VERSION,
              ...viewerCookieHeader,
            },
            responseType: 'json',
          }
        );

        expect(response).toHaveStatusCode(200);
        expect(response.body.data.panels).toHaveLength(1);
        expect(response.body.data.panels[0]).toMatchObject({
          type: 'legacy_vis',
          config: {
            savedVis: { type: 'vega' },
          },
        });
      }
    );

    apiTest(
      'internal app read keeps by-reference legacy Vega panels as legacy_vis when the flag is enabled',
      async ({ apiClient, apiServices }) => {
        await apiServices.core.settings({
          'feature_flags.overrides': {
            [LEGACY_VEGA_MIGRATION_FLAG]: true,
          },
        });

        const response = await apiClient.get(
          `${DASHBOARD_APP_API_PATH}/${LEGACY_VEGA_DASHBOARD_ID}`,
          {
            headers: {
              ...COMMON_HEADERS,
              'elastic-api-version': DASHBOARD_APP_API_VERSION,
              ...viewerCookieHeader,
            },
            responseType: 'json',
          }
        );

        expect(response).toHaveStatusCode(200);
        expect(response.body.data.panels).toHaveLength(1);
        expect(response.body.data.panels[0]).toMatchObject({
          type: 'legacy_vis',
          config: {
            savedObjectId: LEGACY_VEGA_VISUALIZATION_ID,
          },
        });
      }
    );

    apiTest(
      'internal app read gives a visualization reference precedence over inline state',
      async ({ apiClient, apiServices }) => {
        await apiServices.core.settings({
          'feature_flags.overrides': {
            [LEGACY_VEGA_MIGRATION_FLAG]: true,
          },
        });

        const response = await apiClient.get(
          `${DASHBOARD_APP_API_PATH}/${LEGACY_VEGA_HYBRID_DASHBOARD_ID}`,
          {
            headers: {
              ...COMMON_HEADERS,
              'elastic-api-version': DASHBOARD_APP_API_VERSION,
              ...viewerCookieHeader,
            },
            responseType: 'json',
          }
        );

        expect(response).toHaveStatusCode(200);
        expect(response.body.data.panels).toHaveLength(1);
        expect(response.body.data.panels[0]).toMatchObject({
          type: 'legacy_vis',
          config: {
            savedObjectId: LEGACY_VEGA_VISUALIZATION_ID,
          },
        });
      }
    );
  }
);
