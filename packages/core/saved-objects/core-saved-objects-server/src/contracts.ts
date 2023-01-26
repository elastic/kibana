/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import type {
  SavedObjectsClientContract,
  ISavedObjectsRepository,
} from '@kbn/core-saved-objects-api-server';
import type { ISavedObjectsSerializer } from './serialization';
import type {
  SavedObjectsClientFactoryProvider,
  SavedObjectsClientProviderOptions,
  SavedObjectsEncryptionExtensionFactory,
  SavedObjectsSecurityExtensionFactory,
  SavedObjectsSpacesExtensionFactory,
} from './client_factory';
import type { SavedObjectsType } from './saved_objects_type';
import type { ISavedObjectTypeRegistry } from './type_registry';
import type { ISavedObjectsExporter } from './export';
import type { ISavedObjectsImporter, SavedObjectsImporterOptions } from './import';
import type { SavedObjectsExtensions } from './extensions/extensions';

/**
 * Saved Objects is Kibana's data persistence mechanism allowing plugins to
 * use Elasticsearch for storing and querying state. The SavedObjectsServiceSetup API exposes methods
 * or registering Saved Object types, and creating and registering Saved Object client factories.
 *
 * @remarks
 * When plugins access the Saved Objects client, a new client is created using
 * the factory provided to `setClientFactory`.
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
   * Sets the {@link SavedObjectsEncryptionExtensionFactory encryption extension factory}.
   */
  setEncryptionExtension: (factory: SavedObjectsEncryptionExtensionFactory) => void;

  /**
   * Sets the {@link SavedObjectsSecurityExtensionFactory security extension factory}.
   */
  setSecurityExtension: (factory: SavedObjectsSecurityExtensionFactory) => void;

  /**
   * Sets the {@link SavedObjectsSpacesExtensionFactory spaces extension factory}.
   */
  setSpacesExtension: (factory: SavedObjectsSpacesExtensionFactory) => void;

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
   * import * as schemas from './schemas';
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
   *   schemas: {
   *     '2.0.0': schemas.v2,
   *     '2.1.0': schemas.v2_1,
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
   */
  registerType: <Attributes = unknown>(type: SavedObjectsType<Attributes>) => void;

  /**
   * Returns the default index used for saved objects.
   */
  getKibanaIndex: () => string;
}

/**
 * Saved Objects is Kibana's data persistence mechanism allowing plugins to
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
   * Elasticsearch.
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
   * @param extensions - Extensions that the repository should use (for encryption, security, and spaces).
   *
   * @remarks
   * Prefer using `getScopedClient`. This should only be used when using methods
   * not exposed on {@link SavedObjectsClientContract}
   */
  createScopedRepository: (
    req: KibanaRequest,
    includedHiddenTypes?: string[],
    extensions?: SavedObjectsExtensions
  ) => ISavedObjectsRepository;
  /**
   * Creates a {@link ISavedObjectsRepository | Saved Objects repository} that
   * uses the internal Kibana user for authenticating with Elasticsearch.
   *
   * @param includedHiddenTypes - A list of additional hidden types the repository should have access to.
   * @param extensions - Extensions that the repository should use (for encryption, security, and spaces).
   */
  createInternalRepository: (
    includedHiddenTypes?: string[],
    extensions?: SavedObjectsExtensions
  ) => ISavedObjectsRepository;
  /**
   * Creates a {@link ISavedObjectsSerializer | serializer} that is aware of all registered types.
   */
  createSerializer: () => ISavedObjectsSerializer;
  /**
   * Creates an {@link ISavedObjectsExporter | exporter} bound to given client.
   */
  createExporter: (client: SavedObjectsClientContract) => ISavedObjectsExporter;
  /**
   * Creates an {@link ISavedObjectsImporter | importer} bound to given client.
   */
  createImporter: (
    client: SavedObjectsClientContract,
    options?: SavedObjectsImporterOptions
  ) => ISavedObjectsImporter;
  /**
   * Returns the {@link ISavedObjectTypeRegistry | registry} containing all registered
   * {@link SavedObjectsType | saved object types}
   */
  getTypeRegistry: () => ISavedObjectTypeRegistry;
}
