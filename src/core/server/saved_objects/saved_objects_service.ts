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

import { Subject, Observable } from 'rxjs';
import { first, filter, take, switchMap } from 'rxjs/operators';
import { CoreService } from '../../types';
import {
  SavedObjectsClient,
  SavedObjectsClientProvider,
  ISavedObjectsClientProvider,
  SavedObjectsClientProviderOptions,
} from './';
import { KibanaMigrator, IKibanaMigrator } from './migrations';
import { CoreContext } from '../core_context';
import { LegacyServiceDiscoverPlugins } from '../legacy';
import {
  LegacyAPICaller,
  ElasticsearchServiceStart,
  ILegacyClusterClient,
  InternalElasticsearchServiceSetup,
} from '../elasticsearch';
import { KibanaConfigType } from '../kibana_config';
import { migrationsRetryCallCluster } from '../elasticsearch/legacy';
import {
  SavedObjectsConfigType,
  SavedObjectsMigrationConfigType,
  SavedObjectConfig,
} from './saved_objects_config';
import { KibanaRequest, InternalHttpServiceSetup } from '../http';
import { SavedObjectsClientContract, SavedObjectsType, SavedObjectStatusMeta } from './types';
import { ISavedObjectsRepository, SavedObjectsRepository } from './service/lib/repository';
import {
  SavedObjectsClientFactoryProvider,
  SavedObjectsClientWrapperFactory,
} from './service/lib/scoped_client_provider';
import { Logger } from '../logging';
import { convertLegacyTypes } from './utils';
import { SavedObjectTypeRegistry, ISavedObjectTypeRegistry } from './saved_objects_type_registry';
import { PropertyValidators } from './validation';
import { SavedObjectsSerializer } from './serialization';
import { registerRoutes } from './routes';
import { ServiceStatus } from '../status';
import { calculateStatus$ } from './status';

/**
 * Saved Objects is Kibana's data persistence mechanism allowing plugins to
 * use Elasticsearch for storing and querying state. The SavedObjectsServiceSetup API exposes methods
 * for registering Saved Object types, creating and registering Saved Object client wrappers and factories.
 *
 * @remarks
 * When plugins access the Saved Objects client, a new client is created using
 * the factory provided to `setClientFactory` and wrapped by all wrappers
 * registered through `addClientWrapper`.
 *
 * All the setup APIs will throw if called after the service has started, and therefor cannot be used
 * from legacy plugin code. Legacy plugins should use the legacy savedObject service until migrated.
 *
 * @example
 * ```ts
 * import { SavedObjectsClient, CoreSetup } from 'src/core/server';
 *
 * export class Plugin() {
 *   setup: (core: CoreSetup) => {
 *     core.savedObjects.setClientFactory(({ request: KibanaRequest }) => {
 *       return new SavedObjectsClient(core.savedObjects.scopedRepository(request));
 *     })
 *   }
 * }
 * ```
 *
 * @example
 * ```ts
 * import { SavedObjectsClient, CoreSetup } from 'src/core/server';
 * import { mySoType } from './saved_objects'
 *
 * export class Plugin() {
 *   setup: (core: CoreSetup) => {
 *     core.savedObjects.registerType(mySoType);
 *   }
 * }
 * ```
 *
 * @public
 */
export interface SavedObjectsServiceSetup {
  /**
   * Set the default {@link SavedObjectsClientFactoryProvider | factory provider} for creating Saved Objects clients.
   * Only one provider can be set, subsequent calls to this method will fail.
   */
  setClientFactoryProvider: (clientFactoryProvider: SavedObjectsClientFactoryProvider) => void;

  /**
   * Add a {@link SavedObjectsClientWrapperFactory | client wrapper factory} with the given priority.
   */
  addClientWrapper: (
    priority: number,
    id: string,
    factory: SavedObjectsClientWrapperFactory
  ) => void;

