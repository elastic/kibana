/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { apiTest, tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { BASE_HEADERS } from '../../fixtures/constants';
import { type DiscoverCapabilitiesResponse } from '../../fixtures/feature_controls/constants';

apiTest.describe(
  'POST /s/<space>/api/core/capabilities - Discover space feature controls',
  { tag: tags.stateful.classic },
  () => {
    let spaceId: string | undefined;

    apiTest.afterEach(async ({ apiServices }) => {
      if (spaceId) {
        await apiServices.spaces.delete(spaceId);
        spaceId = undefined;
      }
    });

    apiTest(
      'space with no features disabled exposes discover and visualize capabilities',
      async ({ apiClient, apiServices, requestAuth }, testInfo) => {
        spaceId = `discover-space-enabled-${testInfo.parallelIndex}-${Date.now()}`;
        await apiServices.spaces.create({ id: spaceId, name: spaceId, disabledFeatures: [] });

        const adminCredentials = await requestAuth.getApiKeyForAdmin();
        const response = await apiClient.post(`/s/${spaceId}/api/core/capabilities`, {
          headers: { ...BASE_HEADERS, ...adminCredentials.apiKeyHeader },
          body: { applications: ['discover', 'kibana'] },
          responseType: 'json',
        });

        expect(response).toHaveStatusCode(200);
        const body = response.body as DiscoverCapabilitiesResponse;
        expect(body.navLinks.discover).toBe(true);
        expect(body.discover_v2.show).toBe(true);
        expect(body.discover_v2.save).toBe(true);
        expect(body.visualize_v2.show).toBe(true);
      }
    );

    apiTest(
      'space with Discover disabled hides the discover navlink and zeroes discover capabilities',
      async ({ apiClient, apiServices, requestAuth }, testInfo) => {
        spaceId = `discover-space-disabled-${testInfo.parallelIndex}-${Date.now()}`;
        await apiServices.spaces.create({
          id: spaceId,
          name: spaceId,
          disabledFeatures: ['discover'],
        });

        const adminCredentials = await requestAuth.getApiKeyForAdmin();
        const response = await apiClient.post(`/s/${spaceId}/api/core/capabilities`, {
          headers: { ...BASE_HEADERS, ...adminCredentials.apiKeyHeader },
          body: { applications: ['discover', 'kibana'] },
          responseType: 'json',
        });

        expect(response).toHaveStatusCode(200);
        const body = response.body as DiscoverCapabilitiesResponse;
        expect(body.navLinks.discover).toBe(false);
        expect(body.discover_v2.show).toBe(false);
        expect(body.discover_v2.save).toBe(false);
      }
    );

    apiTest(
      'space with Visualize disabled hides the visualize field action capability',
      async ({ apiClient, apiServices, requestAuth }, testInfo) => {
        spaceId = `discover-space-visualize-disabled-${testInfo.parallelIndex}-${Date.now()}`;
        await apiServices.spaces.create({
          id: spaceId,
          name: spaceId,
          disabledFeatures: ['visualize'],
        });

        const adminCredentials = await requestAuth.getApiKeyForAdmin();
        const response = await apiClient.post(`/s/${spaceId}/api/core/capabilities`, {
          headers: { ...BASE_HEADERS, ...adminCredentials.apiKeyHeader },
          body: { applications: ['discover', 'kibana'] },
          responseType: 'json',
        });

        expect(response).toHaveStatusCode(200);
        const body = response.body as DiscoverCapabilitiesResponse;
        // Discover itself stays enabled; only the visualize field action goes away.
        expect(body.discover_v2.show).toBe(true);
        expect(body.visualize_v2.show).toBe(false);
      }
    );
  }
);
