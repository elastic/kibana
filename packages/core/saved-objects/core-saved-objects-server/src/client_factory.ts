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
import type { ISavedObjectsEncryptionExtension } from './encryption';
import type { SavedObjectsExtensions } from './extensions';
import type { ISavedObjectsSecurityExtension } from './security';
import type { ISavedObjectsSpacesExtension } from './spaces';
import type { ISavedObjectTypeRegistry } from './type_registry';

/**
 * Describes the factory used to create instances of the Saved Objects Client.
 * @public
 */
export type SavedObjectsClientFactory = ({
  request,
  includedHiddenTypes,
  extensions,
}: {
  request: KibanaRequest;
  includedHiddenTypes?: string[];
  extensions?: SavedObjectsExtensions;
}) => SavedObjectsClientContract;

/**
 * Describes the factory used to create instances of the Saved Objects Encryption Extension.
 * @public
 */
export type SavedObjectsEncryptionExtensionFactory = (params: {
  typeRegistry: ISavedObjectTypeRegistry;
  request: KibanaRequest;
}) => ISavedObjectsEncryptionExtension;

/**
 * Describes the factory used to create instances of the Saved Objects Security Extension.
 * @public
 */
export type SavedObjectsSecurityExtensionFactory = (params: {
  typeRegistry: ISavedObjectTypeRegistry;
  request: KibanaRequest;
}) => ISavedObjectsSecurityExtension | undefined; // May be undefined if RBAC is disabled

/**
 * Describes the factory used to create instances of the Saved Objects Spaces Extension.
 * @public
 */
export type SavedObjectsSpacesExtensionFactory = (params: {
  typeRegistry: ISavedObjectTypeRegistry;
  request: KibanaRequest;
}) => ISavedObjectsSpacesExtension;

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
  includedHiddenTypes?: string[];
  excludedExtensions?: string[];
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
   * @param extensions - Extensions that the repository should use (for encryption, security, and spaces).
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
}
