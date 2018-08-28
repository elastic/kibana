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

/**
 * Provider for the Scoped Saved Object Client.
 */
export class ScopedSavedObjectsClientProvider {

  _wrapperFactories = [];

  constructor({
    defaultClientFactory
  }) {
    this._originalClientFactory = this._clientFactory = defaultClientFactory;
  }

  // the client wrapper factories are put at the front of the array, so that
  // when we use `reduce` below they're invoked in LIFO order. This is so that
  // if multiple plugins register their client wrapper factories, then we can use
  // the plugin dependencies/optionalDependencies to implicitly control the order
  // in which these are used. For example, if we have a plugin a that declares a
  // dependency on plugin b, that means that plugin b's client wrapper would want
  // to be able to run first when the SavedObjectClient methods are invoked to
  // provide additional context to plugin a's client wrapper.
  addClientWrapperFactory(wrapperFactory) {
    this._wrapperFactories.unshift(wrapperFactory);
  }

  setClientFactory(customClientFactory) {
    if (this._clientFactory !== this._originalClientFactory) {
      throw new Error(`custom client factory is already set, unable to replace the current one`);
    }

    this._clientFactory = customClientFactory;
  }

  getClient(request) {
    const client = this._clientFactory({
      request,
    });

    return this._wrapperFactories.reduce((clientToWrap, wrapperFactory) => {
      return wrapperFactory({
        request,
        client: clientToWrap,
      });
    }, client);
  }
}
