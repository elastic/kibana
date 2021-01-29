/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { take } from 'rxjs/operators';

import { elasticsearchClientMock } from '../../../elasticsearch/client/mocks';
import { KibanaMigratorOptions, KibanaMigrator } from './kibana_migrator';
import { loggingSystemMock } from '../../../logging/logging_system.mock';
import { SavedObjectTypeRegistry } from '../../saved_objects_type_registry';
import { SavedObjectsType } from '../../types';
import { errors as esErrors } from '@elastic/elasticsearch';

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
  describe('constructor', () => {
    it('coerces the current Kibana version if it has a hyphen', () => {
      const options = mockOptions();
      options.kibanaVersion = '3.2.1-SNAPSHOT';
      const migrator = new KibanaMigrator(options);
      expect(migrator.kibanaVersion).toEqual('3.2.1');
    });
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
          indexPattern: 'other-index',
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
      const mockDocumentMigrator = { migrate: jest.fn() };
      // @ts-expect-error `documentMigrator` is readonly.
      kibanaMigrator.documentMigrator = mockDocumentMigrator;
      const doc = {} as any;

      expect(() => kibanaMigrator.migrateDocument(doc)).not.toThrowError();
      expect(mockDocumentMigrator.migrate).toBeCalledTimes(1);
    });
  });

  describe('runMigrations', () => {
    it('throws if prepareMigrations is not called first', async () => {
      const options = mockOptions();

      options.client.cat.templates.mockReturnValue(
        elasticsearchClientMock.createSuccessTransportRequestPromise(
          { templates: [] },
          { statusCode: 404 }
        )
      );
      options.client.indices.get.mockReturnValue(
        elasticsearchClientMock.createSuccessTransportRequestPromise({}, { statusCode: 404 })
      );
      options.client.indices.getAlias.mockReturnValue(
        elasticsearchClientMock.createSuccessTransportRequestPromise({}, { statusCode: 404 })
      );

      const migrator = new KibanaMigrator(options);

      expect(() => migrator.runMigrations()).rejects.toThrow(
        /Migrations are not ready. Make sure prepareMigrations is called first./i
      );
    });

    it('only runs migrations once if called multiple times', async () => {
      const options = mockOptions();

      options.client.cat.templates.mockReturnValue(
        elasticsearchClientMock.createSuccessTransportRequestPromise(
          { templates: [] },
          { statusCode: 404 }
        )
      );
      options.client.indices.get.mockReturnValue(
        elasticsearchClientMock.createSuccessTransportRequestPromise({}, { statusCode: 404 })
      );
      options.client.indices.getAlias.mockReturnValue(
        elasticsearchClientMock.createSuccessTransportRequestPromise({}, { statusCode: 404 })
      );

      const migrator = new KibanaMigrator(options);

      migrator.prepareMigrations();
      await migrator.runMigrations();
      await migrator.runMigrations();

      expect(options.client.cat.templates).toHaveBeenCalledTimes(1);
    });

    describe('when enableV2 = false', () => {
      it('when enableV2 = false creates an IndexMigrator which retries NoLivingConnectionsError errors from ES client', async () => {
        const options = mockOptions();

        options.client.cat.templates.mockReturnValue(
          elasticsearchClientMock.createSuccessTransportRequestPromise(
            { templates: [] },
            { statusCode: 404 }
          )
        );
        options.client.indices.get.mockReturnValue(
          elasticsearchClientMock.createSuccessTransportRequestPromise({}, { statusCode: 404 })
        );
        options.client.indices.getAlias.mockReturnValue(
          elasticsearchClientMock.createSuccessTransportRequestPromise({}, { statusCode: 404 })
        );

        options.client.indices.create = jest
          .fn()
          .mockReturnValueOnce(
            elasticsearchClientMock.createErrorTransportRequestPromise(
              new esErrors.NoLivingConnectionsError('reason', {} as any)
            )
          )
          .mockImplementationOnce(() =>
            elasticsearchClientMock.createSuccessTransportRequestPromise('success')
          );

        const migrator = new KibanaMigrator(options);
        const migratorStatus = migrator.getStatus$().pipe(take(3)).toPromise();

        migrator.prepareMigrations();
        await migrator.runMigrations();

        expect(options.client.indices.create).toHaveBeenCalledTimes(3);
        const { status } = await migratorStatus;
        return expect(status).toEqual('completed');
      });

      it('emits results on getMigratorResult$()', async () => {
        const options = mockOptions();

        options.client.cat.templates.mockReturnValue(
          elasticsearchClientMock.createSuccessTransportRequestPromise(
            { templates: [] },
            { statusCode: 404 }
          )
        );
        options.client.indices.get.mockReturnValue(
          elasticsearchClientMock.createSuccessTransportRequestPromise({}, { statusCode: 404 })
        );
        options.client.indices.getAlias.mockReturnValue(
          elasticsearchClientMock.createSuccessTransportRequestPromise({}, { statusCode: 404 })
        );

        const migrator = new KibanaMigrator(options);
        const migratorStatus = migrator.getStatus$().pipe(take(3)).toPromise();
        migrator.prepareMigrations();
        await migrator.runMigrations();
        const { status, result } = await migratorStatus;
        expect(status).toEqual('completed');
        expect(result![0]).toMatchObject({
          destIndex: '.my-index_1',
          elapsedMs: expect.any(Number),
          sourceIndex: '.my-index',
          status: 'migrated',
        });
        expect(result![1]).toMatchObject({
          destIndex: 'other-index_1',
          elapsedMs: expect.any(Number),
          sourceIndex: 'other-index',
          status: 'migrated',
        });
      });
    });
    describe('when enableV2 = true', () => {
      beforeEach(() => {
        jest.clearAllMocks();
      });

      it('creates a V2 migrator that initializes a new index and migrates an existing index', async () => {
        const options = mockV2MigrationOptions();
        const migrator = new KibanaMigrator(options);
        const migratorStatus = migrator.getStatus$().pipe(take(3)).toPromise();
        migrator.prepareMigrations();
        await migrator.runMigrations();

        // Basic assertions that we're creating and reindexing the expected indices
        expect(options.client.indices.create).toHaveBeenCalledTimes(3);
        expect(options.client.indices.create.mock.calls).toEqual(
          expect.arrayContaining([
            // LEGACY_CREATE_REINDEX_TARGET
            expect.arrayContaining([expect.objectContaining({ index: '.my-index_pre8.2.3_001' })]),
            // CREATE_REINDEX_TEMP
            expect.arrayContaining([
              expect.objectContaining({ index: '.my-index_8.2.3_reindex_temp' }),
            ]),
            // CREATE_NEW_TARGET
            expect.arrayContaining([expect.objectContaining({ index: 'other-index_8.2.3_001' })]),
          ])
        );
        // LEGACY_REINDEX
        expect(options.client.reindex.mock.calls[0][0]).toEqual(
          expect.objectContaining({
            body: expect.objectContaining({
              source: expect.objectContaining({ index: '.my-index' }),
              dest: expect.objectContaining({ index: '.my-index_pre8.2.3_001' }),
            }),
          })
        );
        // REINDEX_SOURCE_TO_TEMP
        expect(options.client.reindex.mock.calls[1][0]).toEqual(
          expect.objectContaining({
            body: expect.objectContaining({
              source: expect.objectContaining({ index: '.my-index_pre8.2.3_001' }),
              dest: expect.objectContaining({ index: '.my-index_8.2.3_reindex_temp' }),
            }),
          })
        );
        const { status } = await migratorStatus;
        return expect(status).toEqual('completed');
      });
      it('emits results on getMigratorResult$()', async () => {
        const options = mockV2MigrationOptions();
        const migrator = new KibanaMigrator(options);
        const migratorStatus = migrator.getStatus$().pipe(take(3)).toPromise();
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
          destIndex: 'other-index_8.2.3_001',
          elapsedMs: expect.any(Number),
          status: 'patched',
        });
      });
      it('rejects when the migration state machine terminates in a FATAL state', () => {
        const options = mockV2MigrationOptions();
        options.client.indices.get.mockReturnValue(
          elasticsearchClientMock.createSuccessTransportRequestPromise(
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
          )
        );

        const migrator = new KibanaMigrator(options);
        migrator.prepareMigrations();
        return expect(migrator.runMigrations()).rejects.toMatchInlineSnapshot(
          `[Error: Unable to complete saved object migrations for the [.my-index] index: The .my-index alias is pointing to a newer version of Kibana: v8.2.4]`
        );
      });
      it('rejects when an unexpected exception occurs in an action', async () => {
        const options = mockV2MigrationOptions();
        options.client.tasks.get.mockReturnValue(
          elasticsearchClientMock.createSuccessTransportRequestPromise({
            completed: true,
            error: { type: 'elatsicsearch_exception', reason: 'task failed with an error' },
            failures: [],
            task: { description: 'task description' },
          })
        );

        const migrator = new KibanaMigrator(options);
        migrator.prepareMigrations();
        await expect(migrator.runMigrations()).rejects.toMatchInlineSnapshot(`
                [Error: Unable to complete saved object migrations for the [.my-index] index. Please check the health of your Elasticsearch cluster and try again. Error: Reindex failed with the following error:
                {"_tag":"Some","value":{"type":"elatsicsearch_exception","reason":"task failed with an error"}}]
              `);
        expect(loggingSystemMock.collect(options.logger).error[0][0]).toMatchInlineSnapshot(`
          [Error: Reindex failed with the following error:
          {"_tag":"Some","value":{"type":"elatsicsearch_exception","reason":"task failed with an error"}}]
        `);
      });
    });
  });
});

