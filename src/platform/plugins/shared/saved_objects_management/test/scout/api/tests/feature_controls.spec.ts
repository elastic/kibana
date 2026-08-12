/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// SOM feature_controls API contract: capabilities + `_find` per role.

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { apiTest, testData, CUSTOM_ROLES } from '../fixtures';

const { KBN_ARCHIVES, MANAGEMENT_API, COMMON_HEADERS, FEATURE_CONTROLS_ARCHIVE_TITLES } = testData;
const CAPABILITIES_API_PATH = 'api/core/capabilities';
const SOM_TYPES = ['index-pattern', 'visualization', 'dashboard'] as const;

// The management `_find` endpoint strips `attributes` and exposes title via
// `meta.title` (populated by `injectMetaAttributes`).
interface SavedObjectFindEntry {
  id: string;
  type: string;
  attributes: Record<string, unknown>;
  meta: { title?: string; inAppUrl?: { path: string; uiCapabilitiesPath: string } };
}

interface CapabilitiesResponse {
  navLinks: Record<string, boolean>;
  catalogue: Record<string, boolean>;
  management: { kibana: { objects: boolean } };
  savedObjectsManagement: { delete: boolean };
}

apiTest.describe(
  'Saved objects management feature controls',
  { tag: tags.stateful.classic },
  () => {
    apiTest.beforeAll(async ({ kbnClient }) => {
      await kbnClient.savedObjects.cleanStandardList();
      await kbnClient.importExport.load(KBN_ARCHIVES.FEATURE_CONTROLS_SECURITY);
    });

    apiTest.afterAll(async ({ kbnClient }) => {
      await kbnClient.importExport.unload(KBN_ARCHIVES.FEATURE_CONTROLS_SECURITY);
      await kbnClient.savedObjects.cleanStandardList();
    });

    apiTest(
      'global:all sees every archive saved object with inAppUrl populated',
      async ({ apiClient, requestAuth }) => {
        const { apiKeyHeader } = await requestAuth.getApiKeyForCustomRole(CUSTOM_ROLES.global_all);
        const typeQuery = SOM_TYPES.map((t) => `type=${t}`).join('&');
        const response = await apiClient.get(`${MANAGEMENT_API.FIND}?${typeQuery}&perPage=100`, {
          headers: { ...COMMON_HEADERS, ...apiKeyHeader },
          responseType: 'json',
        });

        expect(response).toHaveStatusCode(200);
        const titles = (response.body.saved_objects as SavedObjectFindEntry[])
          .map((so) => so.meta.title)
          .sort();
        expect(titles).toStrictEqual([...FEATURE_CONTROLS_ARCHIVE_TITLES].sort());

        // global:all owns every feature, so every saved object is "viewable in app".
        const allHaveInAppUrl = (response.body.saved_objects as SavedObjectFindEntry[]).every(
          (so) => so.meta.inAppUrl !== undefined
        );
        expect(allHaveInAppUrl).toBe(true);
      }
    );

    apiTest(
      'savedObjectsManagement:read sees the same list',
      async ({ apiClient, requestAuth }) => {
        const { apiKeyHeader } = await requestAuth.getApiKeyForCustomRole(
          CUSTOM_ROLES.global_som_read
        );
        const typeQuery = SOM_TYPES.map((t) => `type=${t}`).join('&');
        const response = await apiClient.get(`${MANAGEMENT_API.FIND}?${typeQuery}&perPage=100`, {
          headers: { ...COMMON_HEADERS, ...apiKeyHeader },
          responseType: 'json',
        });

        expect(response).toHaveStatusCode(200);
        const titles = (response.body.saved_objects as SavedObjectFindEntry[])
          .map((so) => so.meta.title)
          .sort();
        expect(titles).toStrictEqual([...FEATURE_CONTROLS_ARCHIVE_TITLES].sort());
      }
    );

    apiTest(
      'global:all capabilities allow management.kibana.objects',
      async ({ apiClient, requestAuth }) => {
        const { apiKeyHeader } = await requestAuth.getApiKeyForCustomRole(CUSTOM_ROLES.global_all);
        const response = await apiClient.post(CAPABILITIES_API_PATH, {
          headers: { ...COMMON_HEADERS, ...apiKeyHeader },
          responseType: 'json',
          body: { applications: [] },
        });

        expect(response).toHaveStatusCode(200);
        const caps = response.body as CapabilitiesResponse;
        expect(caps.management.kibana.objects).toBe(true);
        expect(caps.savedObjectsManagement.delete).toBe(true);
      }
    );

    apiTest(
      'savedObjectsManagement:read capabilities allow listing but not delete',
      async ({ apiClient, requestAuth }) => {
        const { apiKeyHeader } = await requestAuth.getApiKeyForCustomRole(
          CUSTOM_ROLES.global_som_read
        );
        const response = await apiClient.post(CAPABILITIES_API_PATH, {
          headers: { ...COMMON_HEADERS, ...apiKeyHeader },
          responseType: 'json',
          body: { applications: [] },
        });

        expect(response).toHaveStatusCode(200);
        const caps = response.body as CapabilitiesResponse;
        expect(caps.management.kibana.objects).toBe(true);
        expect(caps.savedObjectsManagement.delete).toBe(false);
      }
    );

    apiTest(
      'visualize:minimal_all alone has NO management.kibana.objects access',
      async ({ apiClient, requestAuth }) => {
        const { apiKeyHeader } = await requestAuth.getApiKeyForCustomRole(
          CUSTOM_ROLES.global_visualize_all
        );
        const response = await apiClient.post(CAPABILITIES_API_PATH, {
          headers: { ...COMMON_HEADERS, ...apiKeyHeader },
          responseType: 'json',
          body: { applications: [] },
        });

        expect(response).toHaveStatusCode(200);
        const caps = response.body as CapabilitiesResponse;
        expect(caps.management.kibana.objects ?? false).toBe(false);
        expect(caps.savedObjectsManagement.delete ?? false).toBe(false);
      }
    );
  }
);
