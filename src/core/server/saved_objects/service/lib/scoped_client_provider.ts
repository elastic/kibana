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

/**
 * Options passed to each SavedObjectsClientWrapperFactory to aid in creating the wrapper instance.
 * @public
 */
export interface SavedObjectsClientWrapperOptions<Request = unknown> {
  client: SavedObjectsClientContract;
  request: Request;
}

/**
 * Describes the factory used to create instances of Saved Objects Client Wrappers.
 * @public
 */
export type SavedObjectsClientWrapperFactory<Request = unknown> = (
  options: SavedObjectsClientWrapperOptions<Request>
) => SavedObjectsClientContract;

/**
 * Describes the factory used to create instances of the Saved Objects Client.
 * @public
 */
export type SavedObjectsClientFactory<Request = unknown> = ({
  request,
}: {
  request: Request;
}) => SavedObjectsClientContract;

/**
 * Options to control the creation of the Saved Objects Client.
 * @public
 */
export interface SavedObjectsClientProviderOptions {
  excludedWrappers?: string[];
}

/**
 * @internal
 */
export type ISavedObjectsClientProvider<T = unknown> = Pick<
  SavedObjectsClientProvider<T>,
  keyof SavedObjectsClientProvider
>;

/**
 * Provider for the Scoped Saved Objects Client.
 *
 * @internal
 *
 * @internalRemarks Because `getClient` is synchronous the Client Provider does
 * not support creating factories that react to new ES clients emitted from
 * elasticsearch.adminClient$. The Client Provider therefore doesn't support
 * configuration changes to the Elasticsearch client. TODO: revisit once we've
 * closed https://github.com/elastic/kibana/pull/45796
 */
export class SavedObjectsClientProvider<Request = unknown> {
  private readonly _wrapperFactories = new PriorityCollection<{
    id: string;
    factory: SavedObjectsClientWrapperFactory<Request>;
  }>();
  private _clientFactory: SavedObjectsClientFactory<Request>;
  private readonly _originalClientFactory: SavedObjectsClientFactory<Request>;

  constructor({
    defaultClientFactory,
  }: {
    defaultClientFactory: SavedObjectsClientFactory<Request>;
  }) {
    this._originalClientFactory = this._clientFactory = defaultClientFactory;
  }

  addClientWrapperFactory(
    priority: number,
    id: string,
    factory: SavedObjectsClientWrapperFactory<Request>
  ): void {
    if (this._wrapperFactories.has(entry => entry.id === id)) {
      throw new Error(`wrapper factory with id ${id} is already defined`);
    }

    this._wrapperFactories.add(priority, { id, factory });
  }

  setClientFactory(customClientFactory: SavedObjectsClientFactory<Request>) {
    if (this._clientFactory !== this._originalClientFactory) {
      throw new Error(`custom client factory is already set, unable to replace the current one`);
    }

    this._clientFactory = customClientFactory;
  }

  getClient(
    request: Request,
    options: SavedObjectsClientProviderOptions = {}
  ): SavedObjectsClientContract {
    const client = this._clientFactory({
      request,
    });

    const excludedWrappers = options.excludedWrappers || [];

    return this._wrapperFactories
      .toPrioritizedArray()
      .reduceRight((clientToWrap, { id, factory }) => {
        if (excludedWrappers.includes(id)) {
          return clientToWrap;
        }

        return factory({
          request,
          client: clientToWrap,
        });
      }, client);
  }
}
