/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { test as base } from '@playwright/test';
import type { KbnClient } from '@kbn/kbn-client';
import type { Client } from '@elastic/elasticsearch';
import {
  createKbnUrl,
  getEsClient,
  getKbnClient,
  createScoutConfig,
  KibanaUrl,
} from '../../../../common/services';
import { ScoutLogger } from '../../../../common/services/logger';
import type { ScoutTestOptions } from '../../../types';
import type { ScoutTestConfig } from '.';

// re-export to import types from '@kbn-scout'
export type { KbnClient } from '@kbn/kbn-client';
export type { SamlSessionManager } from '@kbn/test-saml-auth';
export type { Client as EsClient } from '@elastic/elasticsearch';
export type { KibanaUrl } from '../../../../common/services/kibana_url';
export type { ScoutTestConfig } from '../../../../types';
export type { ScoutLogger } from '../../../../common/services/logger';

export interface CookieHeader {
  [Cookie: string]: string;
}

export interface RoleSessionCredentials {
  cookieValue: string;
  cookieHeader: CookieHeader;
}

export interface BaseWorkerFixtures {
  log: ScoutLogger;
  config: ScoutTestConfig;
  kbnUrl: KibanaUrl;
  esClient: Client;
  kbnClient: KbnClient;
  /**
   * `true` when the target Elasticsearch cluster is a SNAPSHOT build. SNAPSHOT
   * builds bundle test-only modules (e.g. the `shard_delay` aggregation) that
   * are unavailable in release builds. Use this to gate tests that rely on
   * those features:
   *
   * @example
   * test('uses shard_delay agg', async ({ esClient, isSnapshotBuild }) => {
   *   test.skip(!isSnapshotBuild, 'Requires shard_delay agg (SNAPSHOT only)');
   *   // ...
   * });
   */
  isSnapshotBuild: boolean;
}

/**
 * The coreWorkerFixtures setup defines foundational fixtures that are essential
 * for running tests in the "kbn-scout" framework. These fixtures provide reusable,
 * scoped resources for each Playwright worker, ensuring that tests have consistent
 * and isolated access to critical services such as logging, configuration, and
 * clients for interacting with Kibana and Elasticsearch.
 *
 * Note: `samlAuth` is added by the `samlAuthFixture` in `./saml_auth/index.ts`, which
 * extends this base. The combined fixture (with samlAuth) is what `worker/index.ts` exports.
 */
export const coreWorkerFixtures = base.extend<{}, BaseWorkerFixtures>({
  // Provides a scoped logger instance for each worker to use in fixtures and tests.
  // For parallel workers logger context is matching worker index+1, e.g. '[scout-worker-1]', '[scout-worker-2]', etc.
  log: [
    ({}, use, workerInfo) => {
      const workersCount = workerInfo.config.workers;
      const loggerContext =
        workersCount === 1 ? 'scout-worker' : `scout-worker-${workerInfo.parallelIndex + 1}`;
      // The log level is resolved inside the ScoutLogger constructor, which checks the argument,
      // then SCOUT_LOG_LEVEL, then LOG_LEVEL, and finally defaults to 'info'.
      use(new ScoutLogger(loggerContext));
    },
    { scope: 'worker' },
  ],
  /**
   * Loads the test server configuration from the source file based on local or cloud
   * target, located by default in '.scout/servers' directory. It supplies Playwright
   * with all server-related information including hosts, credentials, type of deployment, etc.
   */
  config: [
    ({ log }, use, workerInfo) => {
      const projectUse = workerInfo.project.use as ScoutTestOptions;
      if (!projectUse.configName) {
        throw new Error(
          `Failed to read the 'configName' property. Make sure to run tests with '--project' flag and target enviroment (local or cloud),
          e.g. 'npx playwright test --project local --config <path_to_Playwright.config.ts>'`
        );
      }
      const serversConfigDir = projectUse.serversConfigDir;
      const configInstance = createScoutConfig(serversConfigDir, projectUse.configName, log);

      log.info(
        `Running tests against ${
          configInstance.isCloud
            ? configInstance.serverless
              ? `MKI ${configInstance.projectType} project`
              : 'ECH deployment'
            : `local ${
                configInstance.serverless ? `serverless ${configInstance.projectType}` : 'stateful'
              } cluster`
        }`
      );

      use(configInstance);
    },
    { scope: 'worker' },
  ],

  /**
   * Generates and exposes a Kibana URL object based on the configuration, allowing tests
   * and fixtures to programmatically construct and validate URLs.
   */
  kbnUrl: [
    ({ config, log }, use) => {
      use(createKbnUrl(config, log));
    },
    { scope: 'worker' },
  ],

  /**
   * Instantiates an Elasticsearch client, enabling API-level interactions with ES.
   */
  esClient: [
    ({ config, log }, use) => {
      use(getEsClient(config, log));
    },
    { scope: 'worker' },
  ],

  /**
   * Resolves once per worker by calling `esClient.info()` and reporting whether
   * `version.number` contains the `SNAPSHOT` qualifier. Tests can `skip` based
   * on this flag when they depend on test-only ES modules that are bundled
   * only with SNAPSHOT builds.
   */
  isSnapshotBuild: [
    async ({ esClient, log }, use) => {
      const info = await esClient.info();
      const isSnapshot = info.version.number.includes('SNAPSHOT');
      log.debug(
        `[isSnapshotBuild] Elasticsearch version: ${info.version.number} -> isSnapshot=${isSnapshot}`
      );
      await use(isSnapshot);
    },
    { scope: 'worker' },
  ],

  /**
   * Creates a Kibana client, enabling API-level interactions with Kibana.
   */
  kbnClient: [
    ({ log, config }, use) => {
      use(getKbnClient(config, log));
    },
    { scope: 'worker' },
  ],
});
