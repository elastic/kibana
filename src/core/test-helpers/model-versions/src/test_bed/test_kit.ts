/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import fs from 'fs/promises';
import { defaultsDeep } from 'lodash';
import { BehaviorSubject, firstValueFrom, map } from 'rxjs';
import { ConfigService, Env, BuildFlavor } from '@kbn/config';
import { getEnvOptions } from '@kbn/config-mocks';
import { REPO_ROOT } from '@kbn/repo-info';
import { KibanaMigrator } from '@kbn/core-saved-objects-migration-server-internal';
import {
  SavedObjectConfig,
  type SavedObjectsConfigType,
  type SavedObjectsMigrationConfigType,
  type IndexTypesMap,
} from '@kbn/core-saved-objects-base-server-internal';
import { SavedObjectsRepository } from '@kbn/core-saved-objects-api-server-internal';
import {
  ElasticsearchConfig,
  type ElasticsearchConfigType,
  getCapabilitiesFromClient,
} from '@kbn/core-elasticsearch-server-internal';
import { AgentManager, configureClient } from '@kbn/core-elasticsearch-client-server-internal';
import { type LoggingConfigType, LoggingSystem } from '@kbn/core-logging-server-internal';
import { ISavedObjectTypeRegistry } from '@kbn/core-saved-objects-server';
import { esTestConfig, kibanaServerTestUser } from '@kbn/test';
import type { LoggerFactory } from '@kbn/logging';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { registerServiceConfig } from '@kbn/core-root-server-internal';
import { getDocLinks, getDocLinksMeta } from '@kbn/doc-links';
import type { DocLinksServiceStart } from '@kbn/core-doc-links-server';
import type { NodeRoles } from '@kbn/core-node-server';
import { getTypeRegistries } from './type_registry';
import type { ModelVersionTestkitOptions, ModelVersionTestKit } from './types';

const env = Env.createDefault(REPO_ROOT, getEnvOptions());
const currentVersion = env.packageInfo.version;
const currentBranch = env.packageInfo.branch;
const defaultKibanaIndex = '.kibana_migrator_tests';
const defaultNodeRoles: NodeRoles = { migrator: true, ui: true, backgroundTasks: true };

/**
 * Prepare the model version integration test kit
 *
 * @internal
 */
export const prepareModelVersionTestKit = async ({
  savedObjectDefinitions,
  objectsToCreateBetween = [],
  settingOverrides = {},
  kibanaBranch = currentBranch,
  kibanaVersion = currentVersion,
  kibanaIndex = defaultKibanaIndex,
  logFilePath,
}: ModelVersionTestkitOptions): Promise<ModelVersionTestKit> => {
  await fs.unlink(logFilePath).catch(() => {});

  const loggingSystem = new LoggingSystem();
  const loggerFactory = loggingSystem.asLoggerFactory();

  const configService = getConfigService(settingOverrides, loggerFactory, logFilePath);

  // configure logging system
  const loggingConf = await firstValueFrom(configService.atPath<LoggingConfigType>('logging'));
  await loggingSystem.upgrade(loggingConf);

  const esClient = await getElasticsearchClient(configService, loggerFactory, kibanaVersion);

  const { registryBefore, registryAfter } = getTypeRegistries({
    types: savedObjectDefinitions,
    kibanaIndex,
  });

  const commonMigratorParams = {
    configService,
    client: esClient,
    loggerFactory,
    kibanaIndex,
    defaultIndexTypesMap: {},
    hashToVersionMap: {},
    kibanaVersion,
    kibanaBranch,
    nodeRoles: defaultNodeRoles,
  };

  const firstMigrator = await getMigrator({
    ...commonMigratorParams,
    typeRegistry: registryBefore,
  });

  const secondMigrator = await getMigrator({
    ...commonMigratorParams,
    typeRegistry: registryAfter,
  });

  const repositoryBefore = SavedObjectsRepository.createRepository(
    firstMigrator,
    registryBefore,
    kibanaIndex,
    esClient,
    loggerFactory.get('saved_objects')
  );

  const repositoryAfter = SavedObjectsRepository.createRepository(
    secondMigrator,
    registryAfter,
    kibanaIndex,
    esClient,
    loggerFactory.get('saved_objects')
  );

  await runMigrations(firstMigrator);

  if (objectsToCreateBetween.length) {
    await repositoryBefore.bulkCreate(objectsToCreateBetween, { refresh: 'wait_for' });
  }

  await runMigrations(secondMigrator);

  const tearDown = async () => {
    await esClient.indices.delete({ index: `${kibanaIndex}_*`, allow_no_indices: true });
  };

  return {
    esClient,
    repositoryBefore,
    repositoryAfter,
    tearDown,
  };
};

