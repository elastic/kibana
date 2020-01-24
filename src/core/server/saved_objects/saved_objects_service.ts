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
import { first } from 'rxjs/operators';
import {
  SavedObjectsClient,
  SavedObjectsSchema,
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
import { SavedObjectsConfigType } from './saved_objects_config';
import { KibanaRequest } from '../http';
import { SavedObjectsClientContract, SavedObjectsLegacyMapping } from './types';
import { ISavedObjectsRepository, SavedObjectsRepository } from './service/lib/repository';
import {
  SavedObjectsClientFactoryProvider,
  SavedObjectsClientWrapperFactory,
} from './service/lib/scoped_client_provider';
import { Logger } from '../logging';
import { SavedObjectsTypeMapping } from './mappings';
import { MigrationDefinition } from './migrations/core/document_migrator';
import { SavedObjectsSchemaDefinition } from './schema';
import { PropertyValidators } from './validation';
// import { PluginOpaqueId } from '..';

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
 * import { SavedObjectsClient, CoreSetup } from 'src/core/server';
 *
 * export class Plugin() {
 *   setup: (core: CoreSetup) => {
 *     core.savedObjects.setClientFactory(({ request: KibanaRequest }) => {
 *       return new SavedObjectsClient(core.savedObjects.scopedRepository(request));
 *     })
 *   }
 * }
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

  // registerMapping: (type: string, mapping: SavedObjectsMapping) => void;
  // registerMappingFile: (mappings: Map<string, SOMapping>) => void;
}

/**
 * @internal
 */
export type InternalSavedObjectsServiceSetup = SavedObjectsServiceSetup;

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
  private clientFactoryProvider?: SavedObjectsClientFactoryProvider;
  private clientFactoryWrappers: WrappedClientFactoryWrapper[] = [];

  private mappings: SavedObjectsTypeMapping[] = [];
  private migrations: MigrationDefinition = {};
  private schemas: SavedObjectsSchemaDefinition = {};
  private validations: PropertyValidators = {};

  constructor(private readonly coreContext: CoreContext) {
    this.logger = coreContext.logger.get('savedobjects-service');
  }

  public async setup(setupDeps: SavedObjectsSetupDeps): Promise<InternalSavedObjectsServiceSetup> {
    this.logger.debug('Setting up SavedObjects service');

    this.setupDeps = setupDeps;

    const {
      savedObjectSchemas: savedObjectsSchemasDefinition,
      savedObjectMappings: legacyMappings,
      savedObjectMigrations,
      savedObjectValidations,
    } = setupDeps.legacyPlugins.uiExports;

    this.mappings = convertLegacyMappings(legacyMappings);
    this.migrations = savedObjectMigrations;
    this.schemas = savedObjectsSchemasDefinition;
    this.validations = savedObjectValidations;

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
    };
  }

  public async start(
    core: SavedObjectsStartDeps,
    migrationsRetryDelay?: number
  ): Promise<InternalSavedObjectsServiceStart> {
    if (!this.setupDeps) {
      throw new Error('#setup() needs to be run first');
    }

    this.logger.debug('Starting SavedObjects service');

    const kibanaConfig = await this.coreContext.configService
      .atPath<KibanaConfigType>('kibana')
      .pipe(first())
      .toPromise();
    const savedObjectsConfig = await this.coreContext.configService
      .atPath<SavedObjectsConfigType>('migrations')
      .pipe(first())
      .toPromise();
    const adminClient = this.setupDeps!.elasticsearch.adminClient;
    const migrator = this.createMigrator(kibanaConfig, savedObjectsConfig, migrationsRetryDelay);

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
    const skipMigrations = cliArgs.optimize || savedObjectsConfig.skip;

    this.logger.debug('Starting saved objects migration');
    await migrator.runMigrations(skipMigrations);
    this.logger.debug('Saved objects migration completed');

    const createRepository = (callCluster: APICaller, extraTypes: string[] = []) => {
      return SavedObjectsRepository.createRepository(
        migrator,
        new SavedObjectsSchema(this.schemas),
        this.setupDeps!.legacyPlugins.pluginExtendedConfig,
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
      getScopedClient: clientProvider.getClient.bind(clientProvider),
      createScopedRepository: repositoryFactory.createScopedRepository,
      createInternalRepository: repositoryFactory.createInternalRepository,
    };
  }

  public async stop() {}

  private createMigrator(
    kibanaConfig: KibanaConfigType,
    savedObjectsConfig: SavedObjectsConfigType,
    migrationsRetryDelay?: number
  ): KibanaMigrator {
    const savedObjectSchemas = new SavedObjectsSchema(this.schemas);
    const adminClient = this.setupDeps!.elasticsearch.adminClient;

    return new KibanaMigrator({
      savedObjectSchemas,
      savedObjectMappings: this.mappings,
      savedObjectMigrations: this.migrations,
      savedObjectValidations: this.validations,
      logger: this.coreContext.logger.get('migrations'),
      kibanaVersion: this.coreContext.env.packageInfo.version,
      config: this.setupDeps!.legacyPlugins.pluginExtendedConfig,
      savedObjectsConfig,
      kibanaConfig,
      callCluster: migrationsRetryCallCluster(
        adminClient.callAsInternalUser,
        this.coreContext.logger.get('migrations'),
        migrationsRetryDelay
      ),
    });
  }
}

const convertLegacyMappings = (
  legacyMappings: SavedObjectsLegacyMapping[]
): SavedObjectsTypeMapping[] => {
  return legacyMappings.reduce((mappings, { pluginId, properties }) => {
    return [
      ...mappings,
      ...Object.entries(properties).map(([type, definition]) => ({
        pluginId,
        type,
        definition,
      })),
    ];
  }, [] as SavedObjectsTypeMapping[]);
};
