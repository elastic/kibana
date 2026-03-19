/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { coreWorkerFixtures } from './core_fixtures';
import type { ApiClientFixture } from './api_client';
import type { DefaultRolesFixture } from './default_roles';
import type { ElasticsearchRoleDescriptor, KibanaRole } from '../../../../common';
import {
  measurePerformanceAsync,
  isElasticsearchRole,
  getPrivilegedRoleName,
} from '../../../../common';

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
  /**
   * Creates an API key for a predefined role (e.g. 'admin', 'viewer', 'editor').
   * Role privileges are resolved from the corresponding roles.yml file.
   * @param role - The predefined role name.
   */
  getApiKey: (role: string) => Promise<RoleApiCredentials>;
  /**
   * Creates an API key for a custom role defined inline via a Kibana or Elasticsearch
   * role descriptor. The role is created on-the-fly and cleaned up after the worker completes.
   * @param role - A Kibana or Elasticsearch role descriptor with specific permissions.
   */
  getApiKeyForCustomRole: (
    role: KibanaRole | ElasticsearchRoleDescriptor
  ) => Promise<RoleApiCredentials>;
  /**
   * Shorthand for `getApiKey('admin')`.
   * Creates an API key with administrative privileges.
   */
  getApiKeyForAdmin: () => Promise<RoleApiCredentials>;
  /**
   * Shorthand for `getApiKey('viewer')`.
   * Creates an API key with viewer-only permissions.
   */
  getApiKeyForViewer: () => Promise<RoleApiCredentials>;
  /**
   * Creates an API key for a non-admin user with elevated privileges.
   * Resolves the role based on the environment: `developer` for serverless
   * Elasticsearch projects, `editor` for all other deployments and project types.
   */
  getApiKeyForPrivilegedUser: () => Promise<RoleApiCredentials>;
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
    async ({ log, config, samlAuth, defaultRoles, apiClient }, use, workerInfo) => {
      const generatedApiKeys: ApiKey[] = [];

      const createApiKeyPayload = (
        apiKeyName: string,
        roleName: string,
        descriptors: Record<string, any>
      ) => {
        const roleDescriptor = descriptors[roleName];

        return {
          name: apiKeyName,
          metadata: {},
          ...(isElasticsearchRole(roleDescriptor)
            ? { role_descriptors: descriptors }
            : { kibana_role_descriptors: descriptors }),
        };
      };

      const createApiKeyWithAdminCredentials = async (
        roleName: string,
        roleDescriptors: Record<string, any>
      ) => {
        log.debug(
          `Creating API key for ${roleName} with privileges: ${JSON.stringify(roleDescriptors)}`
        );

        const apiKeyName = `myTestApiKey-${generatedApiKeys.length}-${roleName}-worker-${
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

        log.info(`Created API key for ${roleName} role: ${apiKey.name}`);
        generatedApiKeys.push(apiKey);
        return { apiKey, apiKeyHeader };
      };

      const invalidateApiKeys = async (apiKeys: ApiKey[]) => {
        if (apiKeys.length === 0) {
          return;
        }

        // Get admin credentials once for all invalidations
        const adminCookieHeader = await samlAuth.session.getApiCredentialsForRole('admin');

        // Batch invalidate all API keys in a single request (API supports up to 1000 keys)
        const response = await apiClient.post('internal/security/api_key/invalidate', {
          headers: {
            'kbn-xsrf': 'some-xsrf-token',
            'x-elastic-internal-origin': 'kibana',
            ...adminCookieHeader,
          },
          body: {
            apiKeys: apiKeys.map((apiKey) => ({ id: apiKey.id, name: apiKey.name })),
            isAdmin: true,
          },
          responseType: 'json',
        });

        if (response.statusCode !== 200) {
          log.info(`Failed to invalidate ${apiKeys.length} API keys`);
        } else {
          const invalidatedCount = response.body?.itemsInvalidated?.length || 0;
          const errorCount = response.body?.errors?.length || 0;
          log.info(
            `Invalidated ${invalidatedCount} API keys${
              errorCount > 0 ? ` (${errorCount} errors)` : ''
            }`
          );
          if (errorCount > 0) {
            log.debug(`API key invalidation errors: ${JSON.stringify(response.body.errors)}`);
          }
        }
      };

      const getApiKey = async (predefinedRole: string): Promise<RoleApiCredentials> => {
        // fetch role descriptors from roles.yml file
        const roleDescriptors =
          predefinedRole === 'admin'
            ? {}
            : (() => {
                samlAuth.session.validateRole(predefinedRole);
                const roleDescriptor = defaultRoles.availableRoles.get(predefinedRole);
                return { [predefinedRole]: roleDescriptor };
              })();
        return await createApiKeyWithAdminCredentials(predefinedRole, roleDescriptors);
      };

      const getApiKeyForCustomRole = async (
        roleDescriptor: KibanaRole | ElasticsearchRoleDescriptor
      ): Promise<RoleApiCredentials> => {
        await samlAuth.setCustomRole(roleDescriptor);

        const result = await createApiKeyWithAdminCredentials(samlAuth.customRoleName, {
          [samlAuth.customRoleName]: roleDescriptor,
        });
        return result;
      };

      const getApiKeyForAdmin = () => getApiKey('admin');
      const getApiKeyForViewer = () => getApiKey('viewer');

      const getApiKeyForPrivilegedUser = async (): Promise<RoleApiCredentials> => {
        return getApiKey(
          getPrivilegedRoleName({ serverless: config.serverless, projectType: config.projectType! })
        );
      };

      await use({
        getApiKey,
        getApiKeyForCustomRole,
        getApiKeyForAdmin,
        getApiKeyForViewer,
        getApiKeyForPrivilegedUser,
      });

      // Invalidate all API Keys after tests
      await measurePerformanceAsync(log, `Delete all API Keys`, async () => {
        log.debug(`Delete all API Keys`);
        return invalidateApiKeys(generatedApiKeys);
      });

      // Note: the custom role will be deleted in the samlAuth fixture cleanup
    },
    { scope: 'worker' },
  ],
});
