/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { test as base } from '@playwright/test';
import { KbnClient, SamlSessionManager } from '@kbn/test';
import { Client } from '@elastic/elasticsearch';
import {
  createKbnUrl,
  getEsClient,
  getKbnClient,
  createSamlSessionManager,
  createScoutConfig,
  KibanaUrl,
  getLogger,
  ScoutLogger,
  createElasticsearchCustomRole,
  createCustomRole,
  ElasticsearchRoleDescriptor,
  KibanaRole,
} from '../../../common/services';
import type { ScoutTestOptions } from '../../types';
import type { ScoutTestConfig } from '.';

// re-export to import types from '@kbn-scout'
export type { KbnClient, SamlSessionManager } from '@kbn/test';
export type { Client as EsClient } from '@elastic/elasticsearch';
export type { KibanaUrl } from '../../../common/services/kibana_url';
export type { ScoutTestConfig } from '../../../types';
export type { ScoutLogger } from '../../../common/services/logger';

export interface SamlAuth {
  session: SamlSessionManager;
  customRoleName: string;
  setCustomRole(role: KibanaRole | ElasticsearchRoleDescriptor): Promise<void>;
}

/**
 * The coreWorkerFixtures setup defines foundational fixtures that are essential
 * for running tests in the "kbn-scout" framework. These fixtures provide reusable,
 * scoped resources for each Playwright worker, ensuring that tests have consistent
 * and isolated access to critical services such as logging, configuration, and
 * clients for interacting with Kibana and Elasticsearch.
 */
export const coreWorkerFixtures = base.extend<
  {},
  {
    log: ScoutLogger;
    config: ScoutTestConfig;
    kbnUrl: KibanaUrl;
    esClient: Client;
    kbnClient: KbnClient;
    samlAuth: SamlAuth;
  }
>({
  // Provides a scoped logger instance for each worker to use in fixtures and tests.
  // For parallel workers logger context is matching worker index+1, e.g. '[scout-worker-1]', '[scout-worker-2]', etc.
  log: [
    ({}, use, workerInfo) => {
      const workersCount = workerInfo.config.workers;
      const loggerContext =
        workersCount === 1 ? 'scout-worker' : `scout-worker-${workerInfo.parallelIndex + 1}`;
      use(getLogger(loggerContext));
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
   * Creates a Kibana client, enabling API-level interactions with Kibana.
   */
  kbnClient: [
    ({ log, config }, use) => {
      use(getKbnClient(config, log));
    },
    { scope: 'worker' },
  ],

  /**
   * Creates a SAML session manager, that handles authentication tasks for tests involving
   * SAML-based authentication. Exposes a method to set a custom role for the session.
   *
   * Note: In order to speedup execution of tests, we cache the session cookies for each role
   * after first call.
   */
  samlAuth: [
    ({ log, config, esClient, kbnClient }, use, workerInfo) => {
      /**
       * When running tests against Cloud, ensure the `.ftr/role_users.json` file is populated with the required roles
       * and credentials. Each worker uses a unique custom role named `custom_role_worker_<index>`.
       * If running tests in parallel, make sure the file contains enough entries to accommodate all workers.
       * The file should be structured as follows:
       * {
       *   "custom_role_worker_1": { "username": ..., "password": ... },
       *   "custom_role_worker_2": { "username": ..., "password": ... },
       */
      const customRoleName = `custom_role_worker_${workerInfo.parallelIndex + 1}`;
      const session = createSamlSessionManager(config, log, customRoleName);
      let customRoleHash = '';

      const isCustomRoleSet = (roleHash: string) => roleHash === customRoleHash;

      const isElasticsearchRole = (role: any): role is ElasticsearchRoleDescriptor => {
        return 'applications' in role;
      };

      const setCustomRole = async (role: KibanaRole | ElasticsearchRoleDescriptor) => {
        const newRoleHash = JSON.stringify(role);

        if (isCustomRoleSet(newRoleHash)) {
          log.info(`Custom role is already set`);
          return;
        }

        if (isElasticsearchRole(role)) {
          await createElasticsearchCustomRole(esClient, customRoleName, role);
        } else {
          await createCustomRole(kbnClient, customRoleName, role);
        }

        customRoleHash = newRoleHash;
      };

      use({ session, customRoleName, setCustomRole });
    },
    { scope: 'worker' },
  ],
});
