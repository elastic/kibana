/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
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
import type { RunV2MigrationOpts } from './run_v2_migration';
import { runV2Migration } from './run_v2_migration';
import { DocumentMigrator } from './document_migrator';
import { ALLOWED_CONVERT_VERSION } from './kibana_migrator_constants';
import { buildTypesMappings, createIndexMap } from './core';
import { runResilientMigrator } from './run_resilient_migrator';
import {
  hashToVersionMapMock,
  savedObjectTypeRegistryMock,
} from './run_resilient_migrator.fixtures';
import { getIndexDetails } from './core/get_index_details';

jest.mock('./core', () => {
  const actual = jest.requireActual('./core');
  return {
    ...actual,
    createIndexMap: jest.fn(actual.createIndexMap),
  };
});

jest.mock('./core/get_index_details', () => {
  const actual = jest.requireActual('./core/get_index_details');
  return {
    ...actual,
    getIndexDetails: jest.fn(() =>
      Promise.resolve({
        mappings: {},
        aliases: ['.my_index', '.my_index_9.1.0'],
      })
    ),
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
const mockRunResilientMigrator = runResilientMigrator as jest.MockedFunction<
  typeof runResilientMigrator
>;

const mockGetIndexDetails = getIndexDetails as jest.MockedFunction<typeof getIndexDetails>;

describe('runV2Migration', () => {
  beforeEach(() => {
    mockCreateIndexMap.mockClear();
    mockRunResilientMigrator.mockClear();
  });

  it('rejects if prepare migrations has not been called on the documentMigrator', async () => {
    const options = mockOptions();
    await expect(runV2Migration(options)).rejects.toEqual(
      new Error('Migrations are not ready. Make sure prepareMigrations is called first.')
    );
  });

  it('executes normally if the .kibana index does not exist', async () => {
    mockGetIndexDetails.mockRejectedValueOnce({
      meta: {
        statusCode: 404,
      },
    });
    const options = mockOptions();
    options.documentMigrator.prepareMigrations();
    await runV2Migration(options);
  });

  it('rejects if it detects we are upgrading from a version <8.18.0', async () => {
    mockGetIndexDetails.mockResolvedValueOnce({
      mappings: {},
      aliases: ['.kibana', '.kibana_8.17.0'],
    });
    const options = mockOptions('9.1.0');
    options.documentMigrator.prepareMigrations();
    await expect(runV2Migration(options)).rejects.toEqual(
      new Error(
        'Kibana 8.17.0 deployment detected. Please upgrade to Kibana 8.18.0 or newer before upgrading to 9.x series.'
      )
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
      })
    );
    expect(runResilientMigrator).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        ...runResilientMigratorCommonParams,
        indexPrefix: '.other_index',
      })
    );
    expect(runResilientMigrator).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        ...runResilientMigratorCommonParams,
        indexPrefix: '.task_index',
      })
    );
  });

  it('awaits on all runResilientMigrator promises, and resolves with the results of each of them', async () => {
    let resolveMyIndex: (value: MigrationResult) => void;
    let resolveOtherIndex: (value: MigrationResult) => void;
    let resolveTaskIndex: (value: MigrationResult) => void;

    const myIndexPromise = new Promise<MigrationResult>((resolve) => {
      resolveMyIndex = resolve;
    });
    const otherIndexPromise = new Promise<MigrationResult>((resolve) => {
      resolveOtherIndex = resolve;
    });
    const taskIndexPromise = new Promise<MigrationResult>((resolve) => {
      resolveTaskIndex = resolve;
    });

    let migrationResults: MigrationResult[] | undefined;

    mockRunResilientMigrator.mockReturnValueOnce(myIndexPromise);
    mockRunResilientMigrator.mockReturnValueOnce(otherIndexPromise);
    mockRunResilientMigrator.mockReturnValueOnce(taskIndexPromise);
    const options = mockOptions();
    options.documentMigrator.prepareMigrations();

    runV2Migration(options).then((results) => (migrationResults = results));
    await nextTick();
    expect(migrationResults).toBeUndefined();
    resolveMyIndex!(V2_SUCCESSFUL_MIGRATION_RESULT[0]);
    resolveOtherIndex!(V2_SUCCESSFUL_MIGRATION_RESULT[1]);
    await nextTick();
    expect(migrationResults).toBeUndefined();
    resolveTaskIndex!(V2_SUCCESSFUL_MIGRATION_RESULT[2]);
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
      useCumulativeLogger: false,
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
    kibanaVersionCheck: '8.18.0',
    meter: { record: jest.fn() },
  };
};
