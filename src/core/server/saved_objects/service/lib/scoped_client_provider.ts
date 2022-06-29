/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PriorityCollection } from './priority_collection';
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
export type SavedObjectsClientFactory = (params: {
  extensions: SavedObjectsExtensions;
  request: KibanaRequest;
  includedHiddenTypes?: string[];
}) => SavedObjectsClientContract;

export type SavedObjectsEncryptionExtensionFactory = (params: {
  typeRegistry: ISavedObjectTypeRegistry;
  request: KibanaRequest;
}) => ISavedObjectsEncryptionExtension;

export type SavedObjectsSecurityExtensionFactory = (params: {
  typeRegistry: ISavedObjectTypeRegistry;
  request: KibanaRequest;
}) => ISavedObjectsSecurityExtension | undefined; // May be undefined if RBAC is disabled

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
  excludedWrappers?: string[];
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
  private readonly _wrapperFactories = new PriorityCollection<{
    id: string;
    factory: SavedObjectsClientWrapperFactory;
  }>();
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

  addClientWrapperFactory(
    priority: number,
    id: string,
    factory: SavedObjectsClientWrapperFactory
  ): void {
    if (this._wrapperFactories.has((entry) => entry.id === id)) {
      throw new Error(`wrapper factory with id ${id} is already defined`);
    }

    this._wrapperFactories.add(priority, { id, factory });
  }

  setClientFactory(customClientFactory: SavedObjectsClientFactory) {
    if (this._clientFactory !== this._originalClientFactory) {
      throw new Error(`custom client factory is already set, unable to replace the current one`);
    }

    this._clientFactory = customClientFactory;
  }

  getClient(
    request: KibanaRequest,
    { includedHiddenTypes, excludedWrappers = [] }: SavedObjectsClientProviderOptions = {}
  ): SavedObjectsClientContract {
    const client = this._clientFactory({
      extensions: this.getExtensions(request, excludedWrappers),
      request,
      includedHiddenTypes,
    });

    return this._wrapperFactories
      .toPrioritizedArray()
      .reduceRight((clientToWrap, { id, factory }) => {
        if (excludedWrappers.includes(id)) {
          return clientToWrap;
        }

        return factory({
          request,
          client: clientToWrap,
          typeRegistry: this._typeRegistry,
        });
      }, client);
  }

  private getExtensions(
    request: KibanaRequest,
    excludedWrappers: string[]
  ): SavedObjectsExtensions {
    const isEncryptionExtensionIncluded =
      !excludedWrappers.includes(ENCRYPTION_EXTENSION_ID) && !!this.encryptionExtensionFactory;
    const encryptionExtension = isEncryptionExtensionIncluded
      ? this.encryptionExtensionFactory?.({ typeRegistry: this._typeRegistry, request })
      : undefined;
    const isSecurityExtensionIncluded =
      !excludedWrappers.includes(SECURITY_EXTENSION_ID) && !!this.securityExtensionFactory;
    const securityExtension = isSecurityExtensionIncluded
      ? this.securityExtensionFactory?.({ typeRegistry: this._typeRegistry, request })
      : undefined;
    const isSpacesExtensionIncluded =
      !excludedWrappers.includes(SPACES_EXTENSION_ID) && !!this.spacesExtensionFactory;
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