const getConfigService = (
  settings: Record<string, any>,
  loggerFactory: LoggerFactory,
  logFilePath: string
) => {
  // Define some basic default kibana settings
  const DEFAULTS_SETTINGS = {
    server: {
      autoListen: true,
      // Use the ephemeral port to make sure that tests use the first available
      // port and aren't affected by the timing issues in test environment.
      port: 0,
      xsrf: { disableProtection: true },
    },
    elasticsearch: {
      hosts: [esTestConfig.getUrl()],
      username: kibanaServerTestUser.username,
      password: kibanaServerTestUser.password,
    },
    migrations: {
      algorithm: 'v2',
      skip: false,
    },
    logging: {
      appenders: {
        file: {
          type: 'file',
          fileName: logFilePath,
          layout: {
            type: 'json',
          },
        },
      },
      loggers: [
        {
          name: 'root',
          level: 'info',
          appenders: ['file'],
        },
      ],
    },
    plugins: {},
  };

  const rawConfigProvider = {
    getConfig$: () => new BehaviorSubject(defaultsDeep({}, settings, DEFAULTS_SETTINGS)),
  };

  const configService = new ConfigService(rawConfigProvider, env, loggerFactory);
  registerServiceConfig(configService);
  return configService;
};

const getElasticsearchClient = async (
  configService: ConfigService,
  loggerFactory: LoggerFactory,
  kibanaVersion: string
) => {
  const esClientConfig = await firstValueFrom(
    configService
      .atPath<ElasticsearchConfigType>('elasticsearch')
      .pipe(map((rawConfig) => new ElasticsearchConfig(rawConfig)))
  );

  return configureClient(esClientConfig, {
    logger: loggerFactory.get('elasticsearch'),
    type: 'data',
    agentFactoryProvider: new AgentManager(
      loggerFactory.get('elasticsearch-service', 'agent-manager'),
      { dnsCacheTtlInSeconds: esClientConfig.dnsCacheTtl?.asSeconds() ?? 0 }
    ),
    kibanaVersion,
  });
};

const getMigrator = async ({
  configService,
  client,
  kibanaIndex,
  typeRegistry,
  defaultIndexTypesMap,
  hashToVersionMap,
  loggerFactory,
  kibanaVersion,
  kibanaBranch,
  buildFlavor = 'traditional',
  nodeRoles,
}: {
  configService: ConfigService;
  client: ElasticsearchClient;
  kibanaIndex: string;
  typeRegistry: ISavedObjectTypeRegistry;
  defaultIndexTypesMap: IndexTypesMap;
  hashToVersionMap: Record<string, string>;
  loggerFactory: LoggerFactory;
  kibanaVersion: string;
  kibanaBranch: string;
  buildFlavor?: BuildFlavor;
  nodeRoles: NodeRoles;
}) => {
  const savedObjectsConf = await firstValueFrom(
    configService.atPath<SavedObjectsConfigType>('savedObjects')
  );
  const savedObjectsMigrationConf = await firstValueFrom(
    configService.atPath<SavedObjectsMigrationConfigType>('migrations')
  );
  const soConfig = new SavedObjectConfig(savedObjectsConf, savedObjectsMigrationConf);

  const docLinks: DocLinksServiceStart = {
    ...getDocLinksMeta({ kibanaBranch, buildFlavor }),
    links: getDocLinks({ kibanaBranch, buildFlavor }),
  };

  const esCapabilities = await getCapabilitiesFromClient(client);

  return new KibanaMigrator({
    client,
    kibanaIndex,
    typeRegistry,
    defaultIndexTypesMap,
    hashToVersionMap,
    soMigrationsConfig: soConfig.migration,
    kibanaVersion,
    logger: loggerFactory.get('savedobjects-service'),
    docLinks,
    waitForMigrationCompletion: false, // ensure we have an active role in the migration
    nodeRoles,
    esCapabilities,
  });
};

const runMigrations = async (migrator: KibanaMigrator) => {
  migrator.prepareMigrations();
  await migrator.runMigrations();
};
