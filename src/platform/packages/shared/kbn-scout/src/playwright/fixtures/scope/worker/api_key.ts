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

// Bounded so cleanup requests stay small and match Kibana's invalidation route limit.
const MAX_INVALIDATION_BATCH_SIZE = 1000;
// Leaves room in the worker teardown budget to revoke keys that arrive during the drain.
export const PENDING_CREDENTIALS_DRAIN_TIMEOUT_MS = 20_000;
// Backstop for keys whose IDs never reach the fixture, for example when a create is still running
// after the worker exits; outlives any worker so tests never hit it.
export const API_KEY_EXPIRATION = '1d';

const describeFailure = (reason: unknown): string =>
  reason instanceof Error ? reason.message : String(reason);

// Throws the only failure as-is, or every failure together, from a set of settled results.
const throwIfAnyRejected = (results: PromiseSettledResult<unknown>[], message: string) => {
  const failures = results.flatMap((result) =>
    result.status === 'rejected' ? [result.reason] : []
  );
  if (failures.length === 1) {
    throw failures[0];
  }
  if (failures.length > 1) {
    // Reporters record only message and stack, so the message carries every underlying failure.
    throw new AggregateError(
      failures,
      `${message}: ${failures.map((reason) => describeFailure(reason)).join('; ')}`
    );
  }
};

export const requestAuthFixture = coreWorkerFixtures.extend<
  {},
  {
    requestAuth: RequestAuthFixture;
    defaultRoles: DefaultRolesFixture;
    apiClient: ApiClientFixture;
  }
