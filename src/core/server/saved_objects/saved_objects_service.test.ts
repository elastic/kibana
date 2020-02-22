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
  typeRegistryInstanceMock,
} from './saved_objects_service.test.mocks';

import { ByteSizeValue } from '@kbn/config-schema';
import { SavedObjectsService } from './saved_objects_service';
import { mockCoreContext } from '../core_context.mock';
import * as legacyElasticsearch from 'elasticsearch';
import { Env } from '../config';
import { configServiceMock } from '../mocks';
import { elasticsearchServiceMock } from '../elasticsearch/elasticsearch_service.mock';
import { legacyServiceMock } from '../legacy/legacy_service.mock';
import { httpServiceMock } from '../http/http_service.mock';
import { SavedObjectsClientFactoryProvider } from './service/lib';
import { BehaviorSubject } from 'rxjs';
import { NodesVersionCompatibility } from '../elasticsearch/version_check/ensure_es_version';

describe('SavedObjectsService', () => {
  const createCoreContext = ({
    skipMigration = true,
    env,
  }: { skipMigration?: boolean; env?: Env } = {}) => {
    const configService = configServiceMock.create({ atPath: { skip: true } });
    configService.atPath.mockImplementation(path => {
      if (path === 'migrations') {
        return new BehaviorSubject({ skip: skipMigration });
      }
      return new BehaviorSubject({
        maxImportPayloadBytes: new ByteSizeValue(0),
        maxImportExportSize: new ByteSizeValue(0),
      });
    });
    return mockCoreContext.create({ configService, env });
  };

  const createSetupDeps = () => {
    const elasticsearchMock = elasticsearchServiceMock.createInternalSetup();
    return {
      http: httpServiceMock.createSetupContract(),
      elasticsearch: elasticsearchMock,
      legacyPlugins: legacyServiceMock.createDiscoverPlugins(),
    };
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('#setup()', () => {
    describe('#setClientFactoryProvider', () => {
      it('registers the factory to the clientProvider', async () => {
        const coreContext = createCoreContext();
        const soService = new SavedObjectsService(coreContext);
        const setup = await soService.setup(createSetupDeps());

        const factory = jest.fn();
        const factoryProvider: SavedObjectsClientFactoryProvider = () => factory;

        setup.setClientFactoryProvider(factoryProvider);

        await soService.start({});

        expect(clientProviderInstanceMock.setClientFactory).toHaveBeenCalledWith(factory);
      });
      it('throws if a factory is already registered', async () => {
        const coreContext = createCoreContext();
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
        const coreContext = createCoreContext();
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

    describe('registerType', () => {
      it('registers the type to the internal typeRegistry', async () => {
        const coreContext = createCoreContext();
        const soService = new SavedObjectsService(coreContext);
        const setup = await soService.setup(createSetupDeps());

        const type = {
          name: 'someType',
          hidden: false,
          namespaceAgnostic: false,
          mappings: { properties: {} },
        };
        setup.registerType(type);

        expect(typeRegistryInstanceMock.registerType).toHaveBeenCalledTimes(1);
        expect(typeRegistryInstanceMock.registerType).toHaveBeenCalledWith(type);
      });
    });
  });

  describe('#start()', () => {
    it('creates a KibanaMigrator which retries NoConnections errors from callAsInternalUser', async () => {
      const coreContext = createCoreContext();

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
      const coreContext = createCoreContext({
        env: ({ cliArgs: { optimize: true }, packageInfo: { version: 'x.x.x' } } as unknown) as Env,
      });
      const soService = new SavedObjectsService(coreContext);

      await soService.setup(createSetupDeps());
      await soService.start({});
      expect(migratorInstanceMock.runMigrations).not.toHaveBeenCalled();
    });

    it('skips KibanaMigrator migrations when migrations.skip=true', async () => {
      const coreContext = createCoreContext({ skipMigration: true });
      const soService = new SavedObjectsService(coreContext);
      await soService.setup(createSetupDeps());
      await soService.start({});
      expect(migratorInstanceMock.runMigrations).not.toHaveBeenCalled();
    });

    it('waits for all es nodes to be compatible before running migrations', async done => {
      expect.assertions(2);
      const coreContext = createCoreContext({ skipMigration: false });
      const soService = new SavedObjectsService(coreContext);
      const setupDeps = createSetupDeps();
      // Create an new subject so that we can control when isCompatible=true
      // is emitted.
      setupDeps.elasticsearch.esNodesCompatibility$ = new BehaviorSubject({
        isCompatible: false,
        incompatibleNodes: [],
        warningNodes: [],
        kibanaVersion: '8.0.0',
      });
      await soService.setup(setupDeps);
      soService.start({});
      expect(migratorInstanceMock.runMigrations).toHaveBeenCalledTimes(0);
      ((setupDeps.elasticsearch.esNodesCompatibility$ as any) as BehaviorSubject<
        NodesVersionCompatibility
      >).next({
        isCompatible: true,
        incompatibleNodes: [],
        warningNodes: [],
        kibanaVersion: '8.0.0',
      });
      setImmediate(() => {
        expect(migratorInstanceMock.runMigrations).toHaveBeenCalledTimes(1);
        done();
      });
    });

    it('resolves with KibanaMigrator after waiting for migrations to complete', async () => {
      const coreContext = createCoreContext({ skipMigration: false });
      const soService = new SavedObjectsService(coreContext);
      await soService.setup(createSetupDeps());
      expect(migratorInstanceMock.runMigrations).toHaveBeenCalledTimes(0);

      const startContract = await soService.start({});
      expect(startContract.migrator).toBe(migratorInstanceMock);
      expect(migratorInstanceMock.runMigrations).toHaveBeenCalledTimes(1);
    });
  });
});