type MockedOptions = KibanaMigratorOptions & {
  client: ReturnType<typeof elasticsearchClientMock.createElasticsearchClient>;
};

const mockV2MigrationOptions = () => {
  const options = mockOptions({ enableV2: true });

  options.client.indices.get.mockReturnValue(
    elasticsearchClientMock.createSuccessTransportRequestPromise(
      {
        '.my-index': {
          aliases: { '.kibana': {} },
          mappings: { properties: {} },
          settings: {},
        },
      },
      { statusCode: 200 }
    )
  );
  options.client.indices.addBlock.mockReturnValue(
    elasticsearchClientMock.createSuccessTransportRequestPromise({ acknowledged: true })
  );
  options.client.reindex.mockReturnValue(
    elasticsearchClientMock.createSuccessTransportRequestPromise({ taskId: 'reindex_task_id' })
  );
  options.client.tasks.get.mockReturnValue(
    elasticsearchClientMock.createSuccessTransportRequestPromise({
      completed: true,
      error: undefined,
      failures: [],
      task: { description: 'task description' },
    })
  );

  return options;
};

const mockOptions = ({ enableV2 }: { enableV2: boolean } = { enableV2: false }) => {
  const options: MockedOptions = {
    logger: loggingSystemMock.create().get(),
    kibanaVersion: '8.2.3',
    typeRegistry: createRegistry([
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
        indexPattern: 'other-index',
        mappings: {
          properties: {
            name: { type: 'keyword' },
          },
        },
        migrations: {},
      },
    ]),
    kibanaConfig: {
      enabled: true,
      index: '.my-index',
    } as KibanaMigratorOptions['kibanaConfig'],
    savedObjectsConfig: {
      batchSize: 20,
      pollInterval: 20000,
      scrollDuration: '10m',
      skip: false,
      enableV2,
    },
    client: elasticsearchClientMock.createElasticsearchClient(),
  };
  return options;
};
