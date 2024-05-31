/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import buffer from 'buffer';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import {
  type MigrationResult,
  SavedObjectsSerializer,
} from '@kbn/core-saved-objects-base-server-internal';
import { ByteSizeValue } from '@kbn/config-schema';
import { docLinksServiceMock } from '@kbn/core-doc-links-server-mocks';
import { runV2Migration, RunV2MigrationOpts } from './run_v2_migration';
import { DocumentMigrator } from './document_migrator';
import { ALLOWED_CONVERT_VERSION } from './kibana_migrator_constants';
import { buildTypesMappings, createIndexMap } from './core';
import {
  getIndicesInvolvedInRelocation,
  indexMapToIndexTypesMap,
  createWaitGroupMap,
  waitGroup,
} from './kibana_migrator_utils';
import { runResilientMigrator } from './run_resilient_migrator';
import {
  hashToVersionMapMock,
  indexTypesMapMock,
  savedObjectTypeRegistryMock,
} from './run_resilient_migrator.fixtures';

jest.mock('./core', () => {
  const actual = jest.requireActual('./core');
  return {
    ...actual,
    createIndexMap: jest.fn(actual.createIndexMap),
  };
});

jest.mock('./kibana_migrator_utils', () => {
  const actual = jest.requireActual('./kibana_migrator_utils');
  return {
    ...actual,
    indexMapToIndexTypesMap: jest.fn(actual.indexMapToIndexTypesMap),
    createWaitGroupMap: jest.fn(actual.createWaitGroupMap),
    getIndicesInvolvedInRelocation: jest.fn(() => Promise.resolve(['.my_index', '.other_index'])),
  };
});

const V2_SUCCESSFUL_MIGRATION_RESULT: MigrationResult[] = [
  {
    sourceIndex: '.my_index_pre8.2.3_001',
    destIndex: '.my_index_8.2.3_001',
    elapsedMs: 16,
    status: 'migrated',
  },
  {
    sourceIndex: '.other_index_pre8.2.3_001',
    destIndex: '.other_index_8.2.3_001',
    elapsedMs: 8,
    status: 'migrated',
  },
  {
    destIndex: '.task_index_8.2.3_001',
    elapsedMs: 4,
    status: 'patched',
  },
];

jest.mock('./run_resilient_migrator', () => {
  const actual = jest.requireActual('./run_resilient_migrator');
  return {
    ...actual,
    runResilientMigrator: jest.fn(() => Promise.resolve(V2_SUCCESSFUL_MIGRATION_RESULT)),
  };
});

const nextTick = () => new Promise((resolve) => setImmediate(resolve));
const mockCreateIndexMap = createIndexMap as jest.MockedFunction<typeof createIndexMap>;
const mockIndexMapToIndexTypesMap = indexMapToIndexTypesMap as jest.MockedFunction<
  typeof indexMapToIndexTypesMap
>;
const mockCreateWaitGroupMap = createWaitGroupMap as jest.MockedFunction<typeof createWaitGroupMap>;
const mockGetIndicesInvolvedInRelocation = getIndicesInvolvedInRelocation as jest.MockedFunction<
  typeof getIndicesInvolvedInRelocation
>;
const mockRunResilientMigrator = runResilientMigrator as jest.MockedFunction<
  typeof runResilientMigrator
>;

