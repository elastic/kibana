/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Path from 'path';
import { defaultsDeep } from 'lodash';
import { BehaviorSubject, firstValueFrom, map } from 'rxjs';
import { ConfigService, Env } from '@kbn/config';
import { getEnvOptions } from '@kbn/config-mocks';
import { getPackages } from '@kbn/repo-packages';
import { REPO_ROOT } from '@kbn/repo-info';
import { KibanaMigrator } from '@kbn/core-saved-objects-migration-server-internal';

import {
  SavedObjectConfig,
  type SavedObjectsConfigType,
  type SavedObjectsMigrationConfigType,
  SavedObjectTypeRegistry,
} from '@kbn/core-saved-objects-base-server-internal';
import { SavedObjectsRepository } from '@kbn/core-saved-objects-api-server-internal';
import {
  ElasticsearchConfig,
  type ElasticsearchConfigType,
} from '@kbn/core-elasticsearch-server-internal';
import { AgentManager, configureClient } from '@kbn/core-elasticsearch-client-server-internal';
import { type LoggingConfigType, LoggingSystem } from '@kbn/core-logging-server-internal';
import { docLinksServiceMock } from '@kbn/core-doc-links-server-mocks';

import type { ISavedObjectTypeRegistry, SavedObjectsType } from '@kbn/core-saved-objects-server';
import { esTestConfig, kibanaServerTestUser } from '@kbn/test';
import { LoggerFactory } from '@kbn/logging';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { registerServiceConfig } from '@kbn/core-root-server-internal';

export const defaultLogFilePath = Path.join(__dirname, 'kibana_migrator_test_kit.log');

// Extract current stack version from Env, to use as a default
const currentVersion = Env.createDefault(REPO_ROOT, getEnvOptions()).packageInfo.version;

export interface KibanaMigratorTestKitParams {
  kibanaIndex?: string;
  kibanaVersion?: string;
  settings?: Record<string, any>;
  types?: Array<SavedObjectsType<any>>;
  logFilePath?: string;
}

export const getKibanaMigratorTestKit = async ({
  settings = {},
  kibanaIndex = '.kibana',
  kibanaVersion = currentVersion,
  types = [],
  logFilePath = defaultLogFilePath,
}: KibanaMigratorTestKitParams = {}) => {
  const loggingSystem = new LoggingSystem();
  const loggerFactory = loggingSystem.asLoggerFactory();

  const configService = getConfigService(settings, loggerFactory, logFilePath);

  // configure logging system
  const loggingConf = await firstValueFrom(configService.atPath<LoggingConfigType>('logging'));
  loggingSystem.upgrade(loggingConf);

  const client = await getElasticsearchClient(configService, loggerFactory, kibanaVersion);

  const typeRegistry = new SavedObjectTypeRegistry();

  // types must be registered before instantiating the migrator
  registerTypes(typeRegistry, types);

  const migrator = await getMigrator(
    configService,
    client,
    typeRegistry,
    loggerFactory,
    kibanaIndex,
    kibanaVersion
  );

  const savedObjectsRepository = SavedObjectsRepository.createRepository(
    migrator,
    typeRegistry,
    kibanaIndex,
    client,
    loggerFactory.get('saved_objects')
  );

  return {
    client,
    migrator,
    typeRegistry,
    savedObjectsRepository,
    kibanaVersion,
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

  const env = Env.createDefault(REPO_ROOT, {
    configs: [],
    cliArgs: {
      dev: false,
      watch: false,
      basePath: false,
      runExamples: false,
      oss: true,
      disableOptimizer: true,
      cache: true,
      dist: false,
    },
    repoPackages: getPackages(REPO_ROOT),
  });

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
    agentFactoryProvider: new AgentManager(),
    kibanaVersion,
  });
};

const getMigrator = async (
  configService: ConfigService,
  client: ElasticsearchClient,
  typeRegistry: ISavedObjectTypeRegistry,
  loggerFactory: LoggerFactory,
  kibanaIndex: string,
  kibanaVersion: string
) => {
  const savedObjectsConf = await firstValueFrom(
    configService.atPath<SavedObjectsConfigType>('savedObjects')
  );
  const savedObjectsMigrationConf = await firstValueFrom(
    configService.atPath<SavedObjectsMigrationConfigType>('migrations')
  );
  const soConfig = new SavedObjectConfig(savedObjectsConf, savedObjectsMigrationConf);

  return new KibanaMigrator({
    client,
    typeRegistry,
    kibanaIndex,
    soMigrationsConfig: soConfig.migration,
    kibanaVersion,
    logger: loggerFactory.get('savedobjects-service'),
    docLinks: docLinksServiceMock.createStartContract(),
    waitForMigrationCompletion: false, // we want the migrator to actually migrate!
  });
};

const registerTypes = (
  typeRegistry: SavedObjectTypeRegistry,
  types?: Array<SavedObjectsType<any>>
) => {
  (types || []).forEach((type) => typeRegistry.registerType(type));
};
