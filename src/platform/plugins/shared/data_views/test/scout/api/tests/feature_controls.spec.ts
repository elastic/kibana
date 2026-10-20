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
import {
  API_CUSTOM_SPACE,
  API_CUSTOM_SPACE_INDEX_PATTERNS_DISABLED,
  CAPABILITIES_API_PATH,
  COMMON_HEADERS,
  INDEX_PATTERNS_ALL_ROLE,
  INDEX_PATTERNS_READ_ROLE,
  NO_INDEX_PATTERNS_ROLE,
} from '../fixtures/constants';

const getCapabilitiesApiPath = (spaceId?: string) =>
  spaceId ? `/s/${spaceId}${CAPABILITIES_API_PATH}` : CAPABILITIES_API_PATH;

apiTest.describe('Data Views feature controls', { tag: tags.stateful.classic }, () => {
  apiTest.afterAll(async ({ apiServices }) => {
    await apiServices.spaces.delete(API_CUSTOM_SPACE.id).catch(() => {});
    await apiServices.spaces.delete(API_CUSTOM_SPACE_INDEX_PATTERNS_DISABLED.id).catch(() => {});
  });

  apiTest(
    'indexPatterns all privileges expose save and management capabilities',
    async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser(INDEX_PATTERNS_ALL_ROLE);
      const response = await apiClient.post(CAPABILITIES_API_PATH, {
        headers: { ...COMMON_HEADERS, ...cookieHeader },
        body: { applications: [] },
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body.indexPatterns.save).toBe(true);
      expect(response.body.management.kibana.indexPatterns).toBe(true);
    }
  );

  apiTest(
    'indexPatterns read privileges expose management without save',
    async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser(INDEX_PATTERNS_READ_ROLE);
      const response = await apiClient.post(CAPABILITIES_API_PATH, {
        headers: { ...COMMON_HEADERS, ...cookieHeader },
        body: { applications: [] },
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body.indexPatterns.save).toBe(false);
      expect(response.body.management.kibana.indexPatterns).toBe(true);
    }
  );

  apiTest(
    'users without indexPatterns privileges cannot access data view management',
    async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser(NO_INDEX_PATTERNS_ROLE);
      const response = await apiClient.post(CAPABILITIES_API_PATH, {
        headers: { ...COMMON_HEADERS, ...cookieHeader },
        body: { applications: [] },
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body.indexPatterns.save).toBe(false);
      expect(response.body.management.kibana.indexPatterns).toBe(false);
    }
  );

  apiTest(
    'space with Data Views enabled exposes indexPatterns management capabilities',
    async ({ apiClient, apiServices, samlAuth }) => {
      await apiServices.spaces.delete(API_CUSTOM_SPACE.id).catch(() => {});
      await apiServices.spaces.create(API_CUSTOM_SPACE);
      const { cookieHeader } = await samlAuth.asInteractiveUser(INDEX_PATTERNS_ALL_ROLE);
      const response = await apiClient.post(getCapabilitiesApiPath(API_CUSTOM_SPACE.id), {
        headers: { ...COMMON_HEADERS, ...cookieHeader },
        body: { applications: [] },
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body.management.kibana.indexPatterns).toBe(true);
    }
  );

  apiTest(
    'space with Data Views disabled hides indexPatterns management capabilities',
    async ({ apiClient, apiServices, samlAuth }) => {
      await apiServices.spaces.delete(API_CUSTOM_SPACE_INDEX_PATTERNS_DISABLED.id).catch(() => {});
      await apiServices.spaces.create(API_CUSTOM_SPACE_INDEX_PATTERNS_DISABLED);
      const { cookieHeader } = await samlAuth.asInteractiveUser(INDEX_PATTERNS_ALL_ROLE);
      const response = await apiClient.post(
        getCapabilitiesApiPath(API_CUSTOM_SPACE_INDEX_PATTERNS_DISABLED.id),
        {
          headers: { ...COMMON_HEADERS, ...cookieHeader },
          body: { applications: [] },
        }
      );

      expect(response).toHaveStatusCode(200);
      expect(response.body.management.kibana.indexPatterns).toBe(false);
    }
  );
});
