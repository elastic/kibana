/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { coreWorkerFixtures } from './core_fixtures';
import { ApiClientFixture } from './api_client';
import { DefaultRolesFixture } from './default_roles';
import { measurePerformanceAsync } from '../../../../common';

export interface ApiKey {
  id: string;
  name: string;
  api_key: string;
  encoded: string;
}

export interface ApiKeyHeader {
  [Authorization: string]: string;
}

export interface RoleApiCredentials {
  apiKey: ApiKey;
  apiKeyHeader: ApiKeyHeader;
}

export interface RequestAuthFixture {
  getApiKey: (role: string) => Promise<RoleApiCredentials>;
}

export const requestAuthFixture = coreWorkerFixtures.extend<
  {},
  {
    requestAuth: RequestAuthFixture;
    defaultRoles: DefaultRolesFixture;
    apiClient: ApiClientFixture;
  }
>({
  requestAuth: [
    async ({ log, samlAuth, defaultRoles, apiClient }, use, workerInfo) => {
      const generatedApiKeys: ApiKey[] = [];

      const createApiKeyPayload = (
        apiKeyName: string,
        role: string,
        descriptors: Record<string, any>
      ) => ({
        name: apiKeyName,
        metadata: {},
        ...(role === samlAuth.customRoleName
          ? { kibana_role_descriptors: descriptors }
          : { role_descriptors: descriptors }),
      });

      const invalidateApiKeys = async (apiKeys: ApiKey[]) => {
        // Get admin credentials in order to invalidate the API key
        for (const apiKey of apiKeys) {
          const adminCookieHeader = await samlAuth.session.getApiCredentialsForRole('admin');

          const response = await apiClient.post('internal/security/api_key/invalidate', {
            headers: {
              'kbn-xsrf': 'some-xsrf-token',
              'x-elastic-internal-origin': 'kibana',
              ...adminCookieHeader,
            },
            body: {
              apiKeys: [{ id: apiKey.id, name: apiKey.name }],
              isAdmin: true,
            },
            responseType: 'json',
          });

          if (response.statusCode !== 200) {
            log.info(`Failed to invalidate API key: ${apiKey.name}`);
          } else {
            log.info(`Successfully invalidated API key: ${apiKey.name}`);
          }
        }
      };

      const getApiKey = async (role: string): Promise<RoleApiCredentials> => {
        const apiKeyName = `myTestApiKey-${generatedApiKeys.length}-worker-${
          workerInfo.parallelIndex + 1
        }`;
        const adminCookieHeader = await samlAuth.session.getApiCredentialsForRole('admin');

        const roleDescriptors =
          role === 'admin'
            ? {}
            : (() => {
                const roleDescriptor = defaultRoles.get(role);
                if (!roleDescriptor) {
                  throw new Error(`Cannot create API key for non-existent role "${role}"`);
                }
                log.debug(
                  `Creating API key for ${role} with privileges: ${JSON.stringify(roleDescriptor)}`
                );
                return { [role]: roleDescriptor };
              })();

        const payload = createApiKeyPayload(apiKeyName, role, roleDescriptors);
        const response = await apiClient.post('internal/security/api_key', {
          headers: {
            'kbn-xsrf': 'some-xsrf-token',
            'x-elastic-internal-origin': 'kibana',
            ...adminCookieHeader,
          },
          body: payload,
          responseType: 'json',
        });

        if (response.statusCode !== 200) {
          throw new Error(
            `Failed to create API key for '${role}' role with response text: ${response.statusMessage}`
          );
        }

        const apiKey = response.body as ApiKey;
        const apiKeyHeader = { Authorization: `ApiKey ${apiKey.encoded}` };

        log.info(`Created API key for role: [${role}]`);
        generatedApiKeys.push(apiKey);
        return { apiKey, apiKeyHeader };
      };

      await use({ getApiKey });

      // Invalidate all API Keys after tests
      await measurePerformanceAsync(log, `Delete all API Keys`, async () => {
        log.debug(`Delete all API Keys`);
        return invalidateApiKeys(generatedApiKeys);
      });
    },
    { scope: 'worker' },
  ],
});
