/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { take } from 'rxjs/operators';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import type { SavedObjectsType } from '@kbn/core-saved-objects-server';
import { SavedObjectTypeRegistry } from '@kbn/core-saved-objects-base-server-internal';
import { type KibanaMigratorOptions, KibanaMigrator } from './kibana_migrator';
import { DocumentMigrator } from './document_migrator';
import { ByteSizeValue } from '@kbn/config-schema';
import { docLinksServiceMock } from '@kbn/core-doc-links-server-mocks';
import { lastValueFrom } from 'rxjs';
import * as runResilientMigratorModule from './run_resilient_migrator';
import { runResilientMigrator } from './run_resilient_migrator';

const mappingsResponseWithoutIndexTypesMap: estypes.IndicesGetMappingResponse = {
  '.kibana_8.7.0_001': {
    mappings: {
      _meta: {
        migrationMappingPropertyHashes: {
          references: '7997cf5a56cc02bdc9c93361bde732b0',
          // ...
        },
        // we do not add a `indexTypesMap`
        // simulating a Kibana < 8.8.0 that does not have one yet
      },
    },
  },
};

const createRegistry = (types: Array<Partial<SavedObjectsType>>) => {
  const registry = new SavedObjectTypeRegistry();
  types.forEach((type) =>
    registry.registerType({
      name: 'unknown',
      hidden: false,
      namespaceType: 'single',
      mappings: { properties: {} },
      migrations: {},
      ...type,
    })
  );
  return registry;
};

