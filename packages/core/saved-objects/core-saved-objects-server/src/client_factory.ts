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
import type { ISavedObjectTypeRegistry } from './type_registry';

/**
 * Options passed to each SavedObjectsClientWrapperFactory to aid in creating the wrapper instance.
 * @public
 */
export interface SavedObjectsClientWrapperOptions {
  client: SavedObjectsClientContract;
  typeRegistry: ISavedObjectTypeRegistry;
  request: KibanaRequest;
}

/**
 * Describes the factory used to create instances of Saved Objects Client Wrappers.
 * @public
 */
export type SavedObjectsClientWrapperFactory = (
  options: SavedObjectsClientWrapperOptions
) => SavedObjectsClientContract;

/**
 * Describes the factory used to create instances of the Saved Objects Client.
 * @public
 */
export type SavedObjectsClientFactory = ({
  request,
  includedHiddenTypes,
}: {
  request: KibanaRequest;
  includedHiddenTypes?: string[];
}) => SavedObjectsClientContract;

/**
 * Provider to invoke to retrieve a {@link SavedObjectsClientFactory}.
 * @public
 */
export type SavedObjectsClientFactoryProvider = (
  repositoryFactory: SavedObjectsRepositoryFactory
) => SavedObjectsClientFactory;

/**
 * Options to control the creation of the Saved Objects Client.
 * @public
 */
export interface SavedObjectsClientProviderOptions {
  excludedWrappers?: string[];
  includedHiddenTypes?: string[];
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
