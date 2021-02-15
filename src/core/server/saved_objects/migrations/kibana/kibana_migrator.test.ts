/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { take } from 'rxjs/operators';

import { elasticsearchClientMock } from '../../../elasticsearch/client/mocks';
import { KibanaMigratorOptions, KibanaMigrator } from './kibana_migrator';
import { loggingSystemMock } from '../../../logging/logging_system.mock';
import { SavedObjectTypeRegistry } from '../../saved_objects_type_registry';
import { SavedObjectsType } from '../../types';

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
});

type MockedOptions = KibanaMigratorOptions & {
  client: ReturnType<typeof elasticsearchClientMock.createElasticsearchClient>;
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
        migrations: {},
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
    },
    client: elasticsearchClientMock.createElasticsearchClient(),
  };
  return options;
};