describe('KibanaMigrator', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    jest.spyOn(runResilientMigratorModule, 'runResilientMigrator');
  });
  describe('getActiveMappings', () => {
    it('returns full index mappings w/ core properties', () => {
      const options = mockOptions();
      options.typeRegistry = createRegistry([
        {
          name: 'amap',
          mappings: {
            properties: { field: { type: 'text' } },
          },
        },
        {
          name: 'bmap',
          indexPattern: '.other-index',
          mappings: {
            properties: { field: { type: 'text' } },
          },
        },
      ]);

      const mappings = new KibanaMigrator(options).getActiveMappings();
      expect(mappings).toMatchSnapshot();
    });
  });

  describe('migrateDocument', () => {
    it('throws an error if documentMigrator.prepareMigrations is not called previously', () => {
      const options = mockOptions();
      const kibanaMigrator = new KibanaMigrator(options);
      const doc = {} as any;
      expect(() => kibanaMigrator.migrateDocument(doc)).toThrowError(
        /Migrations are not ready. Make sure prepareMigrations is called first./i
      );
    });

    it('calls documentMigrator.migrate', () => {
      const options = mockOptions();
      const kibanaMigrator = new KibanaMigrator(options);
      jest.spyOn(DocumentMigrator.prototype, 'migrate').mockImplementation((doc) => doc);
      const doc = {} as any;

      expect(() => kibanaMigrator.migrateDocument(doc)).not.toThrowError();
      expect(DocumentMigrator.prototype.migrate).toBeCalledTimes(1);
    });
  });

  describe('runMigrations', () => {
    it('throws if prepareMigrations is not called first', async () => {
      const options = mockOptions();
      const migrator = new KibanaMigrator(options);

      await expect(migrator.runMigrations()).rejects.toThrowError(
        'Migrations are not ready. Make sure prepareMigrations is called first.'
      );
    });

    it('only runs migrations once if called multiple times', async () => {
      const successfulRun: typeof runResilientMigrator = ({ indexPrefix }) =>
        Promise.resolve({
          sourceIndex: indexPrefix,
          destIndex: indexPrefix,
          elapsedMs: 28,
          status: 'migrated',
        });
      const mockRunResilientMigrator = runResilientMigrator as jest.MockedFunction<
        typeof runResilientMigrator
      >;

      mockRunResilientMigrator.mockImplementationOnce(successfulRun);
      mockRunResilientMigrator.mockImplementationOnce(successfulRun);
      mockRunResilientMigrator.mockImplementationOnce(successfulRun);
      mockRunResilientMigrator.mockImplementationOnce(successfulRun);
      const options = mockOptions();
      options.client.indices.get.mockResponse({}, { statusCode: 200 });
      options.client.indices.getMapping.mockResponse(mappingsResponseWithoutIndexTypesMap, {
        statusCode: 200,
      });

      options.client.cluster.getSettings.mockResponse(
        {
          transient: {},
          persistent: {},
        },
        { statusCode: 404 }
      );
      const migrator = new KibanaMigrator(options);

      migrator.prepareMigrations();
      await migrator.runMigrations();
      await migrator.runMigrations();
      await migrator.runMigrations();

      // indices.get is called twice during a single migration
      expect(runResilientMigrator).toHaveBeenCalledTimes(4);
      expect(runResilientMigrator).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          indexPrefix: '.my-index',
          mustRelocateDocuments: true,
        })
      );
      expect(runResilientMigrator).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          indexPrefix: '.other-index',
          mustRelocateDocuments: true,
        })
      );
      expect(runResilientMigrator).toHaveBeenNthCalledWith(
        3,
        expect.objectContaining({
          indexPrefix: '.my-task-index',
          mustRelocateDocuments: false,
        })
      );
      expect(runResilientMigrator).toHaveBeenNthCalledWith(
        4,
        expect.objectContaining({
          indexPrefix: '.my-complementary-index',
          mustRelocateDocuments: true,
        })
      );
    });

    it('emits results on getMigratorResult$()', async () => {
      const options = mockV2MigrationOptions();
      options.client.indices.getMapping.mockResponse(mappingsResponseWithoutIndexTypesMap, {
        statusCode: 200,
      });
      const migrator = new KibanaMigrator(options);
      const migratorStatus = lastValueFrom(migrator.getStatus$().pipe(take(3)));
      migrator.prepareMigrations();
      await migrator.runMigrations();

      const { status, result } = await migratorStatus;
      expect(status).toEqual('completed');
      expect(result![0]).toMatchObject({
        destIndex: '.my-index_8.2.3_001',
        sourceIndex: '.my-index_pre8.2.3_001',
        elapsedMs: expect.any(Number),
        status: 'migrated',
      });
      expect(result![1]).toMatchObject({
        destIndex: '.other-index_8.2.3_001',
        elapsedMs: expect.any(Number),
        status: 'patched',
      });
    });
    it('rejects when the migration state machine terminates in a FATAL state', async () => {
      const options = mockV2MigrationOptions();
      options.client.indices.get.mockResponse(
        {
          '.my-index_8.2.4_001': {
            aliases: {
              '.my-index': {},
              '.my-index_8.2.4': {},
            },
            mappings: { properties: {}, _meta: { migrationMappingPropertyHashes: {} } },
            settings: {},
          },
        },
        { statusCode: 200 }
      );
      options.client.indices.getMapping.mockResponse(mappingsResponseWithoutIndexTypesMap, {
        statusCode: 200,
      });

      const migrator = new KibanaMigrator(options);
      migrator.prepareMigrations();
      return expect(migrator.runMigrations()).rejects.toMatchInlineSnapshot(
        `[Error: Unable to complete saved object migrations for the [.my-index] index: The .my-index alias is pointing to a newer version of Kibana: v8.2.4]`
      );
    });

    it('rejects when an unexpected exception occurs in an action', async () => {
      const options = mockV2MigrationOptions();
      options.client.tasks.get.mockResponse({
        completed: true,
        error: { type: 'elasticsearch_exception', reason: 'task failed with an error' },
        task: { description: 'task description' } as any,
      });
      options.client.indices.getMapping.mockResponse(mappingsResponseWithoutIndexTypesMap, {
        statusCode: 200,
      });

      const migrator = new KibanaMigrator(options);
      migrator.prepareMigrations();
      await expect(migrator.runMigrations()).rejects.toMatchInlineSnapshot(`
              [Error: Unable to complete saved object migrations for the [.my-index] index. Error: Reindex failed with the following error:
              {"_tag":"Some","value":{"type":"elasticsearch_exception","reason":"task failed with an error"}}]
            `);
      expect(loggingSystemMock.collect(options.logger).error[0][0]).toMatchInlineSnapshot(`
        [Error: Reindex failed with the following error:
        {"_tag":"Some","value":{"type":"elasticsearch_exception","reason":"task failed with an error"}}]
      `);
    });

    describe('for V2 migrations', () => {
      describe('where some SO types must be relocated', () => {
        it('runs successfully', async () => {
          const options = mockV2MigrationOptions();
          options.client.indices.getMapping.mockResponse(mappingsResponseWithoutIndexTypesMap, {
            statusCode: 200,
          });

          const migrator = new KibanaMigrator(options);
          migrator.prepareMigrations();
          const results = await migrator.runMigrations();

          expect(results.length).toEqual(4);
          expect(results[0]).toEqual(
            expect.objectContaining({
              sourceIndex: '.my-index_pre8.2.3_001',
              destIndex: '.my-index_8.2.3_001',
              elapsedMs: expect.any(Number),
              status: 'migrated',
            })
          );
          expect(results[1]).toEqual(
            expect.objectContaining({
              destIndex: '.other-index_8.2.3_001',
              elapsedMs: expect.any(Number),
              status: 'patched',
            })
          );
          expect(results[2]).toEqual(
            expect.objectContaining({
              destIndex: '.my-task-index_8.2.3_001',
              elapsedMs: expect.any(Number),
              status: 'patched',
            })
          );
          expect(results[3]).toEqual(
            expect.objectContaining({
              destIndex: '.my-complementary-index_8.2.3_001',
              elapsedMs: expect.any(Number),
              status: 'patched',
            })
          );

          expect(runResilientMigrator).toHaveBeenCalledTimes(4);
          expect(runResilientMigrator).toHaveBeenNthCalledWith(
            1,
            expect.objectContaining({
              kibanaVersion: '8.2.3',
              indexPrefix: '.my-index',
              indexTypesMap: {
                '.my-index': ['testtype', 'testtype3'],
                '.other-index': ['testtype2'],
                '.my-task-index': ['testtasktype'],
              },
              targetMappings: expect.objectContaining({
                properties: expect.objectContaining({
                  testtype: expect.anything(),
                  testtype3: expect.anything(),
                }),
              }),
              readyToReindex: expect.objectContaining({
                promise: expect.anything(),
                resolve: expect.anything(),
                reject: expect.anything(),
              }),
              mustRelocateDocuments: true,
              doneReindexing: expect.objectContaining({
                promise: expect.anything(),
                resolve: expect.anything(),
                reject: expect.anything(),
              }),
            })
          );
          expect(runResilientMigrator).toHaveBeenNthCalledWith(
            2,
            expect.objectContaining({
              kibanaVersion: '8.2.3',
              indexPrefix: '.other-index',
              indexTypesMap: {
                '.my-index': ['testtype', 'testtype3'],
                '.other-index': ['testtype2'],
                '.my-task-index': ['testtasktype'],
              },
              targetMappings: expect.objectContaining({
                properties: expect.objectContaining({
                  testtype2: expect.anything(),
                }),
              }),
              readyToReindex: expect.objectContaining({
                promise: expect.anything(),
                resolve: expect.anything(),
                reject: expect.anything(),
              }),
              mustRelocateDocuments: true,
              doneReindexing: expect.objectContaining({
                promise: expect.anything(),
                resolve: expect.anything(),
                reject: expect.anything(),
              }),
            })
          );
          expect(runResilientMigrator).toHaveBeenNthCalledWith(
            3,
            expect.objectContaining({
              kibanaVersion: '8.2.3',
              indexPrefix: '.my-task-index',
              indexTypesMap: {
                '.my-index': ['testtype', 'testtype3'],
                '.other-index': ['testtype2'],
                '.my-task-index': ['testtasktype'],
              },
              targetMappings: expect.objectContaining({
                properties: expect.objectContaining({
                  testtasktype: expect.anything(),
                }),
              }),
              // this migrator is NOT involved in any relocation,
              // thus, it must not synchronize with other migrators
              mustRelocateDocuments: false,
              readyToReindex: undefined,
              doneReindexing: undefined,
            })
          );
          expect(runResilientMigrator).toHaveBeenNthCalledWith(
            4,
            expect.objectContaining({
              kibanaVersion: '8.2.3',
              indexPrefix: '.my-complementary-index',
              indexTypesMap: {
                '.my-index': ['testtype', 'testtype3'],
                '.other-index': ['testtype2'],
                '.my-task-index': ['testtasktype'],
              },
              targetMappings: expect.objectContaining({
                properties: expect.not.objectContaining({
                  // this index does no longer have any types associated to it
                  testtype: expect.anything(),
                  testtype2: expect.anything(),
                  testtype3: expect.anything(),
                  testtasktype: expect.anything(),
                }),
              }),
              mustRelocateDocuments: true,
              doneReindexing: expect.objectContaining({
                promise: expect.anything(),
                resolve: expect.anything(),
                reject: expect.anything(),
              }),
            })
          );
        });
      });
    });
  });
});