>({
  requestAuth: [
    async ({ log, config, esClient, samlAuth, defaultRoles, apiClient }, use, workerInfo) => {
      const generatedApiKeys: ApiKey[] = [];
      const pendingOperations = new Set<Promise<RoleApiCredentials>>();
      let acceptingCredentials = true;
      // Set when the drain deadline passes; requests are left running so late keys can be revoked.
      let pendingOperationsAbandoned = false;
      // Revocations started by abandoned operations; teardown waits for any still running.
      const abandonedRevocations = new Set<Promise<void>>();

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
          expiration: API_KEY_EXPIRATION,
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

        // Avoid starting a SAML login for an operation that can no longer record its key.
        throwIfAbandoned();
        const adminCookieHeader = await samlAuth.session.getApiCredentialsForRole('admin');
        throwIfAbandoned();

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
        if (pendingOperationsAbandoned) {
          // Teardown has stopped collecting keys, so revoke this one before reporting the failure.
          await revokeAbandonedApiKey(apiKey);
          throwIfAbandoned();
        }

        const apiKeyHeader = { Authorization: `ApiKey ${apiKey.encoded}` };

        log.info(`Created API key for ${roleName} role: ${apiKey.name}`);
        generatedApiKeys.push(apiKey);
        return { apiKey, apiKeyHeader };
      };

      // Elasticsearch omits already-invalidated keys from invalidation results, so look them up.
      const findActiveApiKeyIds = async (ids: string[]): Promise<string[]> => {
        if (ids.length === 0) {
          return [];
        }

        const { api_keys: apiKeys } = await esClient.security.queryApiKeys({
          query: { ids: { values: ids } },
          size: ids.length,
        });
        if (!Array.isArray(apiKeys)) {
          throw new Error('Invalid API key query response');
        }
        // A key that is no longer returned has been removed, so it cannot authenticate.
        const activeIds = new Set(
          apiKeys.filter(({ invalidated }) => invalidated !== true).map(({ id }) => id)
        );
        return ids.filter((id) => activeIds.has(id));
      };

      const invalidateApiKeyBatch = async (apiKeys: ApiKey[]) => {
        const ids = apiKeys.map(({ id }) => id);
        // Elasticsearch reports per-key revocation results; Kibana's internal route discards them.
        const {
          error_count: errorCount,
          error_details: errorDetails,
          invalidated_api_keys: invalidatedIds,
          previously_invalidated_api_keys: previouslyInvalidatedIds,
        } = await esClient.security.invalidateApiKey({ ids });

        if (
          typeof errorCount !== 'number' ||
          !Array.isArray(invalidatedIds) ||
          !Array.isArray(previouslyInvalidatedIds)
        ) {
          throw new Error('Invalid API key invalidation response');
        }
        if (errorCount !== 0) {
          throw new Error(
            `API key invalidation reported ${errorCount} error(s): ${JSON.stringify(errorDetails)}`
          );
        }

        const revokedIds = new Set([...invalidatedIds, ...previouslyInvalidatedIds]);
        const unreportedIds = ids.filter((id) => !revokedIds.has(id));
        const missingIds = await findActiveApiKeyIds(unreportedIds);
        if (missingIds.length > 0) {
          throw new Error(
            `Incomplete API key invalidation: ${missingIds.length} of ${
              ids.length
            } key(s) still active after invalidation; missing IDs: ${missingIds.join(', ')}`
          );
        }
      };

      const invalidateApiKeys = async (apiKeys: ApiKey[]) => {
        if (apiKeys.length === 0) {
          return;
        }

        const batches: ApiKey[][] = [];
        for (let start = 0; start < apiKeys.length; start += MAX_INVALIDATION_BATCH_SIZE) {
          batches.push(apiKeys.slice(start, start + MAX_INVALIDATION_BATCH_SIZE));
        }
        // Attempt every batch so one failure does not leave the remaining keys active.
        throwIfAnyRejected(
          await Promise.allSettled(batches.map(invalidateApiKeyBatch)),
          'API key invalidation failed'
        );
        log.info(`Invalidated ${apiKeys.length} API keys`);
      };

      const revokeAbandonedApiKey = (apiKey: ApiKey): Promise<void> => {
        const revocation = invalidateApiKeys([apiKey]).catch((error) => {
          // Logged even after teardown finishes, so the key can be revoked by hand.
          log.error(
            `Failed to revoke API key '${apiKey.id}' (${
              apiKey.name
            }) that arrived after teardown timed out: ${describeFailure(error)}`
          );
          throw new Error(
            `Failed to revoke late API key '${apiKey.id}': ${describeFailure(error)}`
          );
        });
        abandonedRevocations.add(revocation);
        void revocation.then(
          () => abandonedRevocations.delete(revocation),
          () => abandonedRevocations.delete(revocation)
        );
        return revocation;
      };

      const throwIfAbandoned = () => {
        if (pendingOperationsAbandoned) {
          throw new Error('API credential request abandoned because teardown timed out');
        }
      };

      const drainPendingOperations = async () => {
        if (pendingOperations.size === 0) {
          return;
        }

        let timer: NodeJS.Timeout | undefined;
        const timedOut = new Promise<boolean>((resolve) => {
          timer = setTimeout(() => resolve(true), PENDING_CREDENTIALS_DRAIN_TIMEOUT_MS);
        });
        const settled = Promise.allSettled(pendingOperations).then(() => false);
        const didTimeOut = await Promise.race([settled, timedOut]);
        clearTimeout(timer);

        if (didTimeOut) {
          // Late keys are revoked only while this worker is alive; API_KEY_EXPIRATION covers the rest.
          const stalledCount = pendingOperations.size;
          pendingOperationsAbandoned = true;
          throw new Error(
            `Timed out after ${PENDING_CREDENTIALS_DRAIN_TIMEOUT_MS}ms waiting for ${stalledCount} pending API credential operation(s)`
          );
        }
      };

      // Revoke known keys right away; revoke late keys as soon as the drain settles, independently.
      const cleanUpApiKeys = async () => {
        const knownKeys = generatedApiKeys.slice();
        const drainThenRevokeLateKeys = async () => {
          const drainResults = await Promise.allSettled([drainPendingOperations()]);
          // After a timeout, abandoned operations revoke their own keys instead of recording them.
          const lateResults = await Promise.allSettled([
            invalidateApiKeys(generatedApiKeys.slice(knownKeys.length)),
          ]);
          return [...drainResults, ...lateResults];
        };
        const [knownResult, lateResults] = await Promise.all([
          Promise.allSettled([invalidateApiKeys(knownKeys)]),
          drainThenRevokeLateKeys(),
        ]);
        // Keys that arrived after the deadline while cleanup ran; each is bounded by the ES timeout.
        const abandonedResults = await Promise.allSettled(abandonedRevocations);
        throwIfAnyRejected(
          [...knownResult, ...lateResults, ...abandonedResults],
          'API key cleanup failed'
        );
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

      // Hook timeouts do not cancel requests: stop new calls, then clean up known and late keys.
      acceptingCredentials = false;
      const cleanupResults = await Promise.allSettled([
        measurePerformanceAsync(log, `Delete all API Keys`, async () => {
          log.debug(`Delete all API Keys`);
          return cleanUpApiKeys();
        }),
      ]);
      throwIfAnyRejected(
        [...useResults, ...cleanupResults],
        'API credential use and cleanup failed'
      );

      // The dependent samlAuth cleanup can now proceed after credential cleanup.
    },
    { scope: 'worker' },
  ],
});
