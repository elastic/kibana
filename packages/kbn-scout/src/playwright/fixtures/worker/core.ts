/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { test as base } from '@playwright/test';

import { LoadActionPerfOptions } from '@kbn/es-archiver';
import {
  createKbnUrl,
  createEsArchiver,
  createEsClient,
  createKbnClient,
  createLogger,
  createSamlSessionManager,
  createScoutConfig,
} from '../../../common/services';
import { ScoutWorkerFixtures } from '../types/worker_scope';
import { ScoutTestOptions } from '../../types';

/**
 * The coreWorkerFixtures setup defines foundational fixtures that are essential
 * for running tests in the "kbn-scout" framework. These fixtures provide reusable,
 * scoped resources for each Playwright worker, ensuring that tests have consistent
 * and isolated access to critical services such as logging, configuration, and
 * clients for interacting with Kibana and Elasticsearch.
 */
export const coreWorkerFixtures = base.extend<{}, ScoutWorkerFixtures>({
  // Provides a scoped logger instance for each worker. This logger is shared across
  // all other fixtures within the worker scope.
  log: [
    ({}, use) => {
      use(createLogger());
    },
    { scope: 'worker' },
  ],

  /**
   * Loads the test server configuration from the source file based on local or cloud
   * target, located by default in '.scout/servers' directory. It supplies Playwright
   * with all server-related information including hosts, credentials, type of deployment, etc.
   */
  config: [
    ({ log }, use, testInfo) => {
      const configName = 'local';
      const projectUse = testInfo.project.use as ScoutTestOptions;
      const serversConfigDir = projectUse.serversConfigDir;
      const configInstance = createScoutConfig(serversConfigDir, configName, log);

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
      use(createEsClient(config, log));
    },
    { scope: 'worker' },
  ],

  /**
   * Creates a Kibana client, enabling API-level interactions with Kibana.
   */
  kbnClient: [
    ({ log, config }, use) => {
      use(createKbnClient(config, log));
    },
    { scope: 'worker' },
  ],

  /**
   * Provides utilities for managing test data in Elasticsearch. The "loadIfNeeded" method
   * optimizes test execution by loading data archives only if required, avoiding redundant
   * data ingestion.
   *
   * Note: In order to speedup test execution and avoid the overhead of deleting the data
   * we only expose capability to ingest the data indexes.
   */
  esArchiver: [
    ({ log, esClient, kbnClient }, use) => {
      const esArchiverInstance = createEsArchiver(esClient, kbnClient, log);
      const loadIfNeeded = async (name: string, performance?: LoadActionPerfOptions | undefined) =>
        esArchiverInstance!.loadIfNeeded(name, performance);

      use({ loadIfNeeded });
    },
    { scope: 'worker' },
  ],

  /**
   * Creates a SAML session manager, that handles authentication tasks for tests involving
   * SAML-based authentication.
   *
   * Note: In order to speedup execution of tests, we cache the session cookies for each role
   * after first call.
   */
  samlAuth: [
    ({ log, config }, use) => {
      use(createSamlSessionManager(config, log));
    },
    { scope: 'worker' },
  ],
});
