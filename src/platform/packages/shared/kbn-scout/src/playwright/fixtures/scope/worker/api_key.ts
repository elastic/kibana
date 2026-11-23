/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { coreWorkerFixtures } from './saml_auth';
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
   * Creates an API key scoped to an inline Kibana or Elasticsearch role descriptor
   * without creating or changing the worker's persisted custom role.
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
  /**
   * Fetches the descriptor of the named ES role and creates an API key scoped
   * to those privileges. Works for built-in ES roles (e.g. `'kibana_admin'`,
   * `'superuser'`) without requiring an entry in `roles.yml`.
   *
   * The descriptor is embedded inline in the API key — no separate role is
   * created in Elasticsearch.
   *
   * @example
   * const { apiKeyHeader } = await requestAuth.getApiKeyForBuiltInRole('kibana_admin');
   */
  getApiKeyForBuiltInRole: (roleName: string) => Promise<RoleApiCredentials>;
}

interface InvalidateApiKeysResponse {
  itemsInvalidated: Array<Pick<ApiKey, 'id' | 'name'>>;
  errors: Array<Pick<ApiKey, 'id' | 'name'>>;
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
      const pendingOperations = new Set<Promise<RoleApiCredentials>>();
      let acceptingCredentials = true;

      const runCredentialOperation = (
        create: () => Promise<RoleApiCredentials>
      ): Promise<RoleApiCredentials> => {
        if (!acceptingCredentials) {
          return Promise.reject(
            new Error('Cannot create API credentials after teardown has started')
          );
        }

        // Register before any side effects, and observe rejections without changing the caller's result.
        const operation = Promise.resolve().then(create);
        pendingOperations.add(operation);
        void operation.then(
          () => pendingOperations.delete(operation),
          () => pendingOperations.delete(operation)
        );
        return operation;
      };

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
        const response = await apiClient.post<ApiKey>('internal/security/api_key', {
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

        const apiKey = response.body;
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
        const response = await apiClient.post<InvalidateApiKeysResponse>(
          'internal/security/api_key/invalidate',
          {
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
          }
        );

        if (response.statusCode !== 200) {
          throw new Error(
            `Failed to invalidate API keys: HTTP ${response.statusCode}: ${response.statusMessage}`
          );
        }

        const { itemsInvalidated, errors } = response.body;
        if (!Array.isArray(itemsInvalidated) || !Array.isArray(errors)) {
          throw new Error('Invalid API key invalidation response');
        }
        if (errors.length > 0) {
          throw new Error(`API key invalidation errors: ${JSON.stringify(errors)}`);
        }

        const invalidatedIds = new Set(itemsInvalidated.map(({ id }) => id));
        const missingIds = apiKeys.filter(({ id }) => !invalidatedIds.has(id)).map(({ id }) => id);
        if (missingIds.length > 0 || itemsInvalidated.length !== apiKeys.length) {
          throw new Error(
            `Incomplete API key invalidation: expected ${apiKeys.length}, received ${
              itemsInvalidated.length
            }; missing IDs: ${missingIds.join(', ')}`
          );
        }
        log.info(`Invalidated ${itemsInvalidated.length} API keys`);
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

      const getApiKeyForCustomRole = (
        roleDescriptor: KibanaRole | ElasticsearchRoleDescriptor
      ): Promise<RoleApiCredentials> =>
        createApiKeyWithAdminCredentials(samlAuth.customRoleName, {
          [samlAuth.customRoleName]: roleDescriptor,
        });

      const getApiKeyForAdmin = () => getApiKey('admin');
      const getApiKeyForViewer = () => getApiKey('viewer');

      const getApiKeyForPrivilegedUser = async (): Promise<RoleApiCredentials> => {
        return getApiKey(
          getPrivilegedRoleName({ serverless: config.serverless, projectType: config.projectType! })
        );
      };

      const getApiKeyForBuiltInRole = async (roleName: string): Promise<RoleApiCredentials> => {
        // Use fetchBuiltInRoleDescriptor (not setBuiltInRole) — the API key embeds
        // the descriptor inline so no ES role needs to be created.
        const descriptor = await samlAuth.fetchBuiltInRoleDescriptor(roleName);
        return createApiKeyWithAdminCredentials(roleName, { [roleName]: descriptor });
      };

      // Preserve use failures while still cleaning up, including when use throws synchronously.
      const useResults = await Promise.allSettled([
        Promise.resolve().then(() =>
          use({
            getApiKey: (role) => runCredentialOperation(() => getApiKey(role)),
            getApiKeyForCustomRole: (role) =>
              runCredentialOperation(() => getApiKeyForCustomRole(role)),
            getApiKeyForAdmin: () => runCredentialOperation(getApiKeyForAdmin),
            getApiKeyForViewer: () => runCredentialOperation(getApiKeyForViewer),
            getApiKeyForPrivilegedUser: () => runCredentialOperation(getApiKeyForPrivilegedUser),
            getApiKeyForBuiltInRole: (role) =>
              runCredentialOperation(() => getApiKeyForBuiltInRole(role)),
          })
        ),
      ]);

      // Hook timeouts do not cancel requests: stop new calls and drain admitted credential operations.
      acceptingCredentials = false;
      log.debug('Waiting for pending API credential operations');
      await Promise.allSettled(pendingOperations);
      const cleanupResults = await Promise.allSettled([
        measurePerformanceAsync(log, `Delete all API Keys`, async () => {
          log.debug(`Delete all API Keys`);
          return invalidateApiKeys(generatedApiKeys);
        }),
      ]);
      const failures = [...useResults, ...cleanupResults].filter(
        (result) => result.status === 'rejected'
      );
      if (failures.length === 1) {
        throw failures[0].reason;
      }
      if (failures.length > 1) {
        throw new AggregateError(
          failures.map(({ reason }) => reason),
          'API credential use and cleanup failed'
        );
      }

      // The dependent samlAuth cleanup can now proceed after credential cleanup.
    },
    { scope: 'worker' },
  ],
});