  /**
   * Register a {@link SavedObjectsType | savedObjects type} definition.
   *
   * See the {@link SavedObjectsTypeMappingDefinition | mappings format} and
   * {@link SavedObjectMigrationMap | migration format} for more details about these.
   *
   * @example
   * ```ts
   * // src/plugins/my_plugin/server/saved_objects/my_type.ts
   * import { SavedObjectsType } from 'src/core/server';
   * import * as migrations from './migrations';
   *
   * export const myType: SavedObjectsType = {
   *   name: 'MyType',
   *   hidden: false,
   *   namespaceType: 'multiple',
   *   mappings: {
   *     properties: {
   *       textField: {
   *         type: 'text',
   *       },
   *       boolField: {
   *         type: 'boolean',
   *       },
   *     },
   *   },
   *   migrations: {
   *     '2.0.0': migrations.migrateToV2,
   *     '2.1.0': migrations.migrateToV2_1
   *   },
   * };
   *
   * // src/plugins/my_plugin/server/plugin.ts
   * import { SavedObjectsClient, CoreSetup } from 'src/core/server';
   * import { myType } from './saved_objects';
   *
   * export class Plugin() {
   *   setup: (core: CoreSetup) => {
   *     core.savedObjects.registerType(myType);
   *   }
   * }
   * ```
   *
   * @remarks The type definition is an aggregation of the legacy savedObjects `schema`, `mappings` and `migration` concepts.
   * This API is the single entry point to register saved object types in the new platform.
   */
  registerType: (type: SavedObjectsType) => void;

  /**
   * Returns the maximum number of objects allowed for import or export operations.
   */
  getImportExportObjectLimit: () => number;
}

/**
 * @internal
 */
export interface InternalSavedObjectsServiceSetup extends SavedObjectsServiceSetup {
  status$: Observable<ServiceStatus<SavedObjectStatusMeta>>;
}

/**
 * Saved Objects is Kibana's data persisentence mechanism allowing plugins to
 * use Elasticsearch for storing and querying state. The
 * SavedObjectsServiceStart API provides a scoped Saved Objects client for
 * interacting with Saved Objects.
 *
 * @public
 */
export interface SavedObjectsServiceStart {
  /**
   * Creates a {@link SavedObjectsClientContract | Saved Objects client} that
   * uses the credentials from the passed in request to authenticate with
   * Elasticsearch. If other plugins have registered Saved Objects client
   * wrappers, these will be applied to extend the functionality of the client.
   *
   * A client that is already scoped to the incoming request is also exposed
   * from the route handler context see {@link RequestHandlerContext}.
   */
  getScopedClient: (
    req: KibanaRequest,
    options?: SavedObjectsClientProviderOptions
  ) => SavedObjectsClientContract;
  /**
   * Creates a {@link ISavedObjectsRepository | Saved Objects repository} that
   * uses the credentials from the passed in request to authenticate with
   * Elasticsearch.
   *
   * @param req - The request to create the scoped repository from.
   * @param includedHiddenTypes - A list of additional hidden types the repository should have access to.
   *
   * @remarks
   * Prefer using `getScopedClient`. This should only be used when using methods
   * not exposed on {@link SavedObjectsClientContract}
   */
  createScopedRepository: (
    req: KibanaRequest,
    includedHiddenTypes?: string[]
  ) => ISavedObjectsRepository;
  /**
   * Creates a {@link ISavedObjectsRepository | Saved Objects repository} that
   * uses the internal Kibana user for authenticating with Elasticsearch.
   *
   * @param includedHiddenTypes - A list of additional hidden types the repository should have access to.
   */
  createInternalRepository: (includedHiddenTypes?: string[]) => ISavedObjectsRepository;
  /**
   * Creates a {@link SavedObjectsSerializer | serializer} that is aware of all registered types.
   */
  createSerializer: () => SavedObjectsSerializer;
  /**
   * Returns the {@link ISavedObjectTypeRegistry | registry} containing all registered
   * {@link SavedObjectsType | saved object types}
   */
  getTypeRegistry: () => ISavedObjectTypeRegistry;
}

export interface InternalSavedObjectsServiceStart extends SavedObjectsServiceStart {
  /**
   * @deprecated Exposed only for injecting into Legacy
   */
  migrator: IKibanaMigrator;
  /**
   * @deprecated Exposed only for injecting into Legacy
   */
  clientProvider: ISavedObjectsClientProvider;
}