describe('runV2Migration', () => {
  beforeEach(() => {
    mockCreateIndexMap.mockClear();
    mockIndexMapToIndexTypesMap.mockClear();
    mockCreateWaitGroupMap.mockClear();
    mockGetIndicesInvolvedInRelocation.mockClear();
    mockRunResilientMigrator.mockClear();
  });

  it('rejects if prepare migrations has not been called on the documentMigrator', async () => {
    const options = mockOptions();
    await expect(runV2Migration(options)).rejects.toEqual(
      new Error('Migrations are not ready. Make sure prepareMigrations is called first.')
    );
  });

  it('calls createIndexMap with the right params', async () => {
    const options = mockOptions();
    options.documentMigrator.prepareMigrations();
    await runV2Migration(options);
    expect(createIndexMap).toBeCalledTimes(1);
    expect(createIndexMap).toBeCalledWith({
      kibanaIndexName: options.kibanaIndexPrefix,
      indexMap: options.mappingProperties,
      registry: options.typeRegistry,
    });
  });

  it('calls indexMapToIndexTypesMap with the result from createIndexMap', async () => {
    const options = mockOptions();
    options.documentMigrator.prepareMigrations();
    await runV2Migration(options);
    expect(indexMapToIndexTypesMap).toBeCalledTimes(1);
    expect(indexMapToIndexTypesMap).toBeCalledWith(mockCreateIndexMap.mock.results[0].value);
  });

  it('calls getIndicesInvolvedInRelocation with the right params', async () => {
    const options = mockOptions();
    options.documentMigrator.prepareMigrations();
    await runV2Migration(options);
    expect(getIndicesInvolvedInRelocation).toBeCalledTimes(1);
    expect(getIndicesInvolvedInRelocation).toBeCalledWith(
      expect.objectContaining({
        client: options.elasticsearchClient,
        indexTypesMap: mockIndexMapToIndexTypesMap.mock.results[0].value,
        logger: options.logger,
      })
    );
  });

  it('calls createMultiPromiseDefer, with the list of moving indices', async () => {
    const options = mockOptions();
    options.documentMigrator.prepareMigrations();
    await runV2Migration(options);
    expect(mockCreateWaitGroupMap).toBeCalledTimes(3);
    expect(mockCreateWaitGroupMap).toHaveBeenNthCalledWith(1, ['.my_index', '.other_index']);
    expect(mockCreateWaitGroupMap).toHaveBeenNthCalledWith(2, ['.my_index', '.other_index']);
    expect(mockCreateWaitGroupMap).toHaveBeenNthCalledWith(3, ['.my_index', '.other_index']);
  });

  it('calls runResilientMigrator for each migrator it must spawn', async () => {
    const options = mockOptions();
    options.documentMigrator.prepareMigrations();
    await runV2Migration(options);
    expect(runResilientMigrator).toHaveBeenCalledTimes(3);
    const runResilientMigratorCommonParams = {
      client: options.elasticsearchClient,
      kibanaVersion: options.kibanaVersion,
      logger: options.logger,
      migrationsConfig: options.migrationConfig,
      typeRegistry: options.typeRegistry,
    };
    expect(runResilientMigrator).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        ...runResilientMigratorCommonParams,
        indexPrefix: '.my_index',
        mustRelocateDocuments: true,
        readyToReindex: expect.any(Object),
        doneReindexing: expect.any(Object),
        updateRelocationAliases: expect.any(Object),
      })
    );
    expect(runResilientMigrator).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        ...runResilientMigratorCommonParams,
        indexPrefix: '.other_index',
        mustRelocateDocuments: true,
        readyToReindex: expect.any(Object),
        doneReindexing: expect.any(Object),
        updateRelocationAliases: expect.any(Object),
      })
    );
    expect(runResilientMigrator).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        ...runResilientMigratorCommonParams,
        indexPrefix: '.task_index',
        mustRelocateDocuments: false,
        readyToReindex: undefined,
        doneReindexing: undefined,
        updateRelocationAliases: undefined,
      })
    );
  });

  it('awaits on all runResilientMigrator promises, and resolves with the results of each of them', async () => {
    const myIndexMigratorDefer = waitGroup<MigrationResult>();
    const otherIndexMigratorDefer = waitGroup();
    const taskIndexMigratorDefer = waitGroup();
    let migrationResults: MigrationResult[] | undefined;

    mockRunResilientMigrator.mockReturnValueOnce(myIndexMigratorDefer.promise);
    mockRunResilientMigrator.mockReturnValueOnce(otherIndexMigratorDefer.promise);
    mockRunResilientMigrator.mockReturnValueOnce(taskIndexMigratorDefer.promise);
    const options = mockOptions();
    options.documentMigrator.prepareMigrations();

    runV2Migration(options).then((results) => (migrationResults = results));
    await nextTick();
    expect(migrationResults).toBeUndefined();
    myIndexMigratorDefer.resolve(V2_SUCCESSFUL_MIGRATION_RESULT[0]);
    otherIndexMigratorDefer.resolve(V2_SUCCESSFUL_MIGRATION_RESULT[1]);
    await nextTick();
    expect(migrationResults).toBeUndefined();
    taskIndexMigratorDefer.resolve(V2_SUCCESSFUL_MIGRATION_RESULT[2]);
    await nextTick();
    expect(migrationResults).toEqual(V2_SUCCESSFUL_MIGRATION_RESULT);
  });

  it('rejects if one of the runResilientMigrator promises rejects', async () => {
    mockRunResilientMigrator.mockResolvedValueOnce(V2_SUCCESSFUL_MIGRATION_RESULT[0]);
    mockRunResilientMigrator.mockResolvedValueOnce(V2_SUCCESSFUL_MIGRATION_RESULT[1]);
    const myTaskIndexMigratorError = new Error(
      'Something terrible and unexpected happened whilst tyring to migrate .task_index'
    );
    mockRunResilientMigrator.mockRejectedValueOnce(myTaskIndexMigratorError);
    const options = mockOptions();
    options.documentMigrator.prepareMigrations();

    await expect(runV2Migration(options)).rejects.toThrowError(myTaskIndexMigratorError);
  });
});

const mockOptions = (kibanaVersion = '8.2.3'): RunV2MigrationOpts => {
  const mockedClient = elasticsearchClientMock.createElasticsearchClient();
  (mockedClient as any).child = jest.fn().mockImplementation(() => mockedClient);

  const typeRegistry = savedObjectTypeRegistryMock;

  const logger = loggingSystemMock.create().get();

  return {
    logger,
    kibanaVersion,
    waitForMigrationCompletion: false,
    typeRegistry,
    kibanaIndexPrefix: '.my_index',
    defaultIndexTypesMap: indexTypesMapMock,
    hashToVersionMap: hashToVersionMapMock,
    migrationConfig: {
      algorithm: 'v2' as const,
      batchSize: 20,
      maxBatchSizeBytes: ByteSizeValue.parse('20mb'),
      maxReadBatchSizeBytes: new ByteSizeValue(buffer.constants.MAX_STRING_LENGTH),
      pollInterval: 20000,
      scrollDuration: '10m',
      skip: false,
      retryAttempts: 20,
      zdt: {
        metaPickupSyncDelaySec: 120,
        runOnRoles: ['migrator'],
      },
    },
    elasticsearchClient: mockedClient,
    docLinks: docLinksServiceMock.createSetupContract(),
    documentMigrator: new DocumentMigrator({
      kibanaVersion,
      convertVersion: ALLOWED_CONVERT_VERSION,
      typeRegistry,
      log: logger,
    }),
    serializer: new SavedObjectsSerializer(typeRegistry),
    mappingProperties: buildTypesMappings(typeRegistry.getAllTypes()),
    esCapabilities: elasticsearchServiceMock.createCapabilities(),
  };
};
