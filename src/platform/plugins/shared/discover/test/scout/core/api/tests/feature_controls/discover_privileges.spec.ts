/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { apiTest, tags, type ApiClientFixture, type RoleApiCredentials } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { BASE_HEADERS } from '../../fixtures/constants';
import {
  DISCOVER_ALL_ROLE,
  DISCOVER_READ_ROLE,
  DISCOVER_READ_URL_CREATE_ROLE,
  DISCOVER_VISUALIZE_READ_ROLE,
  NO_DISCOVER_ROLE,
  type DiscoverCapabilitiesResponse,
} from '../../fixtures/feature_controls/constants';

apiTest.describe(
  'POST /api/core/capabilities - Discover role privileges',
  { tag: tags.stateful.classic },
  () => {
    let allCredentials: RoleApiCredentials;
    let readCredentials: RoleApiCredentials;
    let readUrlCreateCredentials: RoleApiCredentials;
    let visualizeReadCredentials: RoleApiCredentials;
    let noDiscoverCredentials: RoleApiCredentials;

    apiTest.beforeAll(async ({ requestAuth }) => {
      allCredentials = await requestAuth.getApiKeyForCustomRole(DISCOVER_ALL_ROLE);
      readCredentials = await requestAuth.getApiKeyForCustomRole(DISCOVER_READ_ROLE);
      readUrlCreateCredentials = await requestAuth.getApiKeyForCustomRole(
        DISCOVER_READ_URL_CREATE_ROLE
      );
      visualizeReadCredentials = await requestAuth.getApiKeyForCustomRole(
        DISCOVER_VISUALIZE_READ_ROLE
      );
      noDiscoverCredentials = await requestAuth.getApiKeyForCustomRole(NO_DISCOVER_ROLE);
    });

    const getCapabilities = (apiClient: ApiClientFixture, credentials: RoleApiCredentials) =>
      apiClient.post('/api/core/capabilities', {
        headers: { ...BASE_HEADERS, ...credentials.apiKeyHeader },
        body: { applications: ['discover', 'kibana'] },
        responseType: 'json',
      });

    apiTest(
      'discover:all grants save, short URLs and the CSV export capability',
      async ({ apiClient }) => {
        const response = await getCapabilities(apiClient, allCredentials);

        expect(response).toHaveStatusCode(200);
        const body = response.body as DiscoverCapabilitiesResponse;
        expect(body.navLinks.discover).toBe(true);
        expect(body.discover_v2.show).toBe(true);
        expect(body.discover_v2.save).toBe(true);
        expect(body.discover_v2.createShortUrl).toBe(true);
        expect(body.discover_v2.generateCsv).toBe(true);
      }
    );

    apiTest(
      'discover:read hides save, short URLs and the visualize field action',
      async ({ apiClient }) => {
        const response = await getCapabilities(apiClient, readCredentials);

        expect(response).toHaveStatusCode(200);
        const body = response.body as DiscoverCapabilitiesResponse;
        expect(body.navLinks.discover).toBe(true);
        expect(body.discover_v2.show).toBe(true);
        expect(body.discover_v2.save).toBe(false);
        expect(body.discover_v2.createShortUrl).toBe(false);
        expect(body.visualize_v2.show).toBe(false);
      }
    );

    apiTest(
      'discover:read + url_create still hides save but allows short URLs',
      async ({ apiClient }) => {
        const response = await getCapabilities(apiClient, readUrlCreateCredentials);

        expect(response).toHaveStatusCode(200);
        const body = response.body as DiscoverCapabilitiesResponse;
        expect(body.navLinks.discover).toBe(true);
        expect(body.discover_v2.show).toBe(true);
        expect(body.discover_v2.save).toBe(false);
        expect(body.discover_v2.createShortUrl).toBe(true);
      }
    );

    apiTest(
      'discover:read + visualize:read shows the visualize field action',
      async ({ apiClient }) => {
        const response = await getCapabilities(apiClient, visualizeReadCredentials);

        expect(response).toHaveStatusCode(200);
        const body = response.body as DiscoverCapabilitiesResponse;
        expect(body.visualize_v2.show).toBe(true);
      }
    );

    apiTest(
      'no discover privileges hides the navlink and zeroes discover capabilities',
      async ({ apiClient }) => {
        const response = await getCapabilities(apiClient, noDiscoverCredentials);

        expect(response).toHaveStatusCode(200);
        const body = response.body as DiscoverCapabilitiesResponse;
        expect(body.navLinks.discover).toBe(false);
        expect(body.discover_v2.show).toBe(false);
        expect(body.discover_v2.save).toBe(false);
      }
    );
  }
);
