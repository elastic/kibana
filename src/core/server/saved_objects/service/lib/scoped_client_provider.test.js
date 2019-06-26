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
  const request = Symbol();

  const clientProvider = new ScopedSavedObjectsClientProvider({
    defaultClientFactory: defaultClientFactoryMock,
  });
  const result = clientProvider.getClient(request);

  expect(result).toBe(returnValue);
  expect(defaultClientFactoryMock).toHaveBeenCalledTimes(1);
  expect(defaultClientFactoryMock).toHaveBeenCalledWith({
    request,
  });
});

test(`uses custom client factory when one is set`, () => {
  const defaultClientFactoryMock = jest.fn();
  const request = Symbol();
  const returnValue = Symbol();
  const customClientFactoryMock = jest.fn().mockReturnValue(returnValue);

  const clientProvider = new ScopedSavedObjectsClientProvider({
    defaultClientFactory: defaultClientFactoryMock,
  });
  clientProvider.setClientFactory(customClientFactoryMock);
  const result = clientProvider.getClient(request);

  expect(result).toBe(returnValue);
  expect(defaultClientFactoryMock).not.toHaveBeenCalled();
  expect(customClientFactoryMock).toHaveBeenCalledTimes(1);
  expect(customClientFactoryMock).toHaveBeenCalledWith({
    request,
  });
});

test(`throws error when more than one scoped saved objects client factory is set`, () => {
  const clientProvider = new ScopedSavedObjectsClientProvider({});
  clientProvider.setClientFactory(() => {});
  expect(() => {
    clientProvider.setClientFactory(() => {});
  }).toThrowErrorMatchingSnapshot();
});

test(`invokes and uses wrappers in specified order`, () => {
  const defaultClient = Symbol();
  const defaultClientFactoryMock = jest.fn().mockReturnValue(defaultClient);
  const clientProvider = new ScopedSavedObjectsClientProvider({
    defaultClientFactory: defaultClientFactoryMock,
  });
  const firstWrappedClient = Symbol('first client');
  const firstClientWrapperFactoryMock = jest.fn().mockReturnValue(firstWrappedClient);
  const secondWrapperClient = Symbol('second client');
  const secondClientWrapperFactoryMock = jest.fn().mockReturnValue(secondWrapperClient);
  const request = Symbol();

  clientProvider.addClientWrapperFactory(1, secondClientWrapperFactoryMock);
  clientProvider.addClientWrapperFactory(0, firstClientWrapperFactoryMock);
  const actualClient = clientProvider.getClient(request);

  expect(actualClient).toBe(firstWrappedClient);
  expect(firstClientWrapperFactoryMock).toHaveBeenCalledWith({
    request,
    client: secondWrapperClient,
  });
  expect(secondClientWrapperFactoryMock).toHaveBeenCalledWith({
    request,
    client: defaultClient,
  });
});
