/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Subject, Observable, firstValueFrom, of } from 'rxjs';
import { filter, switchMap } from 'rxjs';
import type { Logger } from '@kbn/logging';
import { stripVersionQualifier } from '@kbn/std';
import type { ServiceStatus } from '@kbn/core-status-common';
import type { CoreContext, CoreService } from '@kbn/core-base-server-internal';
import type { DocLinksServiceStart } from '@kbn/core-doc-links-server';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { InternalHttpServiceSetup } from '@kbn/core-http-server-internal';
import type {
  ElasticsearchClient,
  ElasticsearchCapabilities,
} from '@kbn/core-elasticsearch-server';
import type {
  InternalElasticsearchServiceSetup,
  InternalElasticsearchServiceStart,
} from '@kbn/core-elasticsearch-server-internal';
import type {
  SavedObjectsServiceSetup,
  SavedObjectsServiceStart,
  SavedObjectsRepositoryFactory,
  SavedObjectStatusMeta,
  SavedObjectsClientFactoryProvider,
  ISavedObjectTypeRegistry,
  SavedObjectsEncryptionExtensionFactory,
  SavedObjectsSecurityExtensionFactory,
  SavedObjectsSpacesExtensionFactory,
  SavedObjectsExtensions,
} from '@kbn/core-saved-objects-server';
import {
  SavedObjectConfig,
  SavedObjectsSerializer,
  SavedObjectTypeRegistry,
  type SavedObjectsConfigType,
  type SavedObjectsMigrationConfigType,
  type IKibanaMigrator,
  DEFAULT_INDEX_TYPES_MAP,
  HASH_TO_VERSION_MAP,
} from '@kbn/core-saved-objects-base-server-internal';
import {
  SavedObjectsClient,
  SavedObjectsClientProvider,
} from '@kbn/core-saved-objects-api-server-internal';
import { KibanaMigrator } from '@kbn/core-saved-objects-migration-server-internal';
import { SavedObjectsRepository } from '@kbn/core-saved-objects-api-server-internal';
import {
  SavedObjectsExporter,
  SavedObjectsImporter,
} from '@kbn/core-saved-objects-import-export-server-internal';
import type { InternalCoreUsageDataSetup } from '@kbn/core-usage-data-base-server-internal';
import type { DeprecationRegistryProvider } from '@kbn/core-deprecations-server';
import type { NodeInfo } from '@kbn/core-node-server';
import { MAIN_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server';
import { registerRoutes } from './routes';
import { calculateStatus$ } from './status';
import { registerCoreObjectTypes } from './object_types';
import { getSavedObjectsDeprecationsProvider } from './deprecations';
import { applyTypeDefaults } from './apply_type_defaults';
import { getAllIndices } from './utils';
import { MIGRATION_CLIENT_OPTIONS } from './constants';

/**
 * @internal
 */
export interface InternalSavedObjectsServiceSetup extends SavedObjectsServiceSetup {
  status$: Observable<ServiceStatus<SavedObjectStatusMeta>>;
  /** Note: this must be called after server.setup to get all plugin SO types */
  getTypeRegistry: () => ISavedObjectTypeRegistry;
}

/**
 * @internal
 */
export interface InternalSavedObjectsServiceStart extends SavedObjectsServiceStart {
  metrics: {
    /**
     * The number of milliseconds it took to run the SO migrator.
     *
     * Note: it's the time spent in the `migrator.runMigrations` call.
     * The value will be recorded even if a migration wasn't strictly performed,
     * and in that case it will just be the time spent checking if a migration was required.
     */
    migrationDuration: number;
  };
}

/** @internal */
export interface SavedObjectsSetupDeps {
  http: InternalHttpServiceSetup;
  elasticsearch: InternalElasticsearchServiceSetup;
  coreUsageData: InternalCoreUsageDataSetup;
  deprecations: DeprecationRegistryProvider;
}

/** @internal */
export interface SavedObjectsStartDeps {
  elasticsearch: InternalElasticsearchServiceStart;
  pluginsInitialized?: boolean;
  docLinks: DocLinksServiceStart;
  node: NodeInfo;
}

export class SavedObjectsService
  implements CoreService<InternalSavedObjectsServiceSetup, InternalSavedObjectsServiceStart>
{
  private logger: Logger;
  private readonly kibanaVersion: string;

  private setupDeps?: SavedObjectsSetupDeps;
  private config?: SavedObjectConfig;
  private clientFactoryProvider?: SavedObjectsClientFactoryProvider;
  private encryptionExtensionFactory?: SavedObjectsEncryptionExtensionFactory;
  private securityExtensionFactory?: SavedObjectsSecurityExtensionFactory;
  private spacesExtensionFactory?: SavedObjectsSpacesExtensionFactory;

  private migrator$ = new Subject<IKibanaMigrator>();
  private typeRegistry = new SavedObjectTypeRegistry();
  private started = false;

  constructor(private readonly coreContext: CoreContext) {
    this.logger = coreContext.logger.get('savedobjects-service');
    this.kibanaVersion = stripVersionQualifier(this.coreContext.env.packageInfo.version);
  }

  public async setup(setupDeps: SavedObjectsSetupDeps): Promise<InternalSavedObjectsServiceSetup> {
    this.logger.debug('Setting up SavedObjects service');

    this.setupDeps = setupDeps;
    const { http, elasticsearch, coreUsageData, deprecations } = setupDeps;

    const savedObjectsConfig = await firstValueFrom(
      this.coreContext.configService.atPath<SavedObjectsConfigType>('savedObjects')
    );
    const savedObjectsMigrationConfig = await firstValueFrom(
      this.coreContext.configService.atPath<SavedObjectsMigrationConfigType>('migrations')
    );
    this.config = new SavedObjectConfig(savedObjectsConfig, savedObjectsMigrationConfig);
    deprecations.getRegistry('savedObjects').registerDeprecations(
      getSavedObjectsDeprecationsProvider({
        kibanaIndex: MAIN_SAVED_OBJECT_INDEX,
        savedObjectsConfig: this.config,
        kibanaVersion: this.kibanaVersion,
        typeRegistry: this.typeRegistry,
      })
    );

    coreUsageData.registerType(this.typeRegistry);

    registerRoutes({
      http,
      coreUsageData,
      logger: this.logger,
      config: this.config,
      migratorPromise: firstValueFrom(this.migrator$),
      kibanaIndex: MAIN_SAVED_OBJECT_INDEX,
      kibanaVersion: this.kibanaVersion,
      isServerless: this.coreContext.env.packageInfo.buildFlavor === 'serverless',
    });

    registerCoreObjectTypes(this.typeRegistry);

    const skipMigration = this.config.migration.skip;

    return {
      status$: calculateStatus$(
        skipMigration
          ? of({ status: 'completed' })
          : this.migrator$.pipe(switchMap((migrator) => migrator.getStatus$())),
        elasticsearch.status$
      ),
      setClientFactoryProvider: (provider) => {
        if (this.started) {
          throw new Error('cannot call `setClientFactoryProvider` after service startup.');
        }
        if (this.clientFactoryProvider) {
          throw new Error('custom client factory is already set, and can only be set once');
        }
        this.clientFactoryProvider = provider;
      },
      setEncryptionExtension: (factory) => {
        if (this.started) {
          throw new Error('cannot call `setEncryptionExtension` after service startup.');
        }
        if (this.encryptionExtensionFactory) {
          throw new Error('encryption extension is already set, and can only be set once');
        }
        this.encryptionExtensionFactory = factory;
      },
      setSecurityExtension: (factory) => {
        if (this.started) {
          throw new Error('cannot call `setSecurityExtension` after service startup.');
        }
        if (this.securityExtensionFactory) {
          throw new Error('security extension is already set, and can only be set once');
        }
        this.securityExtensionFactory = factory;
      },
      setSpacesExtension: (factory) => {
        if (this.started) {
          throw new Error('cannot call `setSpacesExtension` after service startup.');
        }
        if (this.spacesExtensionFactory) {
          throw new Error('spaces extension is already set, and can only be set once');
        }
        this.spacesExtensionFactory = factory;
      },
      registerType: (type) => {
        if (this.started) {
          throw new Error('cannot call `registerType` after service startup.');
        }
        this.typeRegistry.registerType(applyTypeDefaults(type));
      },
      getTypeRegistry: () => this.typeRegistry,
      getDefaultIndex: () => MAIN_SAVED_OBJECT_INDEX,
    };
  }

  public async start({
    elasticsearch,
    pluginsInitialized = true,
    docLinks,
    node,
  }: SavedObjectsStartDeps): Promise<InternalSavedObjectsServiceStart> {
    if (!this.setupDeps || !this.config) {
      throw new Error('#setup() needs to be run first');
    }

    this.logger.debug('Starting SavedObjects service');

    const client = elasticsearch.client;

    const waitForMigrationCompletion = node.roles.backgroundTasks && !node.roles.ui;
    const migrator = this.createMigrator(
      this.config.migration,
      // override the default Client settings
      client.asInternalUser.child(MIGRATION_CLIENT_OPTIONS),
      docLinks,
      waitForMigrationCompletion,
      node,
      elasticsearch.getCapabilities()
    );

    this.migrator$.next(migrator);

    /**
     * Note: We want to ensure that migrations have completed before
     * continuing with further Core start steps that might use SavedObjects
     * such as running the legacy server, legacy plugins and allowing incoming
     * HTTP requests.
     *
     * However, our build system optimize step and some tests depend on the
     * HTTP server running without an Elasticsearch server being available.
     * So, when the `migrations.skip` is true, we skip migrations altogether.
     *
     * We also cannot safely run migrations if plugins are not initialized since
     * not plugin migrations won't be registered.
     */
    const skipMigrations = this.config.migration.skip || !pluginsInitialized;

    /**
     * Note: Prepares all migrations maps. If a saved object type was registered with property `migrations`
     * of type function; this function will be called to get the type's SavedObjectMigrationMap.
     */
    migrator.prepareMigrations();

    let migrationDuration: number;

    if (skipMigrations) {
      this.logger.warn(
        'Skipping Saved Object migrations on startup. Note: Individual documents will still be migrated when read or written.'
      );
      migrationDuration = 0;
    } else {
      this.logger.info(
        'Waiting until all Elasticsearch nodes are compatible with Kibana before starting saved objects migrations...'
      );

      try {
        // The Elasticsearch service should already ensure that, but let's double check just in case.
        // Should it be replaced with elasticsearch.status$ API instead?
        await firstValueFrom(
          this.setupDeps!.elasticsearch.esNodesCompatibility$.pipe(
            filter((nodes) => nodes.isCompatible)
          )
        );
      } catch (e) {
        // EmptyError means esNodesCompatibility$ was closed before emitting
        // which should only occur if the server is shutdown before being fully started.
        if (e.name === 'EmptyError') {
          throw new Error('esNodesCompatibility$ was closed before emitting');
        }
        throw e;
      }

      this.logger.info('Starting saved objects migrations');
      const migrationStartTime = performance.now();
      await migrator.runMigrations();
      migrationDuration = Math.round(performance.now() - migrationStartTime);
    }

    const createRepository = (
      esClient: ElasticsearchClient,
      includedHiddenTypes: string[] = [],
      extensions?: SavedObjectsExtensions
    ) => {
      return SavedObjectsRepository.createRepository(
        migrator,
        this.typeRegistry,
        MAIN_SAVED_OBJECT_INDEX,
        esClient,
        this.logger.get('repository'),
        includedHiddenTypes,
        extensions
      );
    };

    const repositoryFactory: SavedObjectsRepositoryFactory = {
      createInternalRepository: (
        includedHiddenTypes?: string[],
        extensions?: SavedObjectsExtensions | undefined
      ) => createRepository(client.asInternalUser, includedHiddenTypes, extensions),
      createScopedRepository: (
        req: KibanaRequest,
        includedHiddenTypes?: string[],
        extensions?: SavedObjectsExtensions
      ) => createRepository(client.asScoped(req).asCurrentUser, includedHiddenTypes, extensions),
    };

    const clientProvider = new SavedObjectsClientProvider({
      defaultClientFactory({ request, includedHiddenTypes, extensions }): SavedObjectsClient {
        const repository = repositoryFactory.createScopedRepository(
          request,
          includedHiddenTypes,
          extensions
        );
        return new SavedObjectsClient(repository);
      },
      typeRegistry: this.typeRegistry,
      encryptionExtensionFactory: this.encryptionExtensionFactory,
      securityExtensionFactory: this.securityExtensionFactory,
      spacesExtensionFactory: this.spacesExtensionFactory,
    });

    if (this.clientFactoryProvider) {
      const clientFactory = this.clientFactoryProvider(repositoryFactory);
      clientProvider.setClientFactory(clientFactory);
    }

    const allIndices = getAllIndices({ registry: this.typeRegistry });

    this.started = true;

    return {
      getScopedClient: clientProvider.getClient.bind(clientProvider),
      createScopedRepository: repositoryFactory.createScopedRepository,
      createInternalRepository: repositoryFactory.createInternalRepository,
      createSerializer: () => new SavedObjectsSerializer(this.typeRegistry),
      createExporter: (savedObjectsClient) =>
        new SavedObjectsExporter({
          savedObjectsClient,
          typeRegistry: this.typeRegistry,
          exportSizeLimit: this.config!.maxImportExportSize,
          logger: this.logger.get('exporter'),
        }),
      createImporter: (savedObjectsClient, options) =>
        new SavedObjectsImporter({
          savedObjectsClient,
          typeRegistry: this.typeRegistry,
          importSizeLimit: options?.importSizeLimit ?? this.config!.maxImportExportSize,
        }),
      getTypeRegistry: () => this.typeRegistry,
      getDefaultIndex: () => MAIN_SAVED_OBJECT_INDEX,
      getIndexForType: (type: string) => {
        const definition = this.typeRegistry.getType(type);
        return definition?.indexPattern ?? MAIN_SAVED_OBJECT_INDEX;
      },
      getIndicesForTypes: (types: string[]) => {
        const indices = new Set<string>();
        types.forEach((type) => {
          const definition = this.typeRegistry.getType(type);
          const index = definition?.indexPattern ?? MAIN_SAVED_OBJECT_INDEX;
          indices.add(index);
        });
        return [...indices];
      },
      getAllIndices: () => [...allIndices],
      metrics: {
        migrationDuration,
      },
    };
  }

  public async stop() {}

  private createMigrator(
    soMigrationsConfig: SavedObjectsMigrationConfigType,
    client: ElasticsearchClient,
    docLinks: DocLinksServiceStart,
    waitForMigrationCompletion: boolean,
    nodeInfo: NodeInfo,
    esCapabilities: ElasticsearchCapabilities
  ): IKibanaMigrator {
    return new KibanaMigrator({
      typeRegistry: this.typeRegistry,
      logger: this.logger,
      kibanaVersion: this.kibanaVersion,
      soMigrationsConfig,
      kibanaIndex: MAIN_SAVED_OBJECT_INDEX,
      defaultIndexTypesMap: DEFAULT_INDEX_TYPES_MAP,
      hashToVersionMap: HASH_TO_VERSION_MAP,
      client,
      docLinks,
      waitForMigrationCompletion,
      nodeRoles: nodeInfo.roles,
      esCapabilities,
    });
  }
}
