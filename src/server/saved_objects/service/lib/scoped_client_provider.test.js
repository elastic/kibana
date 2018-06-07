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

import { ScopedSavedObjectsClientProvider } from './scoped_client_provider';

test(`uses default client factory when one isn't set`, () => {
  const returnValue = Symbol();
  const defaultClientFactoryMock = jest.fn().mockReturnValue(returnValue);
  const index = Symbol();
  const mappings = Symbol();
  const onBeforeWrite = () => {};
  const request = Symbol();

  const clientProvider = new ScopedSavedObjectsClientProvider({
    index,
    mappings,
    onBeforeWrite,
    defaultClientFactory: defaultClientFactoryMock
  });
  const result = clientProvider.getClient(request);

  expect(result).toBe(returnValue);
  expect(defaultClientFactoryMock).toHaveBeenCalledTimes(1);
  expect(defaultClientFactoryMock).toHaveBeenCalledWith({
    request,
    index,
    mappings,
    onBeforeWrite,
  });
});

test(`uses custom client factory when one is set`, () => {
  const defaultClientFactoryMock = jest.fn();
  const index = Symbol();
  const mappings = Symbol();
  const onBeforeWrite = () => {};
  const request = Symbol();
  const returnValue = Symbol();
  const customClientFactoryMock = jest.fn().mockReturnValue(returnValue);

  const clientProvider = new ScopedSavedObjectsClientProvider({
    index,
    mappings,
    onBeforeWrite,
    defaultClientFactory: defaultClientFactoryMock
  });
  clientProvider.setClientFactory(customClientFactoryMock);
  const result = clientProvider.getClient(request);

  expect(result).toBe(returnValue);
  expect(defaultClientFactoryMock).not.toHaveBeenCalled();
  expect(customClientFactoryMock).toHaveBeenCalledTimes(1);
  expect(customClientFactoryMock).toHaveBeenCalledWith({
    request,
    index,
    mappings,
    onBeforeWrite,
  });
});

test(`throws error when more than one scoped saved objects client factory is set`, () => {
  const clientProvider = new ScopedSavedObjectsClientProvider({});
  clientProvider.setClientFactory(() => {});
  expect(() => {
    clientProvider.setClientFactory(() => {});
  }).toThrowErrorMatchingSnapshot();
});

test(`invokes and uses instance from single added wrapper factory`, () => {
  const defaultClient = Symbol();
  const defaultClientFactoryMock = jest.fn().mockReturnValue(defaultClient);
  const clientProvider = new ScopedSavedObjectsClientProvider({
    defaultClientFactory: defaultClientFactoryMock
  });
  const wrappedClient = Symbol();
  const clientWrapperFactoryMock = jest.fn().mockReturnValue(wrappedClient);
  const request = Symbol();

  clientProvider.addClientWrapperFactory(clientWrapperFactoryMock);
  const actualClient = clientProvider.getClient(request);

  expect(actualClient).toBe(wrappedClient);
  expect(clientWrapperFactoryMock).toHaveBeenCalledWith({
    request,
    client: defaultClient
  });
});

test(`invokes and uses wrappers in LIFO order`, () => {
  const defaultClient = Symbol();
  const defaultClientFactoryMock = jest.fn().mockReturnValue(defaultClient);
  const clientProvider = new ScopedSavedObjectsClientProvider({
    defaultClientFactory: defaultClientFactoryMock
  });
  const firstWrappedClient = Symbol();
  const firstClientWrapperFactoryMock = jest.fn().mockReturnValue(firstWrappedClient);
  const secondWrapperClient = Symbol();
  const secondClientWrapperFactoryMock = jest.fn().mockReturnValue(secondWrapperClient);
  const request = Symbol();

  clientProvider.addClientWrapperFactory(firstClientWrapperFactoryMock);
  clientProvider.addClientWrapperFactory(secondClientWrapperFactoryMock);
  const actualClient = clientProvider.getClient(request);

  expect(actualClient).toBe(firstWrappedClient);
  expect(firstClientWrapperFactoryMock).toHaveBeenCalledWith({
    request,
    client: secondWrapperClient
  });
  expect(secondClientWrapperFactoryMock).toHaveBeenCalledWith({
    request,
    client: defaultClient
  });
});
