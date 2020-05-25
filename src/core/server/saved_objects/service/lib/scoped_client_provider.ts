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
import { PriorityCollection } from './priority_collection';
import { SavedObjectsClientContract } from '../../types';
import { SavedObjectsRepositoryFactory } from '../../saved_objects_service';
import { ISavedObjectTypeRegistry } from '../../saved_objects_type_registry';
import { KibanaRequest } from '../../../http';

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
