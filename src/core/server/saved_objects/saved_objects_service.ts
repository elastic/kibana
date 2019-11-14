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
  SavedObjectsRepository,
  SavedObjectsSerializer,
  SavedObjectsClientProvider,
  ISavedObjectsClientProvider,
  SavedObjectsClientProviderOptions,
} from './';
import { getRootPropertiesObjects } from './mappings';
import { KibanaMigrator, IKibanaMigrator } from './migrations';
import { CoreContext } from '../core_context';
import { LegacyServiceDiscoverPlugins } from '../legacy/legacy_service';
import { ElasticsearchServiceSetup, CallAPIOptions } from '../elasticsearch';
import { KibanaConfigType } from '../kibana_config';
import { retryCallCluster } from '../elasticsearch/retry_call_cluster';
import { SavedObjectsConfigType } from './saved_objects_config';
import { KibanaRequest } from '../http';
import { SavedObjectsClientContract } from './types';
import { ISavedObjectsRepository } from './service/lib/repository';
import {
  SavedObjectsClientFactory,
  SavedObjectsClientWrapperFactory,
} from './service/lib/scoped_client_provider';
import { Logger } from '..';

/**
 * Saved Objects is Kibana's data persisentence mechanism allowing plugins to
 * use Elasticsearch for storing and querying state.
 *
 * Note: The Saved Object setup API's should only be used for creating and
 * registering client wrappers. The Saved Objects client can be access from the
 * {@link SavedObjectsServiceStart} or the
 * {@link RequestHandlerContext | route handler context}.
 *
 * Warning: Constructing a Saved Objects client for use within your own plugin
 * won't have any of the registered wrappers applied and is considered a
 * anti-pattern. There is almost always a better alternative that doesn't
 * require constructing your own client.
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
 * import {SavedObjectsClient, CoreSetup} from 'src/core/server';
 *
 * export class Plugin() {
 *   setup: (core: CoreSetup) => {
 *     core.savedObjects.setClientFactory(({request: KibanaRequest}) => {
 *       return new SavedObjectsClient(core.savedObjects.scopedRepository(request));
 *     })
 *   }
 * }
 *
 * @public
 */
export interface SavedObjectsServiceSetup {
  /**
   * Set a default factory for creating Saved Objects clients. Only one client
   * factory can be set, subsequent calls to this method will fail.
   */
  setClientFactory: (customClientFactory: SavedObjectsClientFactory<KibanaRequest>) => void;

  /**
   * Add a client wrapper with the given priority.
   */
  addClientWrapper: (
    priority: number,
    id: string,
    factory: SavedObjectsClientWrapperFactory<KibanaRequest>
  ) => void;

  /**
   * Creates a {@link ISavedObjectsRepository | Saved Objects repository} that
   * uses the credentials from the passed in request to authenticate with
   * Elasticsearch.
   */
  scopedRepository: (req: KibanaRequest, extraTypes?: string[]) => ISavedObjectsRepository;

  /**
   * Creates a {@link ISavedObjectsRepository | Saved Objects repository} that
   * uses the internal Kibana user for authenticating with Elasticsearch.
   *
   * For a client that uses the credentials and associated privileges of the
   * incoming request see the Saved Objects client exposed from the
   * {@link RequestHandlerContext}.
   */
  internalRepository: (extraTypes?: string[]) => ISavedObjectsRepository;
}

/**
 * @internal
 */
export interface InternalSavedObjectsServiceSetup extends SavedObjectsServiceSetup {
  scopedClient: (
    req: KibanaRequest,
    options?: SavedObjectsClientProviderOptions
  ) => SavedObjectsClientContract;
}

/**
 * Saved Objects is Kibana's data persisentence mechanism allowing plugins to
 * use Elasticsearch for storing and querying state.
 *
 * @public
 */
