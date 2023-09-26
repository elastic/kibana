/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Path from 'path';
import fs from 'fs/promises';
import { SemVer } from 'semver';

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
  type IKibanaMigrator,
  type MigrationResult,
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

import {
  ALL_SAVED_OBJECT_INDICES,
  ISavedObjectTypeRegistry,
  SavedObjectsType,
} from '@kbn/core-saved-objects-server';
import { esTestConfig, kibanaServerTestUser } from '@kbn/test';
import type { LoggerFactory } from '@kbn/logging';
import { createRootWithCorePlugins, createTestServers } from '@kbn/core-test-helpers-kbn-server';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { registerServiceConfig } from '@kbn/core-root-server-internal';
import type { ISavedObjectsRepository } from '@kbn/core-saved-objects-api-server';
import { getDocLinks, getDocLinksMeta } from '@kbn/doc-links';
import type { DocLinksServiceStart } from '@kbn/core-doc-links-server';
import type { NodeRoles } from '@kbn/core-node-server';
import { baselineDocuments, baselineTypes } from './kibana_migrator_test_kit.fixtures';
import { delay } from './test_utils';
import type { ElasticsearchClientWrapperFactory } from './elasticsearch_client_wrapper';

export const defaultLogFilePath = Path.join(__dirname, 'kibana_migrator_test_kit.log');

const env = Env.createDefault(REPO_ROOT, getEnvOptions());
// Extract current stack version from Env, to use as a default
export const currentVersion = env.packageInfo.version;
export const nextMinor = new SemVer(currentVersion).inc('minor').format();
export const currentBranch = env.packageInfo.branch;
export const defaultKibanaIndex = '.kibana_migrator_tests';
export const defaultNodeRoles: NodeRoles = { migrator: true, ui: true, backgroundTasks: true };

export interface GetEsClientParams {
  settings?: Record<string, any>;
  kibanaVersion?: string;
  logFilePath?: string;
}

export interface KibanaMigratorTestKitParams {
  kibanaIndex?: string;
  kibanaVersion?: string;
  kibanaBranch?: string;
  nodeRoles?: NodeRoles;
  settings?: Record<string, any>;
  types?: Array<SavedObjectsType<any>>;
  defaultIndexTypesMap?: IndexTypesMap;
  logFilePath?: string;
  clientWrapperFactory?: ElasticsearchClientWrapperFactory;
}

export interface KibanaMigratorTestKit {
  client: ElasticsearchClient;
  migrator: IKibanaMigrator;
  runMigrations: () => Promise<MigrationResult[]>;
  typeRegistry: ISavedObjectTypeRegistry;
  savedObjectsRepository: ISavedObjectsRepository;
}

export const startElasticsearch = async ({
  basePath,
  dataArchive,
  timeout,
}: {
  basePath?: string;
  dataArchive?: string;
  timeout?: number;
} = {}) => {
  const { startES } = createTestServers({
    adjustTimeout: (t: number) => jest.setTimeout(t + (timeout ?? 0)),
    settings: {
      es: {
        license: 'basic',
        basePath,
        dataArchive,
      },
    },
  });
  return await startES();
};

export const getEsClient = async ({
  settings = {},
  kibanaVersion = currentVersion,
  logFilePath = defaultLogFilePath,
}: GetEsClientParams = {}) => {
  const loggingSystem = new LoggingSystem();
  const loggerFactory = loggingSystem.asLoggerFactory();

  const configService = getConfigService(settings, loggerFactory, logFilePath);

  // configure logging system
  const loggingConf = await firstValueFrom(configService.atPath<LoggingConfigType>('logging'));
  loggingSystem.upgrade(loggingConf);

  return await getElasticsearchClient(configService, loggerFactory, kibanaVersion);
};

