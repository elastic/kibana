/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

// import { PriorityCollection } from './priority_collection';
import { SavedObjectsClientContract } from '../../types';
import {
  ENCRYPTION_EXTENSION_ID,
  SECURITY_EXTENSION_ID,
  SPACES_EXTENSION_ID,
  SavedObjectsRepositoryFactory,
} from '../../saved_objects_service';
import { ISavedObjectTypeRegistry } from '../../saved_objects_type_registry';
import { KibanaRequest } from '../../../http';
import type {
  ISavedObjectsEncryptionExtension,
  ISavedObjectsSecurityExtension,
  ISavedObjectsSpacesExtension,
  SavedObjectsExtensions,
} from './extensions';

/**
 * Describes the factory used to create instances of the Saved Objects Client.
 * @public
 */
export type SavedObjectsClientFactory = (params: {
  extensions: SavedObjectsExtensions;
  request: KibanaRequest;
  includedHiddenTypes?: string[];
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
  excludedExtensions?: string[];
  includedHiddenTypes?: string[];
}

/**
 * @internal
 */
export type ISavedObjectsClientProvider = Pick<
  SavedObjectsClientProvider,
  keyof SavedObjectsClientProvider
>;

/**
 * Only exported for unit testing
 *
 * @internal
 */
export interface Params {
  defaultClientFactory: SavedObjectsClientFactory;
  typeRegistry: ISavedObjectTypeRegistry;
  encryptionExtensionFactory: SavedObjectsEncryptionExtensionFactory | undefined;
  securityExtensionFactory: SavedObjectsSecurityExtensionFactory | undefined;
  spacesExtensionFactory: SavedObjectsSpacesExtensionFactory | undefined;
}

/**
 * Provider for the Scoped Saved Objects Client.
 *
 * @internal
 */
export class SavedObjectsClientProvider {
  private _clientFactory: SavedObjectsClientFactory;
  private readonly _originalClientFactory: SavedObjectsClientFactory;
  private readonly encryptionExtensionFactory: SavedObjectsEncryptionExtensionFactory | undefined;
  private readonly securityExtensionFactory: SavedObjectsSecurityExtensionFactory | undefined;
  private readonly spacesExtensionFactory: SavedObjectsSpacesExtensionFactory | undefined;
  private readonly _typeRegistry: ISavedObjectTypeRegistry;

  constructor({
    defaultClientFactory,
    encryptionExtensionFactory,
    securityExtensionFactory,
    spacesExtensionFactory,
    typeRegistry,
  }: Params) {
    this._originalClientFactory = this._clientFactory = defaultClientFactory;
    this.encryptionExtensionFactory = encryptionExtensionFactory;
    this.securityExtensionFactory = securityExtensionFactory;
    this.spacesExtensionFactory = spacesExtensionFactory;
    this._typeRegistry = typeRegistry;
  }

  setClientFactory(customClientFactory: SavedObjectsClientFactory) {
    if (this._clientFactory !== this._originalClientFactory) {
      throw new Error(`custom client factory is already set, unable to replace the current one`);
    }

    this._clientFactory = customClientFactory;
  }

  getClient(
    request: KibanaRequest,
    { includedHiddenTypes, excludedExtensions = [] }: SavedObjectsClientProviderOptions = {}
  ): SavedObjectsClientContract {
    return this._clientFactory({
      extensions: this.getExtensions(request, excludedExtensions),
      request,
      includedHiddenTypes,
    });
  }

  private getExtensions(
    request: KibanaRequest,
    excludedExtensions: string[]
  ): SavedObjectsExtensions {
    const isEncryptionExtensionIncluded =
      !excludedExtensions.includes(ENCRYPTION_EXTENSION_ID) && !!this.encryptionExtensionFactory;
    const encryptionExtension = isEncryptionExtensionIncluded
      ? this.encryptionExtensionFactory?.({ typeRegistry: this._typeRegistry, request })
      : undefined;
    const isSecurityExtensionIncluded =
      !excludedExtensions.includes(SECURITY_EXTENSION_ID) && !!this.securityExtensionFactory;
    const securityExtension = isSecurityExtensionIncluded
      ? this.securityExtensionFactory?.({ typeRegistry: this._typeRegistry, request })
      : undefined;
    const isSpacesExtensionIncluded =
      !excludedExtensions.includes(SPACES_EXTENSION_ID) && !!this.spacesExtensionFactory;
    const spacesExtension = isSpacesExtensionIncluded
      ? this.spacesExtensionFactory?.({ typeRegistry: this._typeRegistry, request })
      : undefined;

    return {
      encryptionExtension,
      securityExtension,
      spacesExtension,
    };
  }
}
