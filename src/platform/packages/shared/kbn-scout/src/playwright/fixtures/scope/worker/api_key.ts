/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Client } from '@elastic/elasticsearch';
import { coreWorkerFixtures } from './core_fixtures';
import type { ApiClientFixture } from './api_client';
import type { DefaultRolesFixture } from './default_roles';
import type { ElasticsearchRoleDescriptor, KibanaRole } from '../../../../common';
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
  getApiKeyForCustomRole: (
    role: KibanaRole | ElasticsearchRoleDescriptor
  ) => Promise<RoleApiCredentials>;
}

export const requestAuthFixture = coreWorkerFixtures.extend<
  {},
  {
    requestAuth: RequestAuthFixture;
    defaultRoles: DefaultRolesFixture;
    apiClient: ApiClientFixture;
    esClient: Client;
  }
>({
  requestAuth: [
    async ({ log, samlAuth, defaultRoles, apiClient, esClient }, use, workerInfo) => {
      const generatedApiKeys: ApiKey[] = [];
      let isCustomRoleCreated = false;

      const createApiKeyPayload = (
        apiKeyName: string,
        roleName: string,
        descriptors: Record<string, any>
      ) => {
        const roleDescriptor = descriptors[roleName];
        const isKibanaRole = roleDescriptor && 'kibana' in roleDescriptor;

        return {
          name: apiKeyName,
          metadata: {},
          ...(isKibanaRole
            ? { kibana_role_descriptors: descriptors }
            : { role_descriptors: descriptors }),
        };
      };

      const createApiKey = async (roleName: string, roleDescriptors: Record<string, any>) => {
        log.debug(
          `Creating API key for ${roleName} with privileges: ${JSON.stringify(roleDescriptors)}`
        );

        const apiKeyName = `myTestApiKey-${generatedApiKeys.length}-worker-${
          workerInfo.parallelIndex + 1
        }`;

        const adminCookieHeader = await samlAuth.session.getApiCredentialsForRole('admin');

        const payload = createApiKeyPayload(apiKeyName, roleName, roleDescriptors);
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
            `Failed to create API key for '${roleName}' role with response text: ${response.statusMessage}`
          );
        }

        const apiKey = response.body as ApiKey;
        const apiKeyHeader = { Authorization: `ApiKey ${apiKey.encoded}` };

        log.info(`Successfully created API key for ${roleName} role: ${apiKey.name}`);
        generatedApiKeys.push(apiKey);
        return { apiKey, apiKeyHeader };
      };

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
        // fetch role descriptors from roles.yml file
        const roleDescriptors =
          role === 'admin'
            ? {}
            : (() => {
                const roleDescriptor = defaultRoles.get(role);
                if (!roleDescriptor) {
                  throw new Error(`Cannot create API key for non-existent role "${role}"`);
                }
                return { [role]: roleDescriptor };
              })();
        // Regular roles use role_descriptors (not kibana_role_descriptors)
        return await createApiKey(role, roleDescriptors);
      };

      const getApiKeyForCustomRole = async (
        roleDescriptor: KibanaRole | ElasticsearchRoleDescriptor
      ): Promise<RoleApiCredentials> => {
        isCustomRoleCreated = true;

        try {
          await samlAuth.setCustomRole(roleDescriptor);

          const result = await createApiKey(samlAuth.customRoleName, {
            [samlAuth.customRoleName]: roleDescriptor,
          });
          return result;
        } catch (error: any) {
          log.error(`Failed to create API key for custom role: ${error.message}`);
          throw error;
        }
      };

      await use({ getApiKey, getApiKeyForCustomRole });

      // Invalidate all API Keys after tests
      await measurePerformanceAsync(log, `Delete all API Keys`, async () => {
        log.debug(`Delete all API Keys`);
        return invalidateApiKeys(generatedApiKeys);
      });

      if (isCustomRoleCreated) {
        log.debug(`Deleting custom role with name ${samlAuth.customRoleName}`);
        try {
          await esClient.security.deleteRole({ name: samlAuth.customRoleName });
          log.info(`Successfully deleted custom role: ${samlAuth.customRoleName}`);
        } catch (error: any) {
          log.error(`Failed to delete custom role ${samlAuth.customRoleName}: ${error.message}`);
        }
      }
    },
    { scope: 'worker' },
  ],
});
