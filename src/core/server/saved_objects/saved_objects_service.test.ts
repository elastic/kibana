/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { join } from 'path';
import loadJsonFile from 'load-json-file';

import {
  clientProviderInstanceMock,
  KibanaMigratorMock,
  migratorInstanceMock,
  registerRoutesMock,
  typeRegistryInstanceMock,
} from './saved_objects_service.test.mocks';
import { BehaviorSubject } from 'rxjs';
import { RawPackageInfo } from '@kbn/config';
import { ByteSizeValue } from '@kbn/config-schema';
import { REPO_ROOT } from '@kbn/utils';

import { SavedObjectsService } from './saved_objects_service';
import { mockCoreContext } from '../core_context.mock';
import { Env } from '../config';
import { getEnvOptions } from '../config/mocks';
import { configServiceMock } from '../mocks';
import { elasticsearchServiceMock } from '../elasticsearch/elasticsearch_service.mock';
import { coreUsageDataServiceMock } from '../core_usage_data/core_usage_data_service.mock';
import { deprecationsServiceMock } from '../deprecations/deprecations_service.mock';
import { httpServiceMock } from '../http/http_service.mock';
import { httpServerMock } from '../http/http_server.mocks';
import { SavedObjectsClientFactoryProvider } from './service/lib';
import { NodesVersionCompatibility } from '../elasticsearch/version_check/ensure_es_version';
import { SavedObjectsRepository } from './service/lib/repository';
import { registerCoreObjectTypes } from './object_types';
import { getSavedObjectsDeprecationsProvider } from './deprecations';

jest.mock('./service/lib/repository');
jest.mock('./object_types');
jest.mock('./deprecations');

