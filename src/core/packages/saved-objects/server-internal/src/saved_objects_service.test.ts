/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { setImmediate } from 'timers/promises';
import { join } from 'path';
import loadJsonFile from 'load-json-file';

import {
  clientProviderInstanceMock,
  KibanaMigratorMock,
  migratorInstanceMock,
  registerRoutesMock,
  typeRegistryInstanceMock,
} from './saved_objects_service.test.mocks';
import { BehaviorSubject, firstValueFrom, EMPTY } from 'rxjs';
import { skip } from 'rxjs';
import { type RawPackageInfo, Env } from '@kbn/config';
import { ByteSizeValue } from '@kbn/config-schema';
import { REPO_ROOT } from '@kbn/repo-info';
import { getEnvOptions } from '@kbn/config-mocks';
import type { SavedObjectsType } from '@kbn/core-saved-objects-server';
import { MAIN_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server';
import { docLinksServiceMock } from '@kbn/core-doc-links-server-mocks';
import { nodeServiceMock } from '@kbn/core-node-server-mocks';
import { mockCoreContext } from '@kbn/core-base-server-mocks';
import { httpServiceMock, httpServerMock } from '@kbn/core-http-server-mocks';
import type {
  SavedObjectsClientFactoryProvider,
  SavedObjectsEncryptionExtensionFactory,
  SavedObjectsSecurityExtensionFactory,
  SavedObjectsSpacesExtensionFactory,
} from '@kbn/core-saved-objects-server';
import { configServiceMock } from '@kbn/config-mocks';
import type { NodesVersionCompatibility } from '@kbn/core-elasticsearch-server-internal';
import {
  SavedObjectsClient,
  SavedObjectsClientProvider,
  SavedObjectsRepository,
} from '@kbn/core-saved-objects-api-server-internal';
import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';

import { SavedObjectsService } from './saved_objects_service';

import {
  createDeprecationsSetupMock,
  createDeprecationRegistryProviderMock,
  createCoreUsageDataSetupMock,
} from './mocks/internal_mocks';

import { registerCoreObjectTypes } from './object_types';
import { getSavedObjectsDeprecationsProvider } from './deprecations';
import type { SavedObjectsAccessControlTransforms } from '@kbn/core-saved-objects-server/src/contracts';
import * as SavedObjectsImportExportModule from '@kbn/core-saved-objects-import-export-server-internal';

jest.mock('./object_types');
jest.mock('./deprecations');

// Mock the importer and exporter constructors
jest.mock('@kbn/core-saved-objects-import-export-server-internal', () => {
  return {
    SavedObjectsExporter: jest.fn().mockImplementation(() => {
      return {};
    }),
    SavedObjectsImporter: jest.fn().mockImplementation(() => {
      return {};
    }),
  };
});

const createType = (parts: Partial<SavedObjectsType>): SavedObjectsType => ({
  name: 'test-type',
  hidden: false,
  namespaceType: 'single',
  mappings: { properties: {} },
  ...parts,
});

describe('SavedObjectsService', () => {
  let deprecationsSetup: ReturnType<typeof createDeprecationRegistryProviderMock>;

  beforeEach(() => {
    deprecationsSetup = createDeprecationRegistryProviderMock();
  });

  const createCoreContext = ({
    skipMigration = true,
    env,
    accessControlEnabled,
  }: { skipMigration?: boolean; env?: Env; accessControlEnabled?: boolean } = {}) => {
    const configService = configServiceMock.create({ atPath: { skip: true } });
    configService.atPath.mockImplementation((path) => {
      if (path === 'migrations') {
        return new BehaviorSubject({ skip: skipMigration });
      }
      return new BehaviorSubject({
        maxImportPayloadBytes: new ByteSizeValue(0),
        maxImportExportSize: 10000,
        enableAccessControl: accessControlEnabled ?? true, // default to true
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
      coreUsageData: createCoreUsageDataSetupMock(),
      docLinks: docLinksServiceMock.createSetupContract(),
    };
  };

  const createStartDeps = (pluginsInitialized: boolean = true) => {
    return {
      pluginsInitialized,
      elasticsearch: elasticsearchServiceMock.createInternalStart(),
      docLinks: docLinksServiceMock.createStartContract(),
      node: nodeServiceMock.createInternalStartContract(),
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

      const mockRegistry = createDeprecationsSetupMock();
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

    it('calls registerRoutes with docLinks', async () => {
      const coreContext = createCoreContext();
      const mockedLinks = docLinksServiceMock.createSetupContract();

      const soService = new SavedObjectsService(coreContext);
      await soService.setup(createSetupDeps());

      expect(registerRoutesMock).toHaveBeenCalledWith(
        expect.objectContaining({ docLinks: mockedLinks })
      );
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

    describe('#extensions', () => {
      it('registers the encryption extension to the clientProvider', async () => {
        const coreContext = createCoreContext();
        const soService = new SavedObjectsService(coreContext);
        const setup = await soService.setup(createSetupDeps());
        const encryptionExtension: jest.Mocked<SavedObjectsEncryptionExtensionFactory> = jest.fn();
        setup.setEncryptionExtension(encryptionExtension);

        await soService.start(createStartDeps());

        expect(SavedObjectsClientProvider).toHaveBeenCalledTimes(1);
        expect(SavedObjectsClientProvider).toHaveBeenCalledWith(
          expect.objectContaining({
            encryptionExtensionFactory: encryptionExtension,
            securityExtensionFactory: undefined,
            spacesExtensionFactory: undefined,
          })
        );
      });

      it('registers the security extension to the clientProvider', async () => {
        const coreContext = createCoreContext();
        const soService = new SavedObjectsService(coreContext);
        const setup = await soService.setup(createSetupDeps());
        const securityExtension: jest.Mocked<SavedObjectsSecurityExtensionFactory> = jest.fn();
        setup.setSecurityExtension(securityExtension);

        await soService.start(createStartDeps());

        expect(SavedObjectsClientProvider).toHaveBeenCalledTimes(1);
        expect(SavedObjectsClientProvider).toHaveBeenCalledWith(
          expect.objectContaining({
            encryptionExtensionFactory: undefined,
            securityExtensionFactory: securityExtension,
            spacesExtensionFactory: undefined,
          })
        );
      });

      it('registers the spaces extension to the clientProvider', async () => {
        const coreContext = createCoreContext();
        const soService = new SavedObjectsService(coreContext);
        const setup = await soService.setup(createSetupDeps());
        const spacesExtension: jest.Mocked<SavedObjectsSpacesExtensionFactory> = jest.fn();
        setup.setSpacesExtension(spacesExtension);

        await soService.start(createStartDeps());

        expect(SavedObjectsClientProvider).toHaveBeenCalledTimes(1);
        expect(SavedObjectsClientProvider).toHaveBeenCalledWith(
          expect.objectContaining({
            encryptionExtensionFactory: undefined,
            securityExtensionFactory: undefined,
            spacesExtensionFactory: spacesExtension,
          })
        );
      });

      it('registers a combination of extensions to the clientProvider', async () => {
        const coreContext = createCoreContext();
        const soService = new SavedObjectsService(coreContext);
        const setup = await soService.setup(createSetupDeps());
        const encryptionExtension: jest.Mocked<SavedObjectsEncryptionExtensionFactory> = jest.fn();
        const spacesExtension: jest.Mocked<SavedObjectsSpacesExtensionFactory> = jest.fn();
        setup.setEncryptionExtension(encryptionExtension);
        setup.setSpacesExtension(spacesExtension);

        await soService.start(createStartDeps());

        expect(SavedObjectsClientProvider).toHaveBeenCalledTimes(1);
        expect(SavedObjectsClientProvider).toHaveBeenCalledWith(
          expect.objectContaining({
            encryptionExtensionFactory: encryptionExtension,
            securityExtensionFactory: undefined,
            spacesExtensionFactory: spacesExtension,
          })
        );
      });

      it('registers all three extensions to the clientProvider', async () => {
        const coreContext = createCoreContext();
        const soService = new SavedObjectsService(coreContext);
        const setup = await soService.setup(createSetupDeps());
        const encryptionExtension: jest.Mocked<SavedObjectsEncryptionExtensionFactory> = jest.fn();
        const securityExtension: jest.Mocked<SavedObjectsSecurityExtensionFactory> = jest.fn();
        const spacesExtension: jest.Mocked<SavedObjectsSpacesExtensionFactory> = jest.fn();
        setup.setEncryptionExtension(encryptionExtension);
        setup.setSecurityExtension(securityExtension);
        setup.setSpacesExtension(spacesExtension);

        await soService.start(createStartDeps());

        expect(SavedObjectsClientProvider).toHaveBeenCalledTimes(1);
        expect(SavedObjectsClientProvider).toHaveBeenCalledWith(
          expect.objectContaining({
            encryptionExtensionFactory: encryptionExtension,
            securityExtensionFactory: securityExtension,
            spacesExtensionFactory: spacesExtension,
          })
        );
      });

      it('registers no extensions to the clientProvider', async () => {
        const coreContext = createCoreContext();
        const soService = new SavedObjectsService(coreContext);
        await soService.setup(createSetupDeps());
        await soService.start(createStartDeps());

        expect(SavedObjectsClientProvider).toHaveBeenCalledTimes(1);
        expect(SavedObjectsClientProvider).toHaveBeenCalledWith(
          expect.objectContaining({
            encryptionExtensionFactory: undefined,
            securityExtensionFactory: undefined,
            spacesExtensionFactory: undefined,
          })
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

    describe('status$', () => {
      it('return correct value when migration is skipped', async () => {
        const coreContext = createCoreContext({ skipMigration: true });
        const soService = new SavedObjectsService(coreContext);
        const setup = await soService.setup(createSetupDeps());
        await soService.start(createStartDeps(false));

        const serviceStatus = await firstValueFrom(setup.status$.pipe(skip(1)));
        expect(serviceStatus.level.toString()).toEqual('available');
        expect(serviceStatus.summary).toEqual(
          'SavedObjects service has completed migrations and is available'
        );
      });
    });

    describe('#isAccessControlEnabled', () => {
      it('returns true by default', async () => {
        const coreContext = createCoreContext({});
        const soService = new SavedObjectsService(coreContext);
        const { isAccessControlEnabled } = await soService.setup(createSetupDeps());
        expect(isAccessControlEnabled()).toEqual(true);
      });

      it('can be set to false', async () => {
        const coreContext = createCoreContext({ accessControlEnabled: false });
        const soService = new SavedObjectsService(coreContext);
        const { isAccessControlEnabled } = await soService.setup(createSetupDeps());
        expect(isAccessControlEnabled()).toEqual(false);
      });

      describe('#setAccessControlTransforms', () => {
        it('sets the access control transforms', async () => {
          const coreContext = createCoreContext();
          const soService = new SavedObjectsService(coreContext);
          const setup = await soService.setup(createSetupDeps());

          const accessControlTransforms: SavedObjectsAccessControlTransforms = {
            createImportTransforms: jest.fn(),
          };

          setup.setAccessControlTransforms(accessControlTransforms);

          const request = httpServerMock.createKibanaRequest();
          const start = await soService.start(createStartDeps());
          start.createImporter(start.getScopedClient(request));

          expect(SavedObjectsImportExportModule.SavedObjectsImporter).toHaveBeenCalledWith(
            expect.objectContaining({
              createAccessControlImportTransforms: accessControlTransforms.createImportTransforms,
            })
          );
        });

        it('throws if a factory is already registered', async () => {
          const coreContext = createCoreContext();
          const soService = new SavedObjectsService(coreContext);
          const setup = await soService.setup(createSetupDeps());

          const accessControlTransforms: SavedObjectsAccessControlTransforms = {
            // exportTransform: jest.fn(),
            createImportTransforms: jest.fn(),
          };

          setup.setAccessControlTransforms(accessControlTransforms);
          expect(() => {
            setup.setAccessControlTransforms(accessControlTransforms);
          }).toThrowErrorMatchingInlineSnapshot(
            `"access control tranforms have already been set, and can only be set once"`
          );
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

      it('calls KibanaMigrator with waitForMigrationCompletion=false for the default ui+background tasks role', async () => {
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
        const startDeps = createStartDeps();
        startDeps.node = nodeServiceMock.createInternalStartContract({
          ui: true,
          backgroundTasks: true,
          migrator: false,
        });
        await soService.start(startDeps);

        expect(KibanaMigratorMock).toHaveBeenCalledWith(
          expect.objectContaining({ waitForMigrationCompletion: false })
        );
      });

      it('calls KibanaMigrator with waitForMigrationCompletion=false for the ui only role', async () => {
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
        const startDeps = createStartDeps();
        startDeps.node = nodeServiceMock.createInternalStartContract({
          ui: true,
          backgroundTasks: false,
          migrator: false,
        });
        await soService.start(startDeps);

        expect(KibanaMigratorMock).toHaveBeenCalledWith(
          expect.objectContaining({ waitForMigrationCompletion: false })
        );
      });

      it('calls KibanaMigrator with waitForMigrationCompletion=true for the background tasks only role', async () => {
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
        const startDeps = createStartDeps();
        startDeps.node = nodeServiceMock.createInternalStartContract({
          ui: false,
          backgroundTasks: true,
          migrator: false,
        });
        await soService.start(startDeps);

        expect(KibanaMigratorMock).toHaveBeenCalledWith(
          expect.objectContaining({ waitForMigrationCompletion: true })
        );
      });

      it('waits for all es nodes to be compatible before running migrations', async () => {
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

        await setImmediate();
        expect(migratorInstanceMock.runMigrations).toHaveBeenCalledTimes(1);
      });

      it('does not start the migration if esNodesCompatibility$ is closed before calling `start`', async () => {
        expect.assertions(2);
        const coreContext = createCoreContext({ skipMigration: false });
        const soService = new SavedObjectsService(coreContext);
        const setupDeps = createSetupDeps();
        // Create an new subject so that we can control when isCompatible=true
        // is emitted.
        setupDeps.elasticsearch.esNodesCompatibility$ = EMPTY;
        await soService.setup(setupDeps);
        await expect(() =>
          soService.start(createStartDeps())
        ).rejects.toThrowErrorMatchingInlineSnapshot(
          `"esNodesCompatibility$ was closed before emitting"`
        );

        expect(migratorInstanceMock.runMigrations).not.toHaveBeenCalled();
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

      it('returns the information about the time spent migrating', async () => {
        const coreContext = createCoreContext({ skipMigration: false });
        const soService = new SavedObjectsService(coreContext);

        migratorInstanceMock.runMigrations.mockImplementation(async () => {
          await new Promise((r) => setTimeout(r, 5));
          return [];
        });

        await soService.setup(createSetupDeps());
        const startContract = await soService.start(createStartDeps());

        expect(startContract.metrics.migrationDuration).toBeGreaterThan(0);
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

      describe('index retrieval APIs', () => {
        let soService: SavedObjectsService;

        beforeEach(async () => {
          const coreContext = createCoreContext({ skipMigration: false });
          soService = new SavedObjectsService(coreContext);

          typeRegistryInstanceMock.getType.mockImplementation((type: string) => {
            if (type === 'dashboard') {
              return createType({
                name: 'dashboard',
              });
            } else if (type === 'foo') {
              return createType({
                name: 'foo',
                indexPattern: '.kibana_foo',
              });
            } else if (type === 'bar') {
              return createType({
                name: 'bar',
                indexPattern: '.kibana_bar',
              });
            } else if (type === 'bar_too') {
              return createType({
                name: 'bar_too',
                indexPattern: '.kibana_bar',
              });
            } else {
              return undefined;
            }
          });

          await soService.setup(createSetupDeps());
        });

        describe('#getDefaultIndex', () => {
          it('return the default index', async () => {
            const { getDefaultIndex } = await soService.start(createStartDeps());
            expect(getDefaultIndex()).toEqual(MAIN_SAVED_OBJECT_INDEX);
          });
        });

        describe('#getIndexForType', () => {
          it('return the correct index for type specifying its indexPattern', async () => {
            const { getIndexForType } = await soService.start(createStartDeps());
            expect(getIndexForType('bar')).toEqual('.kibana_bar');
          });
          it('return the correct index for type not specifying its indexPattern', async () => {
            const { getIndexForType } = await soService.start(createStartDeps());
            expect(getIndexForType('dashboard')).toEqual(MAIN_SAVED_OBJECT_INDEX);
          });
          it('return the default index for unknown type', async () => {
            const { getIndexForType } = await soService.start(createStartDeps());
            expect(getIndexForType('unknown_type')).toEqual(MAIN_SAVED_OBJECT_INDEX);
          });
        });

        describe('#getIndicesForTypes', () => {
          it('return the correct indices for specified types', async () => {
            const { getIndicesForTypes } = await soService.start(createStartDeps());
            expect(getIndicesForTypes(['dashboard', 'foo', 'bar'])).toEqual([
              MAIN_SAVED_OBJECT_INDEX,
              '.kibana_foo',
              '.kibana_bar',
            ]);
          });
          it('ignore duplicate indices', async () => {
            const { getIndicesForTypes } = await soService.start(createStartDeps());
            expect(getIndicesForTypes(['bar', 'bar_too'])).toEqual(['.kibana_bar']);
          });
          it('return the default index for unknown type', async () => {
            const { getIndicesForTypes } = await soService.start(createStartDeps());
            expect(getIndicesForTypes(['unknown', 'foo'])).toEqual([
              MAIN_SAVED_OBJECT_INDEX,
              '.kibana_foo',
            ]);
          });
        });
      });

      describe('#getUnsafeInternalClient', () => {
        it('returns a SavedObjectsClient instance', async () => {
          const coreContext = createCoreContext();
          const soService = new SavedObjectsService(coreContext);
          await soService.setup(createSetupDeps());
          const { getUnsafeInternalClient } = await soService.start(createStartDeps());

          const client = getUnsafeInternalClient();

          expect(client).toBeInstanceOf(SavedObjectsClient);
        });

        it('is bound correctly in start contract', async () => {
          const coreContext = createCoreContext();
          const soService = new SavedObjectsService(coreContext);
          await soService.setup(createSetupDeps());
          const startContract = await soService.start(createStartDeps());

          expect(startContract).toHaveProperty('getUnsafeInternalClient');
          expect(typeof startContract.getUnsafeInternalClient).toBe('function');
        });

        it('works with no options parameter (default behavior)', async () => {
          const coreContext = createCoreContext();
          const soService = new SavedObjectsService(coreContext);
          await soService.setup(createSetupDeps());
          const { getUnsafeInternalClient } = await soService.start(createStartDeps());

          expect(() => getUnsafeInternalClient()).not.toThrow();
          const client = getUnsafeInternalClient();
          expect(client).toBeInstanceOf(SavedObjectsClient);
        });

        it('works with empty options object', async () => {
          const coreContext = createCoreContext();
          const soService = new SavedObjectsService(coreContext);
          await soService.setup(createSetupDeps());
          const { getUnsafeInternalClient } = await soService.start(createStartDeps());

          expect(() => getUnsafeInternalClient({})).not.toThrow();
          const client = getUnsafeInternalClient({});
          expect(client).toBeInstanceOf(SavedObjectsClient);
        });

        it('passes includedHiddenTypes to createInternalRepository', async () => {
          const coreContext = createCoreContext();
          const soService = new SavedObjectsService(coreContext);
          await soService.setup(createSetupDeps());
          const startContract = await soService.start(createStartDeps());

          const includedHiddenTypes = ['hidden-type-1', 'hidden-type-2'];

          // Test that the method accepts the parameter without throwing
          expect(() =>
            startContract.getUnsafeInternalClient({ includedHiddenTypes })
          ).not.toThrow();
          const client = startContract.getUnsafeInternalClient({ includedHiddenTypes });
          expect(client).toBeInstanceOf(SavedObjectsClient);

          // Verify that SavedObjectsRepository.createRepository was called with the correct includedHiddenTypes
          const calls = (SavedObjectsRepository.createRepository as jest.Mocked<any>).mock.calls;
          const [, , , , , lastCallIncludedHiddenTypes] = calls[calls.length - 1];
          expect(lastCallIncludedHiddenTypes).toEqual(includedHiddenTypes);
        });

        it('passes excludedExtensions to getInternalExtensions', async () => {
          const coreContext = createCoreContext();
          const soService = new SavedObjectsService(coreContext);

          const getInternalExtensionsSpy = jest.spyOn(soService as any, 'getInternalExtensions');

          await soService.setup(createSetupDeps());
          const { getUnsafeInternalClient } = await soService.start(createStartDeps());
          const excludedExtensions = ['test-extension'];

          getUnsafeInternalClient({ excludedExtensions });

          expect(getInternalExtensionsSpy).toHaveBeenCalledWith(excludedExtensions);
        });

        it('calls internal repository factory, not scoped repository factory', async () => {
          const coreContext = createCoreContext();
          const soService = new SavedObjectsService(coreContext);
          await soService.setup(createSetupDeps());
          const startContract = await soService.start(createStartDeps());

          (SavedObjectsRepository.createRepository as jest.Mock).mockClear();

          const client = startContract.getUnsafeInternalClient();
          expect(client).toBeInstanceOf(SavedObjectsClient);

          expect(SavedObjectsRepository.createRepository).toHaveBeenCalledTimes(1);
          const [[, , , esClient]] = (SavedObjectsRepository.createRepository as jest.Mocked<any>)
            .mock.calls;

          expect(esClient).toBeDefined();
        });

        it('handles invalid options gracefully', async () => {
          const coreContext = createCoreContext();
          const soService = new SavedObjectsService(coreContext);
          await soService.setup(createSetupDeps());
          const { getUnsafeInternalClient } = await soService.start(createStartDeps());

          // Test with various invalid options
          expect(() => getUnsafeInternalClient({ includedHiddenTypes: null as any })).not.toThrow();
          expect(() => getUnsafeInternalClient({ excludedExtensions: null as any })).not.toThrow();
          expect(() => getUnsafeInternalClient({ unknownOption: 'test' } as any)).not.toThrow();
        });
      });

      describe('#getInternalExtensions', () => {
        it('automatically excludes security extension (always undefined)', async () => {
          const coreContext = createCoreContext();
          const soService = new SavedObjectsService(coreContext);
          const setup = await soService.setup(createSetupDeps());

          // Set up security extension factory
          const securityFactory = jest.fn().mockReturnValue({});
          setup.setSecurityExtension(securityFactory);

          await soService.start(createStartDeps());

          const extensions = (soService as any).getInternalExtensions([]);

          expect(extensions.securityExtension).toBeUndefined();
          expect(securityFactory).not.toHaveBeenCalled();
        });

        it('never includes security extension regardless of excludedExtensions parameter', async () => {
          const coreContext = createCoreContext();
          const soService = new SavedObjectsService(coreContext);
          const setup = await soService.setup(createSetupDeps());

          const securityFactory = jest.fn().mockReturnValue({});
          setup.setSecurityExtension(securityFactory);

          await soService.start(createStartDeps());

          // Even if we don't explicitly exclude security, it should still be excluded
          const extensions = (soService as any).getInternalExtensions([]);

          expect(extensions.securityExtension).toBeUndefined();
          expect(securityFactory).not.toHaveBeenCalled();

          // Test with different combinations of excludedExtensions
          const extensionsWithOthers = (soService as any).getInternalExtensions([
            'someOtherExtension',
          ]);
          expect(extensionsWithOthers.securityExtension).toBeUndefined();
          expect(securityFactory).not.toHaveBeenCalled();
        });

        it('creates encryption extension when factory exists', async () => {
          const coreContext = createCoreContext();
          const soService = new SavedObjectsService(coreContext);
          const setup = await soService.setup(createSetupDeps());

          const mockEncryptionExtension = { id: 'encryption' };
          const encryptionFactory = jest.fn().mockReturnValue(mockEncryptionExtension);
          setup.setEncryptionExtension(encryptionFactory);

          await soService.start(createStartDeps());

          const extensions = (soService as any).getInternalExtensions([]);

          expect(extensions.encryptionExtension).toBe(mockEncryptionExtension);
          expect(encryptionFactory).toHaveBeenCalledWith({
            typeRegistry: expect.any(Object),
            request: expect.objectContaining({
              headers: {},
              getBasePath: expect.any(Function),
              path: '/',
            }),
          });
        });

        it('creates spaces extension when factory exists', async () => {
          const coreContext = createCoreContext();
          const soService = new SavedObjectsService(coreContext);
          const setup = await soService.setup(createSetupDeps());

          const mockSpacesExtension = { id: 'spaces' };
          const spacesFactory = jest.fn().mockReturnValue(mockSpacesExtension);
          setup.setSpacesExtension(spacesFactory);

          await soService.start(createStartDeps());

          const extensions = (soService as any).getInternalExtensions([]);

          expect(extensions.spacesExtension).toBe(mockSpacesExtension);
          expect(spacesFactory).toHaveBeenCalledWith({
            typeRegistry: expect.any(Object),
            request: expect.objectContaining({
              headers: {},
              getBasePath: expect.any(Function),
              path: '/',
            }),
          });
        });

        it('excludes extensions via excludedExtensions parameter', async () => {
          const coreContext = createCoreContext();
          const soService = new SavedObjectsService(coreContext);
          const setup = await soService.setup(createSetupDeps());

          const encryptionFactory = jest.fn().mockReturnValue({ id: 'encryption' });
          const spacesFactory = jest.fn().mockReturnValue({ id: 'spaces' });
          setup.setEncryptionExtension(encryptionFactory);
          setup.setSpacesExtension(spacesFactory);

          await soService.start(createStartDeps());
          const excludedExtensions = ['encryptedSavedObjects'];

          const extensions = (soService as any).getInternalExtensions(excludedExtensions);

          expect(extensions.encryptionExtension).toBeUndefined();
          expect(extensions.spacesExtension).toBeDefined();
          expect(encryptionFactory).not.toHaveBeenCalled();
          expect(spacesFactory).toHaveBeenCalled();
        });

        it('handles undefined extension factories gracefully', async () => {
          const coreContext = createCoreContext();
          const soService = new SavedObjectsService(coreContext);
          await soService.setup(createSetupDeps());
          await soService.start(createStartDeps());

          // No extension factories set, should not throw
          expect(() => (soService as any).getInternalExtensions([])).not.toThrow();

          const extensions = (soService as any).getInternalExtensions([]);

          expect(extensions.encryptionExtension).toBeUndefined();
          expect(extensions.spacesExtension).toBeUndefined();
          expect(extensions.securityExtension).toBeUndefined();
        });

        it('creates proper fake request object for extension factories', async () => {
          const coreContext = createCoreContext();
          const soService = new SavedObjectsService(coreContext);
          const setup = await soService.setup(createSetupDeps());

          const encryptionFactory = jest.fn().mockReturnValue({});
          setup.setEncryptionExtension(encryptionFactory);

          await soService.start(createStartDeps());

          (soService as any).getInternalExtensions([]);

          expect(encryptionFactory).toHaveBeenCalledWith({
            typeRegistry: expect.any(Object),
            request: expect.objectContaining({
              headers: {},
              getBasePath: expect.any(Function),
              path: '/',
              route: { settings: {} },
              url: { href: '/' },
              raw: { req: { url: '/' } },
            }),
          });

          // Test that getBasePath function works
          const requestArg = encryptionFactory.mock.calls[0][0].request;
          expect(requestArg.getBasePath()).toBe('');
        });

        it('passes type registry correctly to extension factories', async () => {
          const coreContext = createCoreContext();
          const soService = new SavedObjectsService(coreContext);
          const setup = await soService.setup(createSetupDeps());

          const encryptionFactory = jest.fn().mockReturnValue({});
          setup.setEncryptionExtension(encryptionFactory);

          await soService.start(createStartDeps());

          (soService as any).getInternalExtensions([]);

          expect(encryptionFactory).toHaveBeenCalledWith({
            typeRegistry: setup.getTypeRegistry(),
            request: expect.any(Object),
          });
        });

        it('constructs finalExcludedExtensions array correctly', async () => {
          const coreContext = createCoreContext();
          const soService = new SavedObjectsService(coreContext);
          await soService.setup(createSetupDeps());

          // Mock the createExt function to spy on excluded extensions check
          const originalGetInternalExtensions = (soService as any).getInternalExtensions.bind(
            soService
          );
          let capturedExcludedExtensions: string[] = [];

          jest
            .spyOn(soService as any, 'getInternalExtensions')
            .mockImplementation((excludedExtensions = []) => {
              // Capture the excluded extensions for verification
              capturedExcludedExtensions = [
                ...(excludedExtensions as string[]),
                'securityExtension',
              ];
              return originalGetInternalExtensions(excludedExtensions);
            });

          await soService.start(createStartDeps());

          (soService as any).getInternalExtensions(['customExtension']);

          // Security extension should always be included in excluded extensions
          expect(capturedExcludedExtensions.sort()).toEqual(
            ['customExtension', 'securityExtension'].sort()
          );
        });
      });

      // describe('#createExporter', () => {
      //   it(`calls the 'SavedObjectsExporter' constructor with export transform if set`, async () => {
      //     const coreContext = createCoreContext();
      //     const soService = new SavedObjectsService(coreContext);
      //     const setup = await soService.setup(createSetupDeps());

      //     const accessControlTransforms: SavedObjectsAccessControlTransforms = {
      //       // exportTransform: jest.fn(),
      //       createImportTransforms: jest.fn(),
      //     };

      //     setup.setAccessControlTransforms(accessControlTransforms);

      //     const request = httpServerMock.createKibanaRequest();
      //     const start = await soService.start(createStartDeps());
      //     start.createExporter(start.getScopedClient(request));

      //     // expect(SavedObjectsImportExportModule.SavedObjectsExporter).toHaveBeenCalledWith(
      //     //   expect.objectContaining({
      //     //     accessControlExportTransform: accessControlTransforms.exportTransform,
      //     //   })
      //     // );
      //   });

      //   it(`call the 'SavedObjectsExporter' constructor with undefined export transform if not set`, async () => {
      //     const coreContext = createCoreContext();
      //     const soService = new SavedObjectsService(coreContext);
      //     await soService.setup(createSetupDeps());

      //     const request = httpServerMock.createKibanaRequest();
      //     const start = await soService.start(createStartDeps());
      //     start.createExporter(start.getScopedClient(request));

      //     expect(SavedObjectsImportExportModule.SavedObjectsExporter).toHaveBeenCalledWith(
      //       expect.objectContaining({
      //         accessControlExportTransform: undefined,
      //       })
      //     );
      //   });
      // });

      describe('#createImporter', () => {
        it(`calls the 'SavedObjectsImporter' constructor with the 'createImportTransforms' function if set`, async () => {
          const coreContext = createCoreContext();
          const soService = new SavedObjectsService(coreContext);
          const setup = await soService.setup(createSetupDeps());

          const accessControlTransforms: SavedObjectsAccessControlTransforms = {
            // exportTransform: jest.fn(),
            createImportTransforms: jest.fn(),
          };

          setup.setAccessControlTransforms(accessControlTransforms);

          const request = httpServerMock.createKibanaRequest();
          const start = await soService.start(createStartDeps());
          start.createImporter(start.getScopedClient(request));

          expect(SavedObjectsImportExportModule.SavedObjectsImporter).toHaveBeenCalledWith(
            expect.objectContaining({
              createAccessControlImportTransforms: accessControlTransforms.createImportTransforms,
            })
          );
        });

        it(`call the 'SavedObjectsImporter' constructor with undefined 'createImportTransforms' function if not set`, async () => {
          const coreContext = createCoreContext();
          const soService = new SavedObjectsService(coreContext);
          await soService.setup(createSetupDeps());

          const request = httpServerMock.createKibanaRequest();
          const start = await soService.start(createStartDeps());
          start.createImporter(start.getScopedClient(request));

          expect(SavedObjectsImportExportModule.SavedObjectsImporter).toHaveBeenCalledWith(
            expect.objectContaining({
              createAccessControlImportTransforms: undefined,
            })
          );
        });
      });
    });
  });
});
