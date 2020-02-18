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

import { CoreService } from 'src/core/types';
import { first, filter, take } from 'rxjs/operators';
import {
  SavedObjectsClient,
  SavedObjectsClientProvider,
  ISavedObjectsClientProvider,
  SavedObjectsClientProviderOptions,
} from './';
import { KibanaMigrator, IKibanaMigrator } from './migrations';
import { CoreContext } from '../core_context';
import { LegacyServiceDiscoverPlugins } from '../legacy';
import { InternalElasticsearchServiceSetup, APICaller } from '../elasticsearch';
import { KibanaConfigType } from '../kibana_config';
import { migrationsRetryCallCluster } from '../elasticsearch/retry_call_cluster';
import {
  SavedObjectsConfigType,
  SavedObjectsMigrationConfigType,
  SavedObjectConfig,
} from './saved_objects_config';
import { InternalHttpServiceSetup, KibanaRequest } from '../http';
import { SavedObjectsClientContract, SavedObjectsType, SavedObjectsLegacyUiExports } from './types';
import { ISavedObjectsRepository, SavedObjectsRepository } from './service/lib/repository';
import {
  SavedObjectsClientFactoryProvider,
  SavedObjectsClientWrapperFactory,
} from './service/lib/scoped_client_provider';
import { Logger } from '../logging';
import { convertLegacyTypes } from './utils';
import { SavedObjectTypeRegistry, ISavedObjectTypeRegistry } from './saved_objects_type_registry';
import { PropertyValidators } from './validation';
import { registerRoutes } from './routes';
import { SavedObjectsSerializer } from './serialization';

/**
 * Saved Objects is Kibana's data persistence mechanism allowing plugins to
 * use Elasticsearch for storing and querying state. The
 * SavedObjectsServiceSetup API exposes methods for creating and registering
 * Saved Object client wrappers.
 *
 * @remarks
 * Note: The Saved Object setup API's should only be used for creating and
 * registering client wrappers. Constructing a Saved Objects client or
 * repository for use within your own plugin won't have any of the registered
 * wrappers applied and is considered an anti-pattern. Use the Saved Objects
 * client from the
 * {@link SavedObjectsServiceStart | SavedObjectsServiceStart#getScopedClient }
 * method or the {@link RequestHandlerContext | route handler context} instead.
 *
 * When plugins access the Saved Objects client, a new client is created using
 * the factory provided to `setClientFactory` and wrapped by all wrappers
 * registered through `addClientWrapper`. To create a factory or wrapper,
 * plugins will have to construct a Saved Objects client. First create a
 * repository by calling `scopedRepository` or `internalRepository` and then
 * use this repository as the argument to the {@link SavedObjectsClient}
 * constructor.
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
}

/**
 * @internal
 */
export interface InternalSavedObjectsServiceSetup extends SavedObjectsServiceSetup {
  registerType: (type: SavedObjectsType) => void;
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
   * @param extraTypes - A list of additional hidden types the repository should have access to.
   *
   * @remarks
   * Prefer using `getScopedClient`. This should only be used when using methods
   * not exposed on {@link SavedObjectsClientContract}
   */
  createScopedRepository: (req: KibanaRequest, extraTypes?: string[]) => ISavedObjectsRepository;
  /**
   * Creates a {@link ISavedObjectsRepository | Saved Objects repository} that
   * uses the internal Kibana user for authenticating with Elasticsearch.
   *
   * @param extraTypes - A list of additional hidden types the repository should have access to.
   */
  createInternalRepository: (extraTypes?: string[]) => ISavedObjectsRepository;
  /**
   * Creates a {@link SavedObjectsSerializer | serializer} that is aware of all registered types.
   */
  createSerializer: () => SavedObjectsSerializer;
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
  /**
   * @deprecated Exposed only for injecting into Legacy
   */
  typeRegistry: ISavedObjectTypeRegistry;
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
   * @param extraTypes - A list of additional hidden types the repository should have access to.
   */
  createScopedRepository: (req: KibanaRequest, extraTypes?: string[]) => ISavedObjectsRepository;
  /**
   * Creates a {@link ISavedObjectsRepository | Saved Objects repository} that
   * uses the internal Kibana user for authenticating with Elasticsearch.
   *
   * @param extraTypes - A list of additional hidden types the repository should have access to.
   */
  createInternalRepository: (extraTypes?: string[]) => ISavedObjectsRepository;
}

/** @internal */
export interface SavedObjectsSetupDeps {
  legacyPlugins: LegacyServiceDiscoverPlugins;
  elasticsearch: InternalElasticsearchServiceSetup;
  http: InternalHttpServiceSetup;
}

interface WrappedClientFactoryWrapper {
  priority: number;
  id: string;
  factory: SavedObjectsClientWrapperFactory;
}

/** @internal */
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface SavedObjectsStartDeps {}

