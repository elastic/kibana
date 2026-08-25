/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { KibanaRole } from '@kbn/scout';
import { apiTest, tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { COMMON_HEADERS } from '../fixtures/constants';

// `/_cat` answers 200 for any authenticated user, so the status code reflects Kibana's
// authorization decision rather than Elasticsearch privileges.
const proxyPath = (spaceId?: string) => {
  const path = `api/console/proxy?method=GET&path=${encodeURIComponent('/_cat')}`;
  return spaceId ? `s/${spaceId}/${path}` : path;
};

const globalRole = (base: string): KibanaRole => ({
  elasticsearch: { cluster: [] },
  kibana: [{ base: [base], feature: {}, spaces: ['*'] }],
});

// Any feature other than dev_tools would do; Console must stay out of reach.
const DASHBOARD_ALL_ROLE: KibanaRole = {
  elasticsearch: { cluster: [] },
  kibana: [{ base: [], feature: { dashboard: ['all'] }, spaces: ['*'] }],
};

apiTest.describe(
  'POST /api/console/proxy — authorization',
  { tag: tags.deploymentAgnostic },
  () => {
    let devToolsSpaceId: string;
    let dashboardSpaceId: string;
    // dev_tools in one space, dashboard in the other, so the same credentials must be
    // accepted in the first space and rejected in the second.
    let spaceScopedRole: KibanaRole;

    apiTest.beforeAll(async ({ apiServices }, workerInfo) => {
      devToolsSpaceId = `console-dev-tools-${workerInfo.parallelIndex}`;
      dashboardSpaceId = `console-dashboard-${workerInfo.parallelIndex}`;

      await apiServices.spaces.create({ id: devToolsSpaceId, name: devToolsSpaceId });
      await apiServices.spaces.create({ id: dashboardSpaceId, name: dashboardSpaceId });

      spaceScopedRole = {
        elasticsearch: { cluster: [] },
        kibana: [
          { base: [], feature: { dev_tools: ['all'] }, spaces: [devToolsSpaceId] },
          { base: [], feature: { dashboard: ['all'] }, spaces: [dashboardSpaceId] },
        ],
      };
    });

    apiTest.afterAll(async ({ apiServices }) => {
      await apiServices.spaces.delete(devToolsSpaceId);
      await apiServices.spaces.delete(dashboardSpaceId);
    });

    apiTest('rejects an unauthenticated request', async ({ apiClient }) => {
      const response = await apiClient.post(proxyPath(), { headers: COMMON_HEADERS });

      expect(response).toHaveStatusCode(401);
    });

    apiTest('accepts a role with global all privileges', async ({ apiClient, requestAuth }) => {
      const { apiKeyHeader } = await requestAuth.getApiKeyForCustomRole(globalRole('all'));
      const response = await apiClient.post(proxyPath(), {
        headers: { ...COMMON_HEADERS, ...apiKeyHeader },
      });

      expect(response).toHaveStatusCode(200);
    });

    apiTest('accepts a role with global read privileges', async ({ apiClient, requestAuth }) => {
      const { apiKeyHeader } = await requestAuth.getApiKeyForCustomRole(globalRole('read'));
      const response = await apiClient.post(proxyPath(), {
        headers: { ...COMMON_HEADERS, ...apiKeyHeader },
      });

      expect(response).toHaveStatusCode(200);
    });

    apiTest('rejects a role without dev_tools access', async ({ apiClient, requestAuth }) => {
      const { apiKeyHeader } = await requestAuth.getApiKeyForCustomRole(DASHBOARD_ALL_ROLE);
      const response = await apiClient.post(proxyPath(), {
        headers: { ...COMMON_HEADERS, ...apiKeyHeader },
      });

      expect(response).toHaveStatusCode(403);
    });

    apiTest(
      'accepts a space-scoped role in the space that grants dev_tools',
      async ({ apiClient, requestAuth }) => {
        const { apiKeyHeader } = await requestAuth.getApiKeyForCustomRole(spaceScopedRole);
        const response = await apiClient.post(proxyPath(devToolsSpaceId), {
          headers: { ...COMMON_HEADERS, ...apiKeyHeader },
        });

        expect(response).toHaveStatusCode(200);
      }
    );

    apiTest(
      'rejects a space-scoped role in a space that does not grant dev_tools',
      async ({ apiClient, requestAuth }) => {
        const { apiKeyHeader } = await requestAuth.getApiKeyForCustomRole(spaceScopedRole);
        const response = await apiClient.post(proxyPath(dashboardSpaceId), {
          headers: { ...COMMON_HEADERS, ...apiKeyHeader },
        });

        expect(response).toHaveStatusCode(403);
      }
    );
  }
);
