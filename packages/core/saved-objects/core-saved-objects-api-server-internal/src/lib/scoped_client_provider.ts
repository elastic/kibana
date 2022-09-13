/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import type {
  ISavedObjectTypeRegistry,
  SavedObjectsClientWrapperFactory,
  SavedObjectsClientFactory,
  SavedObjectsClientProviderOptions,
} from '@kbn/core-saved-objects-server';
import { PriorityCollection } from './priority_collection';

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
  private readonly _wrapperFactories = new PriorityCollection<{
    id: string;
    factory: SavedObjectsClientWrapperFactory;
  }>();
  private _clientFactory: SavedObjectsClientFactory;
  private readonly _originalClientFactory: SavedObjectsClientFactory;
  private readonly _typeRegistry: ISavedObjectTypeRegistry;

  constructor({
    defaultClientFactory,
    typeRegistry,
  }: {
    defaultClientFactory: SavedObjectsClientFactory;
    typeRegistry: ISavedObjectTypeRegistry;
  }) {
    this._originalClientFactory = this._clientFactory = defaultClientFactory;
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
}