export const getKibanaMigratorTestKit = async ({
  settings = {},
  kibanaIndex = defaultKibanaIndex,
  defaultIndexTypesMap = {}, // do NOT assume any types are stored in any index by default
  kibanaVersion = currentVersion,
  kibanaBranch = currentBranch,
  types = [],
  logFilePath = defaultLogFilePath,
  nodeRoles = defaultNodeRoles,
  clientWrapperFactory,
}: KibanaMigratorTestKitParams = {}): Promise<KibanaMigratorTestKit> => {
  let hasRun = false;
  const loggingSystem = new LoggingSystem();
  const loggerFactory = loggingSystem.asLoggerFactory();

  const configService = getConfigService(settings, loggerFactory, logFilePath);

  // configure logging system
  const loggingConf = await firstValueFrom(configService.atPath<LoggingConfigType>('logging'));
  loggingSystem.upgrade(loggingConf);

  const rawClient = await getElasticsearchClient(configService, loggerFactory, kibanaVersion);
  const client = clientWrapperFactory ? clientWrapperFactory(rawClient) : rawClient;

  const typeRegistry = new SavedObjectTypeRegistry();

  // types must be registered before instantiating the migrator
  registerTypes(typeRegistry, types);

  const migrator = await getMigrator({
    configService,
    client,
    typeRegistry,
    loggerFactory,
    kibanaIndex,
    defaultIndexTypesMap,
    kibanaVersion,
    kibanaBranch,
    nodeRoles,
  });

  const runMigrations = async () => {
    if (hasRun) {
      throw new Error('The test kit migrator can only be run once. Please instantiate it again.');
    }
    hasRun = true;
    migrator.prepareMigrations();
    try {
      return await migrator.runMigrations();
    } finally {
      await loggingSystem.stop();
    }
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
    agentFactoryProvider: new AgentManager(
      loggerFactory.get('elasticsearch-service', 'agent-manager')
    ),
    kibanaVersion,
  });
};