describe('SavedObjectsService', () => {
  let deprecationsSetup: ReturnType<typeof deprecationsServiceMock.createInternalSetupContract>;

  beforeEach(() => {
    deprecationsSetup = deprecationsServiceMock.createInternalSetupContract();
  });

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
        maxImportExportSize: 10000,
      });
    });
    return mockCoreContext.create({ configService, env });
  };

  const createSetupDeps = () => {
    const elasticsearchMock = elasticsearchServiceMock.createInternalSetup();
    return {
      http: httpServiceMock.createInternalSetupContract(),
      elasticsearch: elasticsearchMock,
      deprecations: deprecationsSetup,
      coreUsageData: coreUsageDataServiceMock.createSetupContract(),
    };
  };

  const createStartDeps = (pluginsInitialized: boolean = true) => {
    return {
      pluginsInitialized,
      elasticsearch: elasticsearchServiceMock.createInternalStart(),
    };
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('#setup()', () => {
    it('calls registerCoreObjectTypes', async () => {
      const coreContext = createCoreContext();
      const soService = new SavedObjectsService(coreContext);

      const mockedRegisterCoreObjectTypes = registerCoreObjectTypes as jest.Mock<any, any>;
      expect(mockedRegisterCoreObjectTypes).not.toHaveBeenCalled();
      await soService.setup(createSetupDeps());
      expect(mockedRegisterCoreObjectTypes).toHaveBeenCalledTimes(1);
    });

    it('register the deprecation provider', async () => {
      const coreContext = createCoreContext();
      const soService = new SavedObjectsService(coreContext);

      const mockRegistry = deprecationsServiceMock.createSetupContract();
      deprecationsSetup.getRegistry.mockReturnValue(mockRegistry);

      const deprecations = Symbol('deprecations');
      const mockedGetSavedObjectsDeprecationsProvider =
        getSavedObjectsDeprecationsProvider as jest.Mock;
      mockedGetSavedObjectsDeprecationsProvider.mockReturnValue(deprecations);
      await soService.setup(createSetupDeps());

      expect(deprecationsSetup.getRegistry).toHaveBeenCalledTimes(1);
      expect(deprecationsSetup.getRegistry).toHaveBeenCalledWith('savedObjects');
      expect(mockRegistry.registerDeprecations).toHaveBeenCalledTimes(1);
      expect(mockRegistry.registerDeprecations).toHaveBeenCalledWith(deprecations);
    });

    it('registers the deprecation provider with the correct kibanaVersion', async () => {
      const pkg = loadJsonFile.sync(join(REPO_ROOT, 'package.json')) as RawPackageInfo;
      const kibanaVersion = pkg.version;

      const coreContext = createCoreContext({
        env: Env.createDefault(REPO_ROOT, getEnvOptions(), {
          ...pkg,
          version: `${kibanaVersion}-beta1`, // test behavior when release has a version qualifier
        }),
      });

      const soService = new SavedObjectsService(coreContext);
      await soService.setup(createSetupDeps());

      expect(getSavedObjectsDeprecationsProvider).toHaveBeenCalledWith(
        expect.objectContaining({ kibanaVersion })
      );
    });

    it('calls registerRoutes with the correct kibanaVersion', async () => {
      const pkg = loadJsonFile.sync(join(REPO_ROOT, 'package.json')) as RawPackageInfo;
      const kibanaVersion = pkg.version;

      const coreContext = createCoreContext({
        env: Env.createDefault(REPO_ROOT, getEnvOptions(), {
          ...pkg,
          version: `${kibanaVersion}-beta1`, // test behavior when release has a version qualifier
        }),
      });

      const soService = new SavedObjectsService(coreContext);
      await soService.setup(createSetupDeps());

      expect(registerRoutesMock).toHaveBeenCalledWith(expect.objectContaining({ kibanaVersion }));
    });

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
        // we mocked registerCoreObjectTypes above, so this test case only reflects direct calls to the registerType method
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

    describe('#getTypeRegistry', () => {
      it('returns the internal type registry of the service', async () => {
        const coreContext = createCoreContext({ skipMigration: false });
        const soService = new SavedObjectsService(coreContext);
        const { getTypeRegistry } = await soService.setup(createSetupDeps());

        expect(getTypeRegistry()).toBe(typeRegistryInstanceMock);
      });
    });
  });

  describe('#start()', () => {
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

    it('calls KibanaMigrator with correct version', async () => {
      const pkg = loadJsonFile.sync(join(REPO_ROOT, 'package.json')) as RawPackageInfo;
      const kibanaVersion = pkg.version;

      const coreContext = createCoreContext({
        env: Env.createDefault(REPO_ROOT, getEnvOptions(), {
          ...pkg,
          version: `${kibanaVersion}-beta1`, // test behavior when release has a version qualifier
        }),
      });

      const soService = new SavedObjectsService(coreContext);
      await soService.setup(createSetupDeps());
      await soService.start(createStartDeps());

      expect(KibanaMigratorMock).toHaveBeenCalledWith(expect.objectContaining({ kibanaVersion }));
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
      (
        setupDeps.elasticsearch
          .esNodesCompatibility$ as any as BehaviorSubject<NodesVersionCompatibility>
      ).next({
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

      await soService.start(createStartDeps());
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
      it('creates a repository scoped to the user', async () => {
        const coreContext = createCoreContext({ skipMigration: false });
        const soService = new SavedObjectsService(coreContext);
        const coreSetup = createSetupDeps();
        await soService.setup(coreSetup);
        const coreStart = createStartDeps();
        const { createScopedRepository } = await soService.start(coreStart);

        const req = httpServerMock.createKibanaRequest();
        createScopedRepository(req);

        expect(coreStart.elasticsearch.client.asScoped).toHaveBeenCalledWith(req);

        const [[, , , , , includedHiddenTypes]] = (
          SavedObjectsRepository.createRepository as jest.Mocked<any>
        ).mock.calls;

        expect(includedHiddenTypes).toEqual([]);
      });

      it('creates a repository including hidden types when specified', async () => {
        const coreContext = createCoreContext({ skipMigration: false });
        const soService = new SavedObjectsService(coreContext);
        const coreSetup = createSetupDeps();
        await soService.setup(coreSetup);
        const coreStart = createStartDeps();
        const { createScopedRepository } = await soService.start(coreStart);

        const req = httpServerMock.createKibanaRequest();
        createScopedRepository(req, ['someHiddenType']);

        const [[, , , , , includedHiddenTypes]] = (
          SavedObjectsRepository.createRepository as jest.Mocked<any>
        ).mock.calls;

        expect(includedHiddenTypes).toEqual(['someHiddenType']);
      });
    });

    describe('#createInternalRepository', () => {
      it('creates a repository using the admin user', async () => {
        const coreContext = createCoreContext({ skipMigration: false });
        const soService = new SavedObjectsService(coreContext);
        const coreSetup = createSetupDeps();
        await soService.setup(coreSetup);
        const coreStart = createStartDeps();
        const { createInternalRepository } = await soService.start(coreStart);

        createInternalRepository();

        const [[, , , client, , includedHiddenTypes]] = (
          SavedObjectsRepository.createRepository as jest.Mocked<any>
        ).mock.calls;

        expect(coreStart.elasticsearch.client.asInternalUser).toBe(client);
        expect(includedHiddenTypes).toEqual([]);
      });

      it('creates a repository including hidden types when specified', async () => {
        const coreContext = createCoreContext({ skipMigration: false });
        const soService = new SavedObjectsService(coreContext);
        const coreSetup = createSetupDeps();
        await soService.setup(coreSetup);
        const { createInternalRepository } = await soService.start(createStartDeps());

        createInternalRepository(['someHiddenType']);

        const [[, , , , , includedHiddenTypes]] = (
          SavedObjectsRepository.createRepository as jest.Mocked<any>
        ).mock.calls;

        expect(includedHiddenTypes).toEqual(['someHiddenType']);
      });
    });
  });
});
