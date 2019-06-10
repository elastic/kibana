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
import { SavedObjectsClientContract } from '..';

export interface SavedObjectsClientWrapperOptions<Request = unknown> {
  client: SavedObjectsClientContract;
  request: Request;
}

export type SavedObjectsClientWrapperFactory<Request = unknown> = (
  options: SavedObjectsClientWrapperOptions<Request>
) => SavedObjectsClientContract;

export type SavedObjectsClientFactory<Request = unknown> = (
  { request }: { request: Request }
) => SavedObjectsClientContract;

/**
 * Provider for the Scoped Saved Object Client.
 */
export class ScopedSavedObjectsClientProvider<Request = unknown> {
  private readonly _wrapperFactories = new PriorityCollection<
    SavedObjectsClientWrapperFactory<Request>
  >();
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
    wrapperFactory: SavedObjectsClientWrapperFactory<Request>
  ): void {
    this._wrapperFactories.add(priority, wrapperFactory);
  }

  setClientFactory(customClientFactory: SavedObjectsClientFactory) {
    if (this._clientFactory !== this._originalClientFactory) {
      throw new Error(`custom client factory is already set, unable to replace the current one`);
    }

    this._clientFactory = customClientFactory;
  }

  getClient(request: Request): SavedObjectsClientContract {
    const client = this._clientFactory({
      request,
    });

    return this._wrapperFactories
      .toPrioritizedArray()
      .reduceRight((clientToWrap, wrapperFactory) => {
        return wrapperFactory({
          request,
          client: clientToWrap,
        });
      }, client);
  }
}
