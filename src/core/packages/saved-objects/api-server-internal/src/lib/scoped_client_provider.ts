/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import type {
  ISavedObjectTypeRegistry,
  SavedObjectsClientFactory,
  SavedObjectsClientProviderOptions,
  SavedObjectsEncryptionExtensionFactory,
  SavedObjectsSecurityExtensionFactory,
  SavedObjectsSpacesExtensionFactory,
  SavedObjectsExtensions,
  SavedObjectsExtensionFactory,
} from '@kbn/core-saved-objects-server';
import {
  ENCRYPTION_EXTENSION_ID,
  SECURITY_EXTENSION_ID,
  SPACES_EXTENSION_ID,
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
  private readonly encryptionExtensionFactory?: SavedObjectsEncryptionExtensionFactory;
  private readonly securityExtensionFactory?: SavedObjectsSecurityExtensionFactory;
  private readonly spacesExtensionFactory?: SavedObjectsSpacesExtensionFactory;
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
    encryptionExtensionFactory?: SavedObjectsEncryptionExtensionFactory;
    securityExtensionFactory?: SavedObjectsSecurityExtensionFactory;
    spacesExtensionFactory?: SavedObjectsSpacesExtensionFactory;
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
    const createExt = <T>(
      extensionId: string,
      extensionFactory?: SavedObjectsExtensionFactory<T | undefined>
    ): T | undefined =>
      !excludedExtensions.includes(extensionId) && !!extensionFactory
        ? extensionFactory?.({ typeRegistry: this._typeRegistry, request })
        : undefined;

    return {
      encryptionExtension: createExt(ENCRYPTION_EXTENSION_ID, this.encryptionExtensionFactory),
      securityExtension: createExt(SECURITY_EXTENSION_ID, this.securityExtensionFactory),
      spacesExtension: createExt(SPACES_EXTENSION_ID, this.spacesExtensionFactory),
    };
  }
}
