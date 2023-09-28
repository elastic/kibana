/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { defaultsDeep } from 'lodash';
import { BehaviorSubject, firstValueFrom, map } from 'rxjs';
import { Client } from '@elastic/elasticsearch';
import { ConfigService, Env } from '@kbn/config';
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
import type { ISavedObjectsRepository } from '@kbn/core-saved-objects-api-server';
import { getDocLinks, getDocLinksMeta } from '@kbn/doc-links';
import type { DocLinksServiceStart } from '@kbn/core-doc-links-server';
import type { NodeRoles } from '@kbn/core-node-server';
import { getTypeRegistries, type SavedObjectTestkitDefinition } from './type_registry';

export interface ModelVersionTestkitOptions {
  savedObjectDefinitions: SavedObjectTestkitDefinition[];
  logFilePath: string;
  settingOverrides?: Record<string, any>;
  kibanaVersion?: string;
  kibanaBranch?: string;
  kibanaIndex?: string;
}

export interface ModelVersionTestKit {
  esClient: Client;
  repositoryBefore: ISavedObjectsRepository;
  repositoryAfter: ISavedObjectsRepository;
}

const env = Env.createDefault(REPO_ROOT, getEnvOptions());
const currentVersion = env.packageInfo.version;
const currentBranch = env.packageInfo.branch;
const defaultKibanaIndex = '.kibana_migrator_tests';
const defaultNodeRoles: NodeRoles = { migrator: true, ui: true, backgroundTasks: true };

export const prepareModelVersionTestKit = async ({
  savedObjectDefinitions,
  settingOverrides = {},
  kibanaBranch = currentBranch,
  kibanaVersion = currentVersion,
  kibanaIndex = defaultKibanaIndex,
  logFilePath,
}: ModelVersionTestkitOptions): Promise<ModelVersionTestKit> => {
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
  await runMigrations(secondMigrator);

  return {
    esClient,
    repositoryBefore,
    repositoryAfter,
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
    migrations: { skip: false },
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
      loggerFactory.get('elasticsearch-service', 'agent-manager')
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
  loggerFactory,
  kibanaVersion,
  kibanaBranch,
  nodeRoles,
}: {
  configService: ConfigService;
  client: ElasticsearchClient;
  kibanaIndex: string;
  typeRegistry: ISavedObjectTypeRegistry;
  defaultIndexTypesMap: IndexTypesMap;
  loggerFactory: LoggerFactory;
  kibanaVersion: string;
  kibanaBranch: string;
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
    ...getDocLinksMeta({ kibanaBranch }),
    links: getDocLinks({ kibanaBranch }),
  };

  const esCapabilities = await getCapabilitiesFromClient(client);

  return new KibanaMigrator({
    client,
    kibanaIndex,
    typeRegistry,
    defaultIndexTypesMap,
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
