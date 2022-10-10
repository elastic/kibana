/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
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
