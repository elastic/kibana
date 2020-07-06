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
import { BehaviorSubject } from 'rxjs';
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
import { NodesVersionCompatibility } from '../elasticsearch/version_check/ensure_es_version';
import { SavedObjectsRepository } from './service/lib/repository';
import { KibanaRequest } from '../http';

jest.mock('./service/lib/repository');

describe('SavedObjectsService', () => {
  const createCoreContext = ({
    skipMigration = true,
    env,
  }: { skipMigration?: boolean; env?: Env } = {}) => {
    const configService = configServiceMock.create({ atPath: { skip: true } });
    configService.atPath.mockImplementation((path) => {
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
      http: httpServiceMock.createInternalSetupContract(),
      elasticsearch: elasticsearchMock,
      legacyPlugins: legacyServiceMock.createDiscoverPlugins(),
    };
  };

  const createStartDeps = (pluginsInitialized: boolean = true) => {
    return {
      pluginsInitialized,
      elasticsearch: elasticsearchServiceMock.createStart(),
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

        await soService.start(createStartDeps());

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

        await soService.start(createStartDeps());

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

    describe('#registerType', () => {
      it('registers the type to the internal typeRegistry', async () => {
        const coreContext = createCoreContext();
        const soService = new SavedObjectsService(coreContext);
        const setup = await soService.setup(createSetupDeps());

        const type = {
          name: 'someType',
          hidden: false,
          namespaceType: 'single' as 'single',
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
      const coreStart = createStartDeps();

      let i = 0;
      coreStart.elasticsearch.legacy.client.callAsInternalUser = jest
        .fn()
        .mockImplementation(() =>
          i++ <= 2
            ? Promise.reject(new legacyElasticsearch.errors.NoConnections())
            : Promise.resolve('success')
        );

      await soService.setup(coreSetup);
      await soService.start(coreStart, 1);

      return expect(KibanaMigratorMock.mock.calls[0][0].callCluster()).resolves.toMatch('success');
    });

    it('skips KibanaMigrator migrations when pluginsInitialized=false', async () => {
      const coreContext = createCoreContext({ skipMigration: false });
      const soService = new SavedObjectsService(coreContext);

      await soService.setup(createSetupDeps());
      await soService.start(createStartDeps(false));
      expect(migratorInstanceMock.runMigrations).not.toHaveBeenCalled();
    });

    it('skips KibanaMigrator migrations when migrations.skip=true', async () => {
      const coreContext = createCoreContext({ skipMigration: true });
      const soService = new SavedObjectsService(coreContext);
      await soService.setup(createSetupDeps());
      await soService.start(createStartDeps());
      expect(migratorInstanceMock.runMigrations).not.toHaveBeenCalled();
    });

    it('waits for all es nodes to be compatible before running migrations', async (done) => {
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
      soService.start(createStartDeps());
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

      const startContract = await soService.start(createStartDeps());
      expect(startContract.migrator).toBe(migratorInstanceMock);
      expect(migratorInstanceMock.runMigrations).toHaveBeenCalledTimes(1);
    });

    it('throws when calling setup APIs once started', async () => {
      const coreContext = createCoreContext({ skipMigration: false });
      const soService = new SavedObjectsService(coreContext);
      const setup = await soService.setup(createSetupDeps());
      await soService.start(createStartDeps());

      expect(() => {
        setup.setClientFactoryProvider(jest.fn());
      }).toThrowErrorMatchingInlineSnapshot(
        `"cannot call \`setClientFactoryProvider\` after service startup."`
      );

      expect(() => {
        setup.addClientWrapper(0, 'dummy', jest.fn());
      }).toThrowErrorMatchingInlineSnapshot(
        `"cannot call \`addClientWrapper\` after service startup."`
      );

      expect(() => {
        setup.registerType({
          name: 'someType',
          hidden: false,
          namespaceType: 'single' as 'single',
          mappings: { properties: {} },
        });
      }).toThrowErrorMatchingInlineSnapshot(
        `"cannot call \`registerType\` after service startup."`
      );
    });

    describe('#getTypeRegistry', () => {
      it('returns the internal type registry of the service', async () => {
        const coreContext = createCoreContext({ skipMigration: false });
        const soService = new SavedObjectsService(coreContext);
        await soService.setup(createSetupDeps());
        const { getTypeRegistry } = await soService.start(createStartDeps());

        expect(getTypeRegistry()).toBe(typeRegistryInstanceMock);
      });
    });

    describe('#createScopedRepository', () => {
      it('creates a respository scoped to the user', async () => {
        const coreContext = createCoreContext({ skipMigration: false });
        const soService = new SavedObjectsService(coreContext);
        const coreSetup = createSetupDeps();
        await soService.setup(coreSetup);
        const coreStart = createStartDeps();
        const { createScopedRepository } = await soService.start(coreStart);

        const req = {} as KibanaRequest;
        createScopedRepository(req);

        expect(coreStart.elasticsearch.legacy.client.asScoped).toHaveBeenCalledWith(req);

        const [
          {
            value: { callAsCurrentUser },
          },
        ] = coreStart.elasticsearch.legacy.client.asScoped.mock.results;

        const [
          [, , , callCluster, includedHiddenTypes],
        ] = (SavedObjectsRepository.createRepository as jest.Mocked<any>).mock.calls;

        expect(callCluster).toBe(callAsCurrentUser);
        expect(includedHiddenTypes).toEqual([]);
      });

      it('creates a respository including hidden types when specified', async () => {
        const coreContext = createCoreContext({ skipMigration: false });
        const soService = new SavedObjectsService(coreContext);
        const coreSetup = createSetupDeps();
        await soService.setup(coreSetup);
        const coreStart = createStartDeps();
        const { createScopedRepository } = await soService.start(coreStart);

        const req = {} as KibanaRequest;
        createScopedRepository(req, ['someHiddenType']);

        const [
          [, , , , includedHiddenTypes],
        ] = (SavedObjectsRepository.createRepository as jest.Mocked<any>).mock.calls;

        expect(includedHiddenTypes).toEqual(['someHiddenType']);
      });
    });

    describe('#createInternalRepository', () => {
      it('creates a respository using the admin user', async () => {
        const coreContext = createCoreContext({ skipMigration: false });
        const soService = new SavedObjectsService(coreContext);
        const coreSetup = createSetupDeps();
        await soService.setup(coreSetup);
        const coreStart = createStartDeps();
        const { createInternalRepository } = await soService.start(coreStart);

        createInternalRepository();

        const [
          [, , , callCluster, includedHiddenTypes],
        ] = (SavedObjectsRepository.createRepository as jest.Mocked<any>).mock.calls;

        expect(coreStart.elasticsearch.legacy.client.callAsInternalUser).toBe(callCluster);
        expect(callCluster).toBe(coreStart.elasticsearch.legacy.client.callAsInternalUser);
        expect(includedHiddenTypes).toEqual([]);
      });

      it('creates a respository including hidden types when specified', async () => {
        const coreContext = createCoreContext({ skipMigration: false });
        const soService = new SavedObjectsService(coreContext);
        const coreSetup = createSetupDeps();
        await soService.setup(coreSetup);
        const { createInternalRepository } = await soService.start(createStartDeps());

        createInternalRepository(['someHiddenType']);

        const [
          [, , , , includedHiddenTypes],
        ] = (SavedObjectsRepository.createRepository as jest.Mocked<any>).mock.calls;

        expect(includedHiddenTypes).toEqual(['someHiddenType']);
      });
    });
  });
});
