/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
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

  describe('runMigrations', () => {
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
        await migrator.runMigrations();

        // Basic assertions that we're creating and cloning the expected indices
        expect(options.client.indices.create).toHaveBeenCalledTimes(2);
        expect(options.client.indices.create.mock.calls).toEqual(
          expect.arrayContaining([
            expect.arrayContaining([expect.objectContaining({ index: '.my-index_pre8.2.3_001' })]),
            expect.arrayContaining([expect.objectContaining({ index: 'other-index_8.2.3_001' })]),
          ])
        );
        expect(options.client.indices.clone.mock.calls).toEqual(
          expect.arrayContaining([
            expect.arrayContaining([
              expect.objectContaining({
                index: '.my-index_pre8.2.3_001',
                target: '.my-index_8.2.3_001',
              }),
            ]),
          ])
        );
        const { status } = await migratorStatus;
        return expect(status).toEqual('completed');
      });
      it('emits results on getMigratorResult$()', async () => {
        const options = mockV2MigrationOptions();
        const migrator = new KibanaMigrator(options);
        const migratorStatus = migrator.getStatus$().pipe(take(3)).toPromise();
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
