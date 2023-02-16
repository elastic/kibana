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
import { REPO_ROOT } from '@kbn/repo-info';
import { KibanaMigrator } from '@kbn/core-saved-objects-migration-server-internal';

import {
  SavedObjectConfig,
  type SavedObjectsConfigType,
  type SavedObjectsMigrationConfigType,
  SavedObjectTypeRegistry,
  IKibanaMigrator,
  MigrationResult,
} from '@kbn/core-saved-objects-base-server-internal';
import { SavedObjectsRepository } from '@kbn/core-saved-objects-api-server-internal';
import {
  ElasticsearchConfig,
  type ElasticsearchConfigType,
} from '@kbn/core-elasticsearch-server-internal';
import { AgentManager, configureClient } from '@kbn/core-elasticsearch-client-server-internal';
import { type LoggingConfigType, LoggingSystem } from '@kbn/core-logging-server-internal';

import type { ISavedObjectTypeRegistry, SavedObjectsType } from '@kbn/core-saved-objects-server';
import { esTestConfig, kibanaServerTestUser } from '@kbn/test';
import { LoggerFactory } from '@kbn/logging';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { registerServiceConfig } from '@kbn/core-root-server-internal';
import { ISavedObjectsRepository } from '@kbn/core-saved-objects-api-server';
import { getDocLinks, getDocLinksMeta } from '@kbn/doc-links';
import { DocLinksServiceStart } from '@kbn/core-doc-links-server';

export const defaultLogFilePath = Path.join(__dirname, 'kibana_migrator_test_kit.log');

const env = Env.createDefault(REPO_ROOT, getEnvOptions());
// Extract current stack version from Env, to use as a default
const currentVersion = env.packageInfo.version;
const currentBranch = env.packageInfo.branch;

export interface KibanaMigratorTestKitParams {
  kibanaIndex?: string;
  kibanaVersion?: string;
  kibanaBranch?: string;
  settings?: Record<string, any>;
  types?: Array<SavedObjectsType<any>>;
  logFilePath?: string;
}

export interface KibanaMigratorTestKit {
  client: ElasticsearchClient;
  migrator: IKibanaMigrator;
  runMigrations: (rerun?: boolean) => Promise<MigrationResult[]>;
  typeRegistry: ISavedObjectTypeRegistry;
  savedObjectsRepository: ISavedObjectsRepository;
}

export const getKibanaMigratorTestKit = async ({
  settings = {},
  kibanaIndex = '.kibana',
  kibanaVersion = currentVersion,
  kibanaBranch = currentBranch,
  types = [],
  logFilePath = defaultLogFilePath,
}: KibanaMigratorTestKitParams = {}): Promise<KibanaMigratorTestKit> => {
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
    kibanaVersion,
    kibanaBranch
  );

  const runMigrations = async (rerun?: boolean) => {
    migrator.prepareMigrations();
    return await migrator.runMigrations({ rerun });
  };

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
    runMigrations,
    typeRegistry,
    savedObjectsRepository,
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
  kibanaVersion: string,
  kibanaBranch: string
) => {
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

  return new KibanaMigrator({
    client,
    typeRegistry,
    kibanaIndex,
    soMigrationsConfig: soConfig.migration,
    kibanaVersion,
    logger: loggerFactory.get('savedobjects-service'),
    docLinks,
    waitForMigrationCompletion: false, // ensure we have an active role in the migration
  });
};

const registerTypes = (
  typeRegistry: SavedObjectTypeRegistry,
  types?: Array<SavedObjectsType<any>>
) => {
  (types || []).forEach((type) => typeRegistry.registerType(type));
};
