/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { SYSTEM_INDICES_SUPERUSER, SYSTEM_INDICES_SUPERUSER_PASSWORD } from '@kbn/es';
import { createEsClientForTesting } from '@kbn/test-es-server';
import { coreWorkerFixtures } from './core_fixtures';
import type { EsClient, ScoutTestConfig, ScoutLogger } from './core_fixtures';

/**
 * Restricted system indices need this header on top of `allow_restricted_indices`.
 * Elasticsearch rejects the request without it, so `systemIndicesEsClient` sends it
 * on every request. The constant is exported for callers that build their own clients.
 */
export const SYSTEM_INDICES_HEADERS = {
  'x-elastic-product-origin': 'kibana',
} as const;

const SYSTEM_INDICES_SUPERUSER_ROLE = 'system_indices_superuser';

const systemIndicesSuperuser = {
  username: SYSTEM_INDICES_SUPERUSER,
  password: SYSTEM_INDICES_SUPERUSER_PASSWORD,
};

export interface SystemIndicesEsClientFixture {
  /**
   * `false` on Cloud serverless (MKI), where `system_indices_superuser` does not exist
   * and cannot be provisioned. Suites that also run there must branch on this instead
   * of calling `getClient`.
   */
  readonly isAvailable: boolean;
  /**
   * Provisions the account on first call (once per worker) and resolves to a client
   * that already carries `SYSTEM_INDICES_HEADERS`. Throws when `isAvailable` is `false`.
   */
  getClient: () => Promise<EsClient>;
}

/**
 * `system_indices_superuser` is a file-realm account that `@kbn/es` bind-mounts into
 * locally-managed serverless clusters. Stateful clusters get the role definition but no
 * account, so create both there. Both calls are idempotent.
 */
const provisionSystemIndicesEsClient = async (
  esClient: EsClient,
  config: ScoutTestConfig
): Promise<EsClient> => {
  if (!config.serverless) {
    await esClient.security.putRole({
      name: SYSTEM_INDICES_SUPERUSER_ROLE,
      refresh: 'wait_for',
      cluster: ['all'],
      indices: [{ names: ['*'], privileges: ['all'], allow_restricted_indices: true }],
      applications: [{ application: '*', privileges: ['*'], resources: ['*'] }],
      run_as: ['*'],
    });

    await esClient.security.putUser({
      username: systemIndicesSuperuser.username,
      refresh: 'wait_for',
      password: systemIndicesSuperuser.password,
      roles: [SYSTEM_INDICES_SUPERUSER_ROLE],
    });
  }

  return createEsClientForTesting({
    esUrl: config.hosts.elasticsearch,
    authOverride: systemIndicesSuperuser,
    isCloud: config.isCloud,
  });
};

export const createSystemIndicesEsClientFixture = (
  esClient: EsClient,
  config: ScoutTestConfig,
  log: ScoutLogger
) => {
  const isAvailable = !(config.isCloud && config.serverless);
  let provisioned: Promise<EsClient> | undefined;

  const fixture: SystemIndicesEsClientFixture = {
    isAvailable,
    getClient: async () => {
      if (!isAvailable) {
        throw new Error(
          `'systemIndicesEsClient' is unavailable on Cloud serverless: the '${SYSTEM_INDICES_SUPERUSER}' file-realm account only exists on locally-managed clusters. Restrict the suite to local targets, or branch on 'systemIndicesEsClient.isAvailable'.`
        );
      }

      if (!provisioned) {
        provisioned = provisionSystemIndicesEsClient(esClient, config);
        log.serviceLoaded('systemIndicesEsClient');
      }

      const client = await provisioned;
      return client.child({ headers: SYSTEM_INDICES_HEADERS });
    },
  };

  return {
    fixture,
    // The child clients above share the parent's connection pool, so closing the parent
    // releases every one of them.
    teardown: async () => {
      if (!provisioned) {
        return;
      }

      // A provisioning failure has already surfaced through `getClient`, so swallow it
      // here rather than masking the test failure it caused.
      await provisioned.then(
        (client) => client.close(),
        () => undefined
      );
    },
  };
};

/**
 * Elasticsearch client authenticated as `system_indices_superuser`, for tests that have to
 * read or write restricted system indices such as `.kibana` directly. Scout's default
 * `esClient` authenticates as `elastic`, whose `superuser` role stops at restricted indices.
 *
 * Reads through Kibana's HTTP APIs are almost always the better option. Reach for this
 * only for state those APIs cannot produce or observe.
 */
export const systemIndicesEsClientFixture = coreWorkerFixtures.extend<
  {},
  { systemIndicesEsClient: SystemIndicesEsClientFixture }
>({
  systemIndicesEsClient: [
    async ({ config, esClient, log }, use) => {
      const { fixture, teardown } = createSystemIndicesEsClientFixture(esClient, config, log);

      await use(fixture);
      await teardown();
    },
    { scope: 'worker' },
  ],
});
