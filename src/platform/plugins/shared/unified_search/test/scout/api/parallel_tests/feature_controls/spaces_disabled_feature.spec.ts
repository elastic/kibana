/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { KibanaRole, RoleApiCredentials } from '@kbn/scout';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { apiTest, testData } from '../../fixtures';

/**
 * Validates that `savedQueryManagement` is an independent feature in the
 * features registry: disabling any of the consuming app features (v1 or v2)
 * in a space must not cascade into disabling savedQueryManagement. The
 * original FTR drove this through the Spaces management UI; here we assert
 * the behavior directly via `/s/{space}/api/core/capabilities`.
 */
const ALL_APP_FEATURES = [...testData.V1_FEATURES, ...testData.V2_FEATURES];

const SAVED_QUERY_ALL_ROLE: KibanaRole = {
  elasticsearch: { cluster: [] },
  kibana: [{ base: [], spaces: ['*'], feature: { savedQueryManagement: ['all'] } }],
};

apiTest.describe(
  'Saved query management - spaces feature visibility',
  { tag: tags.stateful.classic },
  () => {
    let sqmAllCredentials: RoleApiCredentials;

    apiTest.beforeAll(async ({ requestAuth }) => {
      sqmAllCredentials = await requestAuth.getApiKeyForCustomRole(SAVED_QUERY_ALL_ROLE);
    });

    for (const featureToDisable of ALL_APP_FEATURES) {
      apiTest(
        `disabling ${featureToDisable} in a space does not disable savedQueryManagement`,
        async ({ apiServices, apiClient }) => {
          const spaceId = `sqm-${featureToDisable.replace(/_/g, '-')}-${Date.now()}`;
          await apiServices.spaces.create({
            id: spaceId,
            name: spaceId,
            disabledFeatures: [featureToDisable],
          });

          try {
            const response = await apiClient.post(`s/${spaceId}/api/core/capabilities`, {
              headers: { ...testData.COMMON_HEADERS, ...sqmAllCredentials.apiKeyHeader },
              responseType: 'json',
              body: { applications: [] },
            });

            expect(response).toHaveStatusCode(200);
            const caps = response.body as testData.CapabilitiesResponse;
            expect(caps.savedQueryManagement.showQueries).toBe(true);
            expect(caps.savedQueryManagement.saveQuery).toBe(true);
          } finally {
            await apiServices.spaces.delete(spaceId);
          }
        }
      );
    }
  }
);