/**
 * Factory provided when invoking a {@link SavedObjectsClientFactoryProvider | client factory provider}
 * See {@link SavedObjectsServiceSetup.setClientFactoryProvider}
 *
 * @public
 */
export interface SavedObjectsRepositoryFactory {
  /**
   * Creates a {@link ISavedObjectsRepository | Saved Objects repository} that
   * uses the credentials from the passed in request to authenticate with
   * Elasticsearch.
   *
   * @param includedHiddenTypes - A list of additional hidden types the repository should have access to.
   */
  createScopedRepository: (
    req: KibanaRequest,
    includedHiddenTypes?: string[]
  ) => ISavedObjectsRepository;
  /**
   * Creates a {@link ISavedObjectsRepository | Saved Objects repository} that
   * uses the internal Kibana user for authenticating with Elasticsearch.
   *
   * @param includedHiddenTypes - A list of additional hidden types the repository should have access to.
   */
  createInternalRepository: (includedHiddenTypes?: string[]) => ISavedObjectsRepository;
}

/** @internal */
export interface SavedObjectsSetupDeps {
  http: InternalHttpServiceSetup;
  legacyPlugins: LegacyServiceDiscoverPlugins;
  elasticsearch: InternalElasticsearchServiceSetup;
}

interface WrappedClientFactoryWrapper {
  priority: number;
  id: string;
  factory: SavedObjectsClientWrapperFactory;
}

/** @internal */
export interface SavedObjectsStartDeps {
  elasticsearch: ElasticsearchServiceStart;
  pluginsInitialized?: boolean;
}