interface GetMigratorParams {
  configService: ConfigService;
  client: ElasticsearchClient;
  kibanaIndex: string;
  typeRegistry: ISavedObjectTypeRegistry;
  defaultIndexTypesMap: IndexTypesMap;
  loggerFactory: LoggerFactory;
  kibanaVersion: string;
  kibanaBranch: string;
  nodeRoles: NodeRoles;
}

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
}: GetMigratorParams) => {
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

export const getAggregatedTypesCount = async (
  client: ElasticsearchClient,
  index: string
): Promise<Record<string, number> | undefined> => {
  try {
    await client.indices.refresh({ index });
    const response = await client.search<unknown, { typesAggregation: { buckets: any[] } }>({
      index,
      _source: false,
      aggs: {
        typesAggregation: {
          terms: {
            // assign type __UNKNOWN__ to those documents that don't define one
            missing: '__UNKNOWN__',
            field: 'type',
            size: 100,
          },
          aggs: {
            docs: {
              top_hits: {
                size: 10,
                _source: {
                  excludes: ['*'],
                },
              },
            },
          },
        },
      },
    });

    return (response.aggregations!.typesAggregation.buckets as unknown as any).reduce(
      (acc: any, current: any) => {
        acc[current.key] = current.doc_count;
        return acc;
      },
      {}
    );
  } catch (error) {
    if (error.meta?.statusCode === 404) {
      return undefined;
    }
    throw error;
  }
};

export const getAggregatedTypesCountAllIndices = async (esClient: ElasticsearchClient) => {
  const typeBreakdown = await Promise.all(
    ALL_SAVED_OBJECT_INDICES.map((index) => getAggregatedTypesCount(esClient, index))
  );

  return ALL_SAVED_OBJECT_INDICES.reduce<Record<string, Record<string, number> | undefined>>(
    (acc, index, pos) => {
      acc[index] = typeBreakdown[pos];
      return acc;
    },
    {}
  );
};

const registerTypes = (
  typeRegistry: SavedObjectTypeRegistry,
  types?: Array<SavedObjectsType<any>>
) => {
  (types || []).forEach((type) => typeRegistry.registerType(type));
};

export const createBaseline = async () => {
  const { client, runMigrations, savedObjectsRepository } = await getKibanaMigratorTestKit({
    kibanaIndex: defaultKibanaIndex,
    types: baselineTypes,
  });

  // remove the testing index (current and next minor)
  await client.indices.delete({
    index: [
      defaultKibanaIndex,
      `${defaultKibanaIndex}_${currentVersion}_001`,
      `${defaultKibanaIndex}_${nextMinor}_001`,
    ],
    ignore_unavailable: true,
  });

  await runMigrations();

  await savedObjectsRepository.bulkCreate(baselineDocuments, {
    refresh: 'wait_for',
  });

  return client;
};

interface GetMutatedMigratorParams {
  kibanaVersion?: string;
  settings?: Record<string, any>;
}

export const getIdenticalMappingsMigrator = async ({
  kibanaVersion = nextMinor,
  settings = {},
}: GetMutatedMigratorParams = {}) => {
  return await getKibanaMigratorTestKit({
    types: baselineTypes,
    kibanaVersion,
    settings,
  });
};

export const getNonDeprecatedMappingsMigrator = async ({
  kibanaVersion = nextMinor,
  settings = {},
}: GetMutatedMigratorParams = {}) => {
  return await getKibanaMigratorTestKit({
    types: baselineTypes.filter((type) => type.name !== 'deprecated'),
    kibanaVersion,
    settings,
  });
};

export const getCompatibleMappingsMigrator = async ({
  filterDeprecated = false,
  kibanaVersion = nextMinor,
  settings = {},
}: GetMutatedMigratorParams & {
  filterDeprecated?: boolean;
} = {}) => {
  const types = baselineTypes
    .filter((type) => !filterDeprecated || type.name !== 'deprecated')
    .map<SavedObjectsType>((type) => {
      if (type.name === 'complex') {
        return {
          ...type,
          mappings: {
            properties: {
              name: { type: 'text' },
              value: { type: 'integer' },
              createdAt: { type: 'date' },
            },
          },
        };
      } else {
        return type;
      }
    });

  return await getKibanaMigratorTestKit({
    types,
    kibanaVersion,
    settings,
  });
};

export const getIncompatibleMappingsMigrator = async ({
  kibanaVersion = nextMinor,
  settings = {},
}: GetMutatedMigratorParams = {}) => {
  const types = baselineTypes.map<SavedObjectsType>((type) => {
    if (type.name === 'complex') {
      return {
        ...type,
        mappings: {
          properties: {
            name: { type: 'keyword' },
            value: { type: 'long' },
            createdAt: { type: 'date' },
          },
        },
      };
    } else {
      return type;
    }
  });

  return await getKibanaMigratorTestKit({
    types,
    kibanaVersion,
    settings,
  });
};

export const getCurrentVersionTypeRegistry = async ({
  oss,
}: {
  oss: boolean;
}): Promise<ISavedObjectTypeRegistry> => {
  const root = createRootWithCorePlugins({}, { oss });
  await root.preboot();
  const coreSetup = await root.setup();
  const typeRegistry = coreSetup.savedObjects.getTypeRegistry();
  root.shutdown(); // do not await for it, or we might block the tests
  return typeRegistry;
};

export const overrideTypeRegistry = (
  typeRegistry: ISavedObjectTypeRegistry,
  transform: (type: SavedObjectsType<any>) => SavedObjectsType<any>
): ISavedObjectTypeRegistry => {
  const updatedTypeRegistry = new SavedObjectTypeRegistry();
  typeRegistry.getAllTypes().forEach((type) => updatedTypeRegistry.registerType(transform(type)));
  return updatedTypeRegistry;
};

export const readLog = async (logFilePath: string = defaultLogFilePath): Promise<string> => {
  await delay(0.1);
  return await fs.readFile(logFilePath, 'utf-8');
};

export const clearLog = async (logFilePath: string = defaultLogFilePath): Promise<void> => {
  await fs.truncate(logFilePath).catch(() => {});
};
