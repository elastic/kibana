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
  API_CUSTOM_SPACE_DEV_TOOLS_DISABLED,
  CAPABILITIES_API_PATH,
  COMMON_HEADERS,
  DEV_TOOLS_ALL_ROLE,
  DEV_TOOLS_READ_ROLE,
  NO_DEV_TOOLS_ROLE,
} from '../../common/fixtures/constants';

const getCapabilitiesApiPath = (spaceId?: string) =>
  spaceId ? `/s/${spaceId}${CAPABILITIES_API_PATH}` : CAPABILITIES_API_PATH;

apiTest.describe('Dev Tools feature controls', { tag: tags.stateful.classic }, () => {
  apiTest.afterAll(async ({ apiServices }) => {
    await apiServices.spaces.delete(API_CUSTOM_SPACE.id).catch(() => {});
    await apiServices.spaces.delete(API_CUSTOM_SPACE_DEV_TOOLS_DISABLED.id).catch(() => {});
  });

  apiTest(
    'all privileges expose Dev Tools with save capabilities',
    async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser(DEV_TOOLS_ALL_ROLE);
      const response = await apiClient.post(CAPABILITIES_API_PATH, {
        headers: { ...COMMON_HEADERS, ...cookieHeader },
        body: { applications: [] },
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body.dev_tools.show).toBe(true);
      expect(response.body.dev_tools.save).toBe(true);
    }
  );

  apiTest(
    'read privileges expose Dev Tools without save capabilities',
    async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser(DEV_TOOLS_READ_ROLE);
      const response = await apiClient.post(CAPABILITIES_API_PATH, {
        headers: { ...COMMON_HEADERS, ...cookieHeader },
        body: { applications: [] },
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body.dev_tools.show).toBe(true);
      expect(response.body.dev_tools.save).toBe(false);
    }
  );

  apiTest(
    'users without Dev Tools privileges cannot access Dev Tools',
    async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser(NO_DEV_TOOLS_ROLE);
      const response = await apiClient.post(CAPABILITIES_API_PATH, {
        headers: { ...COMMON_HEADERS, ...cookieHeader },
        body: { applications: [] },
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body.dev_tools.show).toBe(false);
      expect(response.body.dev_tools.save).toBe(false);
    }
  );

  apiTest(
    'space with Dev Tools enabled exposes Dev Tools',
    async ({ apiClient, apiServices, samlAuth }) => {
      await apiServices.spaces.delete(API_CUSTOM_SPACE.id).catch(() => {});
      await apiServices.spaces.create(API_CUSTOM_SPACE);
      const { cookieHeader } = await samlAuth.asInteractiveUser(DEV_TOOLS_READ_ROLE);
      const response = await apiClient.post(getCapabilitiesApiPath(API_CUSTOM_SPACE.id), {
        headers: { ...COMMON_HEADERS, ...cookieHeader },
        body: { applications: [] },
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body.dev_tools.show).toBe(true);
    }
  );

  apiTest(
    'space with Dev Tools disabled hides Dev Tools',
    async ({ apiClient, apiServices, samlAuth }) => {
      await apiServices.spaces.delete(API_CUSTOM_SPACE_DEV_TOOLS_DISABLED.id).catch(() => {});
      await apiServices.spaces.create(API_CUSTOM_SPACE_DEV_TOOLS_DISABLED);
      const { cookieHeader } = await samlAuth.asInteractiveUser(DEV_TOOLS_ALL_ROLE);
      const response = await apiClient.post(
        getCapabilitiesApiPath(API_CUSTOM_SPACE_DEV_TOOLS_DISABLED.id),
        {
          headers: { ...COMMON_HEADERS, ...cookieHeader },
          body: { applications: [] },
        }
      );

      expect(response).toHaveStatusCode(200);
      expect(response.body.dev_tools.show).toBe(false);
    }
  );
});
