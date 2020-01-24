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

import {
  KibanaMigratorMock,
  migratorInstanceMock,
  clientProviderInstanceMock,
} from './saved_objects_service.test.mocks';

import { SavedObjectsService } from './saved_objects_service';
import { mockCoreContext } from '../core_context.mock';
import * as legacyElasticsearch from 'elasticsearch';
import { Env } from '../config';
import { configServiceMock } from '../mocks';
import { elasticsearchServiceMock } from '../elasticsearch/elasticsearch_service.mock';
import { legacyServiceMock } from '../legacy/legacy_service.mock';
import { SavedObjectsClientFactoryProvider } from './service/lib';

describe('SavedObjectsService', () => {
  const createSetupDeps = () => {
    return {
      elasticsearch: elasticsearchServiceMock.createInternalSetup(),
      legacyPlugins: legacyServiceMock.createDiscoverPlugins(),
    };
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('#setup()', () => {
    describe('#setClientFactoryProvider', () => {
      it('registers the factory to the clientProvider', async () => {
        const coreContext = mockCoreContext.create();
        const soService = new SavedObjectsService(coreContext);
        const setup = await soService.setup(createSetupDeps());

        const factory = jest.fn();
        const factoryProvider: SavedObjectsClientFactoryProvider = () => factory;

        setup.setClientFactoryProvider(factoryProvider);

        await soService.start({});

        expect(clientProviderInstanceMock.setClientFactory).toHaveBeenCalledWith(factory);
      });
      it('throws if a factory is already registered', async () => {
        const coreContext = mockCoreContext.create();
        const soService = new SavedObjectsService(coreContext);
        const setup = await soService.setup(createSetupDeps());

        const firstFactory = () => jest.fn();
        const secondFactory = () => jest.fn();

        setup.setClientFactoryProvider(firstFactory);

        expect(() => {
          setup.setClientFactoryProvider(secondFactory);
        }).toThrowErrorMatchingInlineSnapshot(
          `"custom client factory is already set, and can only be set once"`
        );
      });
    });

    describe('#addClientWrapper', () => {
      it('registers the wrapper to the clientProvider', async () => {
        const coreContext = mockCoreContext.create();
        const soService = new SavedObjectsService(coreContext);
        const setup = await soService.setup(createSetupDeps());

        const wrapperA = jest.fn();
        const wrapperB = jest.fn();

        setup.addClientWrapper(1, 'A', wrapperA);
        setup.addClientWrapper(2, 'B', wrapperB);

        await soService.start({});

        expect(clientProviderInstanceMock.addClientWrapperFactory).toHaveBeenCalledTimes(2);
        expect(clientProviderInstanceMock.addClientWrapperFactory).toHaveBeenCalledWith(
          1,
          'A',
          wrapperA
        );
        expect(clientProviderInstanceMock.addClientWrapperFactory).toHaveBeenCalledWith(
          2,
          'B',
          wrapperB
        );
      });
    });

    describe('#registerMappings', () => {
      it('registers the mappings and uses them to create the migrator', async () => {
        const coreContext = mockCoreContext.create();
        const soService = new SavedObjectsService(coreContext);
        const setup = await soService.setup(createSetupDeps());

        setup.registerMappings('pluginA', {
          firstA: {
            properties: {
              field: { type: 'text' },
            },
          },
          secondA: {
            properties: {
              field: { type: 'text' },
            },
          },
        });
        setup.registerMappings('pluginB', {
          firstB: {
            properties: {
              field: { type: 'text' },
            },
          },
        });

        await soService.start({});

        expect(KibanaMigratorMock.mock.calls[0][0].savedObjectMappings).toEqual([
          {
            pluginId: 'pluginA',
            type: 'firstA',
            definition: {
              properties: {
                field: { type: 'text' },
              },
            },
          },
          {
            pluginId: 'pluginA',
            type: 'secondA',
            definition: {
              properties: {
                field: { type: 'text' },
              },
            },
          },
          {
            pluginId: 'pluginB',
            type: 'firstB',
            definition: {
              properties: {
                field: { type: 'text' },
              },
            },
          },
        ]);
      });
    });
  });

  describe('#start()', () => {
    it('creates a KibanaMigrator which retries NoConnections errors from callAsInternalUser', async () => {
      const coreContext = mockCoreContext.create();

      const soService = new SavedObjectsService(coreContext);
      const coreSetup = createSetupDeps();

      let i = 0;
      coreSetup.elasticsearch.adminClient.callAsInternalUser = jest
        .fn()
        .mockImplementation(() =>
          i++ <= 2
            ? Promise.reject(new legacyElasticsearch.errors.NoConnections())
            : Promise.resolve('success')
        );

      await soService.setup(coreSetup);
      await soService.start({}, 1);

      return expect(KibanaMigratorMock.mock.calls[0][0].callCluster()).resolves.toMatch('success');
    });

    it('skips KibanaMigrator migrations when --optimize=true', async () => {
      const coreContext = mockCoreContext.create({
        env: ({ cliArgs: { optimize: true }, packageInfo: { version: 'x.x.x' } } as unknown) as Env,
      });
      const soService = new SavedObjectsService(coreContext);

      await soService.setup(createSetupDeps());
      await soService.start({});
      expect(migratorInstanceMock.runMigrations).toHaveBeenCalledWith(true);
    });

    it('skips KibanaMigrator migrations when migrations.skip=true', async () => {
      const configService = configServiceMock.create({ atPath: { skip: true } });
      const coreContext = mockCoreContext.create({ configService });
      const soService = new SavedObjectsService(coreContext);
      await soService.setup(createSetupDeps());
      await soService.start({});
      expect(migratorInstanceMock.runMigrations).toHaveBeenCalledWith(true);
    });

    it('resolves with KibanaMigrator after waiting for migrations to complete', async () => {
      const configService = configServiceMock.create({ atPath: { skip: false } });
      const coreContext = mockCoreContext.create({ configService });
      const soService = new SavedObjectsService(coreContext);
      await soService.setup(createSetupDeps());
      expect(migratorInstanceMock.runMigrations).toHaveBeenCalledTimes(0);

      const startContract = await soService.start({});
      expect(startContract.migrator).toBe(migratorInstanceMock);
      expect(migratorInstanceMock.runMigrations).toHaveBeenCalledWith(false);
      expect(migratorInstanceMock.runMigrations).toHaveBeenCalledTimes(1);
    });
  });
});
