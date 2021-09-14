/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { take } from 'rxjs/operators';
import { estypes, errors as esErrors } from '@elastic/elasticsearch';

import { elasticsearchClientMock } from '../../../elasticsearch/client/mocks';
import { KibanaMigratorOptions, KibanaMigrator } from './kibana_migrator';
import { loggingSystemMock } from '../../../logging/logging_system.mock';
import { SavedObjectTypeRegistry } from '../../saved_objects_type_registry';
import { SavedObjectsType } from '../../types';
import { DocumentMigrator } from '../core/document_migrator';
import { ByteSizeValue } from '@kbn/config-schema';
jest.mock('../core/document_migrator', () => {
  return {
    // Create a mock for spying on the constructor
    DocumentMigrator: jest.fn().mockImplementation((...args) => {
      const { DocumentMigrator: RealDocMigrator } = jest.requireActual('../core/document_migrator');
      return new RealDocMigrator(args[0]);
    }),
  };
});

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
    (DocumentMigrator as jest.Mock).mockClear();
  });
  describe('constructor', () => {
    it('coerces the current Kibana version if it has a hyphen', () => {
      const options = mockOptions();
      options.kibanaVersion = '3.2.1-SNAPSHOT';
      const migrator = new KibanaMigrator(options);
      expect(migrator.kibanaVersion).toEqual('3.2.1');
      expect((DocumentMigrator as jest.Mock).mock.calls[0][0].kibanaVersion).toEqual('3.2.1');
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
        elasticsearchClientMock.createSuccessTransportRequestPromise([], { statusCode: 404 })
      );
      options.client.indices.get.mockReturnValue(
        elasticsearchClientMock.createSuccessTransportRequestPromise({}, { statusCode: 404 })
      );
      options.client.indices.getAlias.mockReturnValue(
        elasticsearchClientMock.createSuccessTransportRequestPromise({}, { statusCode: 404 })
      );

      const migrator = new KibanaMigrator(options);

      await expect(() => migrator.runMigrations()).toThrowErrorMatchingInlineSnapshot(
        `"Migrations are not ready. Make sure prepareMigrations is called first."`
      );
    });

    it('only runs migrations once if called multiple times', async () => {
      const options = mockOptions();

      options.client.cat.templates.mockReturnValue(
        elasticsearchClientMock.createSuccessTransportRequestPromise(
          // @ts-expect-error
          { templates: [] } as CatTemplatesResponse,
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
            // @ts-expect-error
            { templates: [] } as CatTemplatesResponse,
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
            // @ts-expect-error
            { templates: [] } as CatTemplatesResponse,
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
            error: { type: 'elasticsearch_exception', reason: 'task failed with an error' },
            failures: [],
            task: { description: 'task description' } as any,
          })
        );

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
    elasticsearchClientMock.createSuccessTransportRequestPromise({
      acknowledged: true,
      shards_acknowledged: true,
      indices: [],
    })
  );
  options.client.reindex.mockReturnValue(
    elasticsearchClientMock.createSuccessTransportRequestPromise({
      taskId: 'reindex_task_id',
    } as estypes.ReindexResponse)
  );
  options.client.tasks.get.mockReturnValue(
    elasticsearchClientMock.createSuccessTransportRequestPromise({
      completed: true,
      error: undefined,
      failures: [],
      task: { description: 'task description' } as any,
    } as estypes.TaskGetResponse)
  );

  options.client.search = jest
    .fn()
    .mockImplementation(() =>
      elasticsearchClientMock.createSuccessTransportRequestPromise({ hits: { hits: [] } })
    );

  options.client.openPointInTime = jest
    .fn()
    .mockImplementation(() =>
      elasticsearchClientMock.createSuccessTransportRequestPromise({ id: 'pit_id' })
    );

  options.client.closePointInTime = jest
    .fn()
    .mockImplementation(() =>
      elasticsearchClientMock.createSuccessTransportRequestPromise({ succeeded: true })
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
    soMigrationsConfig: {
      batchSize: 20,
      maxBatchSizeBytes: ByteSizeValue.parse('20mb'),
      pollInterval: 20000,
      scrollDuration: '10m',
      skip: false,
      enableV2,
      retryAttempts: 20,
    },
    client: elasticsearchClientMock.createElasticsearchClient(),
  };
  return options;
};
