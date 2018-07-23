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

import Hapi from 'hapi';
import { SavedObjectsClient } from '../saved_objects_client';

type ClientFactory = (options: { request: Hapi.Request }) => SavedObjectsClient;
type WrapperFactory = (
  options: { request: Hapi.Request; client: SavedObjectsClient }
) => SavedObjectsClient;

interface ScopedSavedObjectsClientProviderOptions {
  defaultClientFactory: ClientFactory;
}

/**
 * Provider for the Scoped Saved Object Client.
 */
export class ScopedSavedObjectsClientProvider {
  private wrapperFactories: WrapperFactory[] = [];
  private clientFactory = this.params.defaultClientFactory;

  constructor(private params: ScopedSavedObjectsClientProviderOptions) {}

  // the client wrapper factories are put at the front of the array, so that
  // when we use `reduce` below they're invoked in LIFO order. This is so that
  // if multiple plugins register their client wrapper factories, then we can use
  // the plugin dependencies/optionalDependencies to implicitly control the order
  // in which these are used. For example, if we have a plugin a that declares a
  // dependency on plugin b, that means that plugin b's client wrapper would want
  // to be able to run first when the SavedObjectClient methods are invoked to
  // provide additional context to plugin a's client wrapper.
  public addClientWrapperFactory(wrapperFactory: WrapperFactory) {
    this.wrapperFactories.unshift(wrapperFactory);
  }

  public setClientFactory(customClientFactory: ClientFactory) {
    if (this.clientFactory !== this.params.defaultClientFactory) {
      throw new Error(`custom client factory is already set, unable to replace the current one`);
    }

    this.clientFactory = customClientFactory;
  }

  public getClient(request: Hapi.Request) {
    const client = this.clientFactory({
      request,
    });

    return this.wrapperFactories.reduce((clientToWrap, wrapperFactory) => {
      return wrapperFactory({
        request,
        client: clientToWrap,
      });
    }, client);
  }
}