export class SavedObjectsService
  implements CoreService<InternalSavedObjectsServiceSetup, InternalSavedObjectsServiceStart> {
  private logger: Logger;

  private setupDeps?: SavedObjectsSetupDeps;
  private config?: SavedObjectConfig;
  private clientFactoryProvider?: SavedObjectsClientFactoryProvider;
  private clientFactoryWrappers: WrappedClientFactoryWrapper[] = [];

  private typeRegistry = new SavedObjectTypeRegistry();
  private validations: PropertyValidators = {};

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
    legacyTypes.forEach(type => this.typeRegistry.registerType(type));
    this.validations = setupDeps.legacyPlugins.uiExports.savedObjectValidations || {};

    const importableExportableTypes = getImportableAndExportableTypes(
      setupDeps.legacyPlugins.uiExports
    );

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
      importableExportableTypes,
    });

    return {
      setClientFactoryProvider: provider => {
        if (this.clientFactoryProvider) {
          throw new Error('custom client factory is already set, and can only be set once');
        }
        this.clientFactoryProvider = provider;
      },
      addClientWrapper: (priority, id, factory) => {
        this.clientFactoryWrappers.push({
          priority,
          id,
          factory,
        });
      },
      registerType: type => {
        this.typeRegistry.registerType(type);
      },
    };
  }

  public async start(
    core: SavedObjectsStartDeps,
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
    const adminClient = this.setupDeps!.elasticsearch.adminClient;
    const migrator = this.createMigrator(kibanaConfig, this.config.migration, migrationsRetryDelay);

    /**
     * Note: We want to ensure that migrations have completed before
     * continuing with further Core start steps that might use SavedObjects
     * such as running the legacy server, legacy plugins and allowing incoming
     * HTTP requests.
     *
     * However, our build system optimize step and some tests depend on the
     * HTTP server running without an Elasticsearch server being available.
     * So, when the `migrations.skip` is true, we skip migrations altogether.
     */
    const cliArgs = this.coreContext.env.cliArgs;
    const skipMigrations = cliArgs.optimize || this.config.migration.skip;

    if (skipMigrations) {
      this.logger.warn(
        'Skipping Saved Object migrations on startup. Note: Individual documents will still be migrated when read or written.'
      );
    } else {
      this.logger.info(
        'Waiting until all Elasticsearch nodes are compatible with Kibana before starting saved objects migrations...'
      );
      await this.setupDeps!.elasticsearch.esNodesCompatibility$.pipe(
        filter(nodes => nodes.isCompatible),
        take(1)
      ).toPromise();

      this.logger.info('Starting saved objects migrations');
      await migrator.runMigrations();
    }

    const createRepository = (callCluster: APICaller, extraTypes: string[] = []) => {
      return SavedObjectsRepository.createRepository(
        migrator,
        this.typeRegistry,
        kibanaConfig.index,
        callCluster,
        extraTypes
      );
    };

    const repositoryFactory: SavedObjectsRepositoryFactory = {
      createInternalRepository: (extraTypes?: string[]) =>
        createRepository(adminClient.callAsInternalUser, extraTypes),
      createScopedRepository: (req: KibanaRequest, extraTypes?: string[]) =>
        createRepository(adminClient.asScoped(req).callAsCurrentUser, extraTypes),
    };

    const clientProvider = new SavedObjectsClientProvider({
      defaultClientFactory({ request }) {
        const repository = repositoryFactory.createScopedRepository(request);
        return new SavedObjectsClient(repository);
      },
    });
    if (this.clientFactoryProvider) {
      const clientFactory = this.clientFactoryProvider(repositoryFactory);
      clientProvider.setClientFactory(clientFactory);
    }
    this.clientFactoryWrappers.forEach(({ id, factory, priority }) => {
      clientProvider.addClientWrapperFactory(priority, id, factory);
    });

    return {
      migrator,
      clientProvider,
      typeRegistry: this.typeRegistry,
      getScopedClient: clientProvider.getClient.bind(clientProvider),
      createScopedRepository: repositoryFactory.createScopedRepository,
      createInternalRepository: repositoryFactory.createInternalRepository,
      createSerializer: () => new SavedObjectsSerializer(this.typeRegistry),
    };
  }

  public async stop() {}

  private createMigrator(
    kibanaConfig: KibanaConfigType,
    savedObjectsConfig: SavedObjectsMigrationConfigType,
    migrationsRetryDelay?: number
  ): KibanaMigrator {
    const adminClient = this.setupDeps!.elasticsearch.adminClient;

    return new KibanaMigrator({
      typeRegistry: this.typeRegistry,
      logger: this.logger,
      kibanaVersion: this.coreContext.env.packageInfo.version,
      savedObjectsConfig,
      savedObjectValidations: this.validations,
      kibanaConfig,
      callCluster: migrationsRetryCallCluster(
        adminClient.callAsInternalUser,
        this.logger,
        migrationsRetryDelay
      ),
    });
  }
}

function getImportableAndExportableTypes({
  savedObjectMappings = [],
  savedObjectsManagement = {},
}: SavedObjectsLegacyUiExports) {
  const visibleTypes = savedObjectMappings.reduce(
    (types, mapping) => [...types, ...Object.keys(mapping.properties)],
    [] as string[]
  );
  return visibleTypes.filter(
    type => savedObjectsManagement[type]?.isImportableAndExportable === true ?? false
  );
}
