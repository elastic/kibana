/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { take } from 'rxjs/operators';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import { elasticsearchClientMock } from '../../elasticsearch/client/mocks';
import { KibanaMigratorOptions, KibanaMigrator } from './kibana_migrator';
import { loggingSystemMock } from '../../logging/logging_system.mock';
import { SavedObjectTypeRegistry } from '../saved_objects_type_registry';
import { SavedObjectsType } from '../types';
import { DocumentMigrator } from './core/document_migrator';
import { ByteSizeValue } from '@kbn/config-schema';
import { lastValueFrom } from 'rxjs';

jest.mock('./core/document_migrator', () => {
  return {
    // Create a mock for spying on the constructor
    DocumentMigrator: jest.fn().mockImplementation((...args) => {
      const { DocumentMigrator: RealDocMigrator } = jest.requireActual('./core/document_migrator');
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

      options.client.cat.templates.mockResponse([], { statusCode: 404 });
      options.client.indices.get.mockResponse({}, { statusCode: 404 });
      options.client.indices.getAlias.mockResponse({}, { statusCode: 404 });

      const migrator = new KibanaMigrator(options);

      await expect(() => migrator.runMigrations()).toThrowErrorMatchingInlineSnapshot(
        `"Migrations are not ready. Make sure prepareMigrations is called first."`
      );
    });

    it('only runs migrations once if called multiple times', async () => {
      const options = mockOptions();
      options.client.indices.get.mockResponse({}, { statusCode: 404 });
      options.client.indices.getAlias.mockResponse({}, { statusCode: 404 });

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
      expect(options.client.indices.get).toHaveBeenCalledTimes(2);
    });

    it('emits results on getMigratorResult$()', async () => {
      const options = mockV2MigrationOptions();
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
        destIndex: 'other-index_8.2.3_001',
        elapsedMs: expect.any(Number),
        status: 'patched',
      });
    });
    it('rejects when the migration state machine terminates in a FATAL state', () => {
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
    kibanaIndex: '.my-index',
    soMigrationsConfig: {
      batchSize: 20,
      maxBatchSizeBytes: ByteSizeValue.parse('20mb'),
      pollInterval: 20000,
      scrollDuration: '10m',
      skip: false,
      retryAttempts: 20,
    },
    client: elasticsearchClientMock.createElasticsearchClient(),
  };
  return options;
};
