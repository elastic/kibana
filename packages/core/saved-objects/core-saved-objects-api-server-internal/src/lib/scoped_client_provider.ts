/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { KibanaRequest } from '@kbn/core-http-server';
import { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import {
  ISavedObjectTypeRegistry,
  SavedObjectsClientFactory,
  SavedObjectsClientProviderOptions,
  SavedObjectsEncryptionExtensionFactory,
  SavedObjectsSecurityExtensionFactory,
  SavedObjectsSpacesExtensionFactory,
  SavedObjectsExtensions,
  ENCRYPTION_EXTENSION_ID,
  SECURITY_EXTENSION_ID,
  SPACES_EXTENSION_ID,
  ISavedObjectsEncryptionExtension,
  ISavedObjectsSecurityExtension,
  ISavedObjectsSpacesExtension,
} from '@kbn/core-saved-objects-server';

/**
 * @internal
 */
export type ISavedObjectsClientProvider = Pick<
  SavedObjectsClientProvider,
  keyof SavedObjectsClientProvider
>;

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
    typeRegistry,
    encryptionExtensionFactory,
    securityExtensionFactory,
    spacesExtensionFactory,
  }: {
    defaultClientFactory: SavedObjectsClientFactory;
    typeRegistry: ISavedObjectTypeRegistry;
    encryptionExtensionFactory: SavedObjectsEncryptionExtensionFactory | undefined;
    securityExtensionFactory: SavedObjectsSecurityExtensionFactory | undefined;
    spacesExtensionFactory: SavedObjectsSpacesExtensionFactory | undefined;
  }) {
    this._originalClientFactory = this._clientFactory = defaultClientFactory;
    this._typeRegistry = typeRegistry;
    this.encryptionExtensionFactory = encryptionExtensionFactory;
    this.securityExtensionFactory = securityExtensionFactory;
    this.spacesExtensionFactory = spacesExtensionFactory;
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
      request,
      includedHiddenTypes,
      extensions: this.getExtensions(request, excludedExtensions),
    });
  }

  getExtensions(request: KibanaRequest, excludedExtensions: string[]): SavedObjectsExtensions {
    const extensionInfo = [
      { id: ENCRYPTION_EXTENSION_ID, factory: this.encryptionExtensionFactory },
      { id: SECURITY_EXTENSION_ID, factory: this.securityExtensionFactory },
      { id: SPACES_EXTENSION_ID, factory: this.spacesExtensionFactory },
    ];

    const extensions = extensionInfo.map((extension) => {
      const isIncluded = !excludedExtensions.includes(extension.id) && !!extension.factory;
      return isIncluded
        ? extension.factory?.({ typeRegistry: this._typeRegistry, request })
        : undefined;
    });

    const encryptionExtension = extensions[0] as ISavedObjectsEncryptionExtension | undefined;
    const securityExtension = extensions[1] as ISavedObjectsSecurityExtension | undefined;
    const spacesExtension = extensions[2] as ISavedObjectsSpacesExtension | undefined;

    return {
      encryptionExtension,
      securityExtension,
      spacesExtension,
    };
  }
}