export interface SavedObjectsServiceStart {
  /**
   * Creates a {@link SavedObjectsClientContract | Saved Objects client} that
   * uses the credentials from the passed in request to authenticate with
   * Elasticsearch. Any middleware
   *
   * A client that is already scoped to the incoming request is also exposed
   * from the route handler context see {@link RequestHandlerContext}.
   */
  scopedClient: (
    req: KibanaRequest,
    options?: SavedObjectsClientProviderOptions
  ) => SavedObjectsClientContract;
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

/** @internal */
export interface SavedObjectsSetupDeps {
  legacyPlugins: LegacyServiceDiscoverPlugins;
  elasticsearch: ElasticsearchServiceSetup;
}

/** @internal */
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface SavedObjectsStartDeps {}

export class SavedObjectsService
  implements CoreService<InternalSavedObjectsServiceSetup, InternalSavedObjectsServiceStart> {
  private migrator: KibanaMigrator | undefined;
  private logger: Logger;
  private clientProvider: ISavedObjectsClientProvider<KibanaRequest> | undefined;

  constructor(private readonly coreContext: CoreContext) {
    this.logger = coreContext.logger.get('savedobjects-service');
  }

  public async setup(setupDeps: SavedObjectsSetupDeps): Promise<InternalSavedObjectsServiceSetup> {
    this.logger.debug('Setting up SavedObjects service');

    const {
      savedObjectSchemas,
      savedObjectMappings,
      savedObjectMigrations,
      savedObjectValidations,
    } = setupDeps.legacyPlugins.uiExports;

    const adminClient = await setupDeps.elasticsearch.adminClient$.pipe(first()).toPromise();

    const kibanaConfig = await this.coreContext.configService
      .atPath<KibanaConfigType>('kibana')
      .pipe(first())
      .toPromise();

    const savedObjectsConfig = await this.coreContext.configService
      .atPath<SavedObjectsConfigType>('migrations')
      .pipe(first())
      .toPromise();

    const migrator = (this.migrator = new KibanaMigrator({
      savedObjectSchemas,
      savedObjectMappings,
      savedObjectMigrations,
      savedObjectValidations,
      logger: this.coreContext.logger.get('migrations'),
      kibanaVersion: this.coreContext.env.packageInfo.version,
      config: setupDeps.legacyPlugins.pluginExtendedConfig,
      savedObjectsConfig,
      kibanaConfig,
      callCluster: retryCallCluster(adminClient.callAsInternalUser),
    }));

    const mappings = this.migrator.getActiveMappings();
    const allTypes = Object.keys(getRootPropertiesObjects(mappings));
    const schema = new SavedObjectsSchema(savedObjectSchemas);
    const serializer = new SavedObjectsSerializer(schema);
    const visibleTypes = allTypes.filter(type => !schema.isHiddenType(type));

    const createRepository = (
      callCluster: (
        endpoint: string,
        clientParams: Record<string, any>,
        options?: CallAPIOptions
      ) => Promise<any>,
      extraTypes: string[] = []
    ) => {
      extraTypes.forEach(type => {
        if (!allTypes.includes(type)) {
          throw new Error(`Missing mappings for saved objects type '${type}'`);
        }
      });

      const allowedTypes = [...new Set(visibleTypes.concat(extraTypes))];

      return new SavedObjectsRepository({
        index: kibanaConfig.index,
        config: setupDeps.legacyPlugins.pluginExtendedConfig,
        migrator,
        mappings,
        schema,
        serializer,
        allowedTypes,
        callCluster: retryCallCluster(callCluster),
      });
    };

    this.clientProvider = new SavedObjectsClientProvider<KibanaRequest>({
      defaultClientFactory({ request }) {
        const repository = createRepository(adminClient.asScoped(request).callAsCurrentUser);
        return new SavedObjectsClient(repository);
      },
    });

    return {
      scopedClient: this.clientProvider.getClient,
      setClientFactory: this.clientProvider.setClientFactory,
      addClientWrapper: this.clientProvider.addClientWrapperFactory,
      internalRepository: (extraTypes?: string[]) =>
        createRepository(adminClient.callAsInternalUser, extraTypes),
      scopedRepository: (req: KibanaRequest, extraTypes?: string[]) =>
        createRepository(adminClient.asScoped(req).callAsCurrentUser, extraTypes),
    };
  }

  public async start(core: SavedObjectsStartDeps): Promise<InternalSavedObjectsServiceStart> {
    if (!this.clientProvider) {
      throw new Error('#setup() needs to be run first');
    }

    this.logger.debug('Starting SavedObjects service');

    /**
     * Note: We want to ensure that migrations have completed before
     * continuing with further Core startup steps that might use SavedObjects
     * such as running the legacy server, legacy plugins and allowing incoming
     * HTTP requests.
     *
     * However, our build system optimize step and some tests depend on the
     * HTTP server running without an Elasticsearch server being available.
     * So, when the `migrations.skip` is true, we skip migrations altogether.
     */
    const cliArgs = this.coreContext.env.cliArgs;
    const savedObjectsConfig = await this.coreContext.configService
      .atPath<SavedObjectsConfigType>('migrations')
      .pipe(first())
      .toPromise();
    const skipMigrations = cliArgs.optimize || savedObjectsConfig.skip;
    await this.migrator!.runMigrations(skipMigrations);

    return {
      migrator: this.migrator!,
      clientProvider: this.clientProvider,
      scopedClient: this.clientProvider.getClient,
    };
  }

  public async stop() {}
}