export class SavedObjectsService
  implements CoreService<InternalSavedObjectsServiceSetup, InternalSavedObjectsServiceStart> {
  private logger: Logger;

  private setupDeps?: SavedObjectsSetupDeps;
  private config?: SavedObjectConfig;
  private clientFactoryProvider?: SavedObjectsClientFactoryProvider;
  private clientFactoryWrappers: WrappedClientFactoryWrapper[] = [];

  private migrator$ = new Subject<KibanaMigrator>();
  private typeRegistry = new SavedObjectTypeRegistry();
  private validations: PropertyValidators = {};
  private started = false;

  constructor(private readonly coreContext: CoreContext) {
    this.logger = coreContext.logger.get('savedobjects-service');
  }

  public async setup(setupDeps: SavedObjectsSetupDeps): Promise<InternalSavedObjectsServiceSetup> {
    this.logger.debug('Setting up SavedObjects service');

    this.setupDeps = setupDeps;

    const legacyTypes = convertLegacyTypes(
      setupDeps.legacyPlugins.uiExports,
      setupDeps.legacyPlugins.pluginExtendedConfig
    );
    legacyTypes.forEach((type) => this.typeRegistry.registerType(type));
    this.validations = setupDeps.legacyPlugins.uiExports.savedObjectValidations || {};

    const savedObjectsConfig = await this.coreContext.configService
      .atPath<SavedObjectsConfigType>('savedObjects')
      .pipe(first())
      .toPromise();
    const savedObjectsMigrationConfig = await this.coreContext.configService
      .atPath<SavedObjectsMigrationConfigType>('migrations')
      .pipe(first())
      .toPromise();
    this.config = new SavedObjectConfig(savedObjectsConfig, savedObjectsMigrationConfig);

    registerRoutes({
      http: setupDeps.http,
      logger: this.logger,
      config: this.config,
      migratorPromise: this.migrator$.pipe(first()).toPromise(),
    });

    return {
      status$: calculateStatus$(
        this.migrator$.pipe(switchMap((migrator) => migrator.getStatus$())),
        setupDeps.elasticsearch.status$
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
      addClientWrapper: (priority, id, factory) => {
        if (this.started) {
          throw new Error('cannot call `addClientWrapper` after service startup.');
        }
        this.clientFactoryWrappers.push({
          priority,
          id,
          factory,
        });
      },
      registerType: (type) => {
        if (this.started) {
          throw new Error('cannot call `registerType` after service startup.');
        }
        this.typeRegistry.registerType(type);
      },
      getImportExportObjectLimit: () => this.config!.maxImportExportSize,
    };
  }

  public async start(
    { elasticsearch, pluginsInitialized = true }: SavedObjectsStartDeps,
    migrationsRetryDelay?: number
  ): Promise<InternalSavedObjectsServiceStart> {
    if (!this.setupDeps || !this.config) {
      throw new Error('#setup() needs to be run first');
    }

    this.logger.debug('Starting SavedObjects service');

    const kibanaConfig = await this.coreContext.configService
      .atPath<KibanaConfigType>('kibana')
      .pipe(first())
      .toPromise();
    const client = elasticsearch.legacy.client;

    const migrator = this.createMigrator(
      kibanaConfig,
      this.config.migration,
      client,
      migrationsRetryDelay
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

    if (skipMigrations) {
      this.logger.warn(
        'Skipping Saved Object migrations on startup. Note: Individual documents will still be migrated when read or written.'
      );
    } else {
      this.logger.info(
        'Waiting until all Elasticsearch nodes are compatible with Kibana before starting saved objects migrations...'
      );

      // TODO: Move to Status Service https://github.com/elastic/kibana/issues/41983
      this.setupDeps!.elasticsearch.esNodesCompatibility$.subscribe(({ isCompatible, message }) => {
        if (!isCompatible && message) {
          this.logger.error(message);
        }
      });

      await this.setupDeps!.elasticsearch.esNodesCompatibility$.pipe(
        filter((nodes) => nodes.isCompatible),
        take(1)
      ).toPromise();

      this.logger.info('Starting saved objects migrations');
      await migrator.runMigrations();
    }

    const createRepository = (callCluster: LegacyAPICaller, includedHiddenTypes: string[] = []) => {
      return SavedObjectsRepository.createRepository(
        migrator,
        this.typeRegistry,
        kibanaConfig.index,
        callCluster,
        includedHiddenTypes
      );
    };

    const repositoryFactory: SavedObjectsRepositoryFactory = {
      createInternalRepository: (includedHiddenTypes?: string[]) =>
        createRepository(client.callAsInternalUser, includedHiddenTypes),
      createScopedRepository: (req: KibanaRequest, includedHiddenTypes?: string[]) =>
        createRepository(client.asScoped(req).callAsCurrentUser, includedHiddenTypes),
    };

    const clientProvider = new SavedObjectsClientProvider({
      defaultClientFactory({ request, includedHiddenTypes }) {
        const repository = repositoryFactory.createScopedRepository(request, includedHiddenTypes);
        return new SavedObjectsClient(repository);
      },
      typeRegistry: this.typeRegistry,
    });
    if (this.clientFactoryProvider) {
      const clientFactory = this.clientFactoryProvider(repositoryFactory);
      clientProvider.setClientFactory(clientFactory);
    }
    this.clientFactoryWrappers.forEach(({ id, factory, priority }) => {
      clientProvider.addClientWrapperFactory(priority, id, factory);
    });

    this.started = true;

    return {
      migrator,
      clientProvider,
      getScopedClient: clientProvider.getClient.bind(clientProvider),
      createScopedRepository: repositoryFactory.createScopedRepository,
      createInternalRepository: repositoryFactory.createInternalRepository,
      createSerializer: () => new SavedObjectsSerializer(this.typeRegistry),
      getTypeRegistry: () => this.typeRegistry,
    };
  }

  public async stop() {}

  private createMigrator(
    kibanaConfig: KibanaConfigType,
    savedObjectsConfig: SavedObjectsMigrationConfigType,
    esClient: ILegacyClusterClient,
    migrationsRetryDelay?: number
  ): KibanaMigrator {
    return new KibanaMigrator({
      typeRegistry: this.typeRegistry,
      logger: this.logger,
      kibanaVersion: this.coreContext.env.packageInfo.version,
      savedObjectsConfig,
      savedObjectValidations: this.validations,
      kibanaConfig,
      callCluster: migrationsRetryCallCluster(
        esClient.callAsInternalUser,
        this.logger,
        migrationsRetryDelay
      ),
    });
  }
}