type MockedOptions = KibanaMigratorOptions & {
  client: ReturnType<typeof elasticsearchClientMock.createElasticsearchClient>;
};

const mockV2MigrationOptions = () => {
  const options = mockOptions();
  options.client.cluster.getSettings.mockResponse(
    {
      transient: {},
      persistent: {},
    },
    { statusCode: 200 }
  );

  options.client.indices.get.mockResponse(
    {
      '.my-index': {
        aliases: { '.kibana': {} },
        mappings: { properties: {} },
        settings: {},
      },
    },
    { statusCode: 200 }
  );
  options.client.indices.addBlock.mockResponse({
    acknowledged: true,
    shards_acknowledged: true,
    indices: [],
  });
  options.client.reindex.mockResponse({
    taskId: 'reindex_task_id',
  } as estypes.ReindexResponse);
  options.client.tasks.get.mockResponse({
    completed: true,
    error: undefined,
    failures: [],
    task: { description: 'task description' } as any,
  } as estypes.TasksGetResponse);

  options.client.search.mockResponse({ hits: { hits: [] } } as any);

  options.client.openPointInTime.mockResponse({ id: 'pit_id' });

  options.client.closePointInTime.mockResponse({
    succeeded: true,
  } as estypes.ClosePointInTimeResponse);

  return options;
};

