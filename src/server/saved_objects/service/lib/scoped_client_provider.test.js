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

test(`uses default client factory when one isn't set`, async () => {
  const returnValue = Symbol();
  const defaultClientFactoryMock = jest.fn().mockImplementation(async () => returnValue);
  const request = Symbol();

  const clientProvider = new ScopedSavedObjectsClientProvider({
    defaultClientFactory: defaultClientFactoryMock
  });
  const result = await clientProvider.getClient(request);

  expect(result).toBe(returnValue);
  expect(defaultClientFactoryMock).toHaveBeenCalledTimes(1);
  expect(defaultClientFactoryMock).toHaveBeenCalledWith({
    request,
  });
});

test(`uses custom client factory when one is set`, async () => {
  const defaultClientFactoryMock = jest.fn();
  const request = Symbol();
  const returnValue = Symbol();
  const customClientFactoryMock = jest.fn().mockImplementation(async () => returnValue);

  const clientProvider = new ScopedSavedObjectsClientProvider({
    defaultClientFactory: defaultClientFactoryMock
  });
  clientProvider.setClientFactory(customClientFactoryMock);
  const result = await clientProvider.getClient(request);

  expect(result).toBe(returnValue);
  expect(defaultClientFactoryMock).not.toHaveBeenCalled();
  expect(customClientFactoryMock).toHaveBeenCalledTimes(1);
  expect(customClientFactoryMock).toHaveBeenCalledWith({
    request,
  });
});

test(`throws error when more than one scoped saved objects client factory is set`, () => {
  const clientProvider = new ScopedSavedObjectsClientProvider({});
  clientProvider.setClientFactory(() => { });
  expect(() => {
    clientProvider.setClientFactory(() => { });
  }).toThrowErrorMatchingSnapshot();
});

test(`invokes and uses instance from single added wrapper factory`, async () => {
  const defaultClient = Symbol();
  const defaultClientFactoryMock = jest.fn().mockImplementation(async () => defaultClient);
  const clientProvider = new ScopedSavedObjectsClientProvider({
    defaultClientFactory: defaultClientFactoryMock
  });
  const wrappedClient = Symbol();
  const clientWrapperFactoryMock = jest.fn().mockReturnValue(wrappedClient);
  const request = Symbol();

  clientProvider.addClientWrapperFactory(clientWrapperFactoryMock);
  const actualClient = await clientProvider.getClient(request);

  expect(actualClient).toBe(wrappedClient);
  expect(clientWrapperFactoryMock).toHaveBeenCalledWith({
    request,
    client: defaultClient
  });
});

test(`invokes and uses wrappers in LIFO order`, async () => {
  const defaultClient = Symbol();
  const defaultClientFactoryMock = jest.fn().mockImplementation(async () => defaultClient);
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
  const actualClient = await clientProvider.getClient(request);

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
