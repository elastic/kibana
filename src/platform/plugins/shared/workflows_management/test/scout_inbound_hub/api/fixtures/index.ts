/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ApiClientFixture, RoleApiCredentials, SamlAuth } from '@kbn/scout';

import { spaceTest as workflowsSpaceTest } from '../../../scout/api/fixtures';

/**
 * The shared workflows space test does not include requestAuth. These two creators match
 * Scout's API-key fixture: an empty descriptor inherits the admin session, and a built-in
 * role is embedded in the key.
 */
interface HubRequestAuth {
  getApiKey: (role: 'admin') => Promise<RoleApiCredentials>;
  getApiKeyForBuiltInRole: (roleName: string) => Promise<RoleApiCredentials>;
}

const isElasticsearchRole = (role: object | undefined): boolean => !(role && 'kibana' in role);

export const spaceTest = workflowsSpaceTest.extend<{}, { requestAuth: HubRequestAuth }>({
  requestAuth: [
    async (
      { apiClient, samlAuth }: { apiClient: ApiClientFixture; samlAuth: SamlAuth },
      use: (requestAuth: HubRequestAuth) => Promise<void>
    ) => {
      const generated: Array<RoleApiCredentials['apiKey']> = [];

      const createApiKey = async (
        roleName: string,
        descriptors: Record<string, object | undefined>
      ): Promise<RoleApiCredentials> => {
        const response = await apiClient.post('internal/security/api_key', {
          headers: {
            'kbn-xsrf': 'true',
            'x-elastic-internal-origin': 'kibana',
            ...(await samlAuth.session.getApiCredentialsForRole('admin')),
          },
          body: {
            name: `inbound-hub-${roleName}-${generated.length}`,
            metadata: {},
            ...(isElasticsearchRole(descriptors[roleName])
              ? { role_descriptors: descriptors }
              : { kibana_role_descriptors: descriptors }),
          },
          responseType: 'json',
        });
        if (response.statusCode !== 200) {
          throw new Error(
            `Failed to create an API key for ${roleName}: ${response.statusCode} ${response.statusMessage}`
          );
        }
        const apiKey = response.body as RoleApiCredentials['apiKey'];
        generated.push(apiKey);
        return { apiKey, apiKeyHeader: { Authorization: `ApiKey ${apiKey.encoded}` } };
      };

      await use({
        getApiKey: (role) => createApiKey(role, {}),
        getApiKeyForBuiltInRole: async (roleName) => {
          const descriptor = await samlAuth.fetchBuiltInRoleDescriptor(roleName);
          return createApiKey(roleName, { [roleName]: descriptor });
        },
      });

      if (generated.length === 0) {
        return;
      }
      await apiClient.post('internal/security/api_key/invalidate', {
        headers: {
          'kbn-xsrf': 'true',
          'x-elastic-internal-origin': 'kibana',
          ...(await samlAuth.session.getApiCredentialsForRole('admin')),
        },
        body: {
          apiKeys: generated.map(({ id, name }) => ({ id, name })),
          isAdmin: true,
        },
        responseType: 'json',
      });
    },
    { scope: 'worker' },
  ],
});