const mockOptions = () => {
  const mockedClient = elasticsearchClientMock.createElasticsearchClient();
  (mockedClient as any).child = jest.fn().mockImplementation(() => mockedClient);

  const options: MockedOptions = {
    logger: loggingSystemMock.create().get(),
    kibanaVersion: '8.2.3',
    waitForMigrationCompletion: false,
    defaultIndexTypesMap: {
      '.my-index': ['testtype', 'testtype2'],
      '.my-task-index': ['testtasktype'],
      // this index no longer has any types registered in typeRegistry
      // but we still need a migrator for it, so that 'testtype3' documents
      // are moved over to their new index (.my_index)
      '.my-complementary-index': ['testtype3'],
    },
    typeRegistry: createRegistry([
      // typeRegistry depicts an updated index map:
      //   .my-index: ['testtype', 'testtype3'],
      //   .my-other-index: ['testtype2'],
      //   .my-task-index': ['testtasktype'],
      {
        name: 'testtype',
        hidden: false,
        namespaceType: 'single',
        mappings: {
          properties: {
            name: { type: 'keyword' },
          },
        },
        migrations: { '8.2.3': jest.fn().mockImplementation((doc) => doc) },
      },
      {
        name: 'testtype2',
        hidden: false,
        namespaceType: 'single',
        // We are moving 'testtype2' from '.my-index' to '.other-index'
        indexPattern: '.other-index',
        mappings: {
          properties: {
            name: { type: 'keyword' },
          },
        },
        migrations: {},
      },
      {
        name: 'testtasktype',
        hidden: false,
        namespaceType: 'single',
        indexPattern: '.my-task-index',
        mappings: {
          properties: {
            name: { type: 'keyword' },
          },
        },
        migrations: {},
      },
      {
        // We are moving 'testtype3' from '.my-complementary-index' to '.my-index'
        name: 'testtype3',
        hidden: false,
        namespaceType: 'single',
        mappings: {
          properties: {
            name: { type: 'keyword' },
          },
        },
        migrations: {},
      },
    ]),
    kibanaIndex: '.my-index',
    soMigrationsConfig: {
      algorithm: 'v2',
      batchSize: 20,
      maxBatchSizeBytes: ByteSizeValue.parse('20mb'),
      pollInterval: 20000,
      scrollDuration: '10m',
      skip: false,
      retryAttempts: 20,
      zdt: {
        metaPickupSyncDelaySec: 120,
        runOnNonMigratorNodes: false,
      },
    },
    client: mockedClient,
    docLinks: docLinksServiceMock.createSetupContract(),
    nodeRoles: { backgroundTasks: true, ui: true, migrator: true },
  };
  return options;
};
