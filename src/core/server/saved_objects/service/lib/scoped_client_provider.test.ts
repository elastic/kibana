/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SavedObjectsClientProvider } from './scoped_client_provider';
import { httpServerMock } from '../../../http/http_server.mocks';
import { typeRegistryMock } from '../../saved_objects_type_registry.mock';

test(`uses default client factory when one isn't set`, () => {
  const returnValue = Symbol();
  const defaultClientFactoryMock = jest.fn().mockReturnValue(returnValue);
  const request = httpServerMock.createKibanaRequest();

  const clientProvider = new SavedObjectsClientProvider({
    defaultClientFactory: defaultClientFactoryMock,
    typeRegistry: typeRegistryMock.create(),
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
  const request = httpServerMock.createKibanaRequest();
  const returnValue = Symbol();
  const customClientFactoryMock = jest.fn().mockReturnValue(returnValue);

  const clientProvider = new SavedObjectsClientProvider({
    defaultClientFactory: defaultClientFactoryMock,
    typeRegistry: typeRegistryMock.create(),
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
  const defaultClientFactory = jest.fn();
  const clientFactory = jest.fn();

  const clientProvider = new SavedObjectsClientProvider({
    defaultClientFactory,
    typeRegistry: typeRegistryMock.create(),
  });

  clientProvider.setClientFactory(clientFactory);
  expect(() => {
    clientProvider.setClientFactory(clientFactory);
  }).toThrowErrorMatchingInlineSnapshot(
    `"custom client factory is already set, unable to replace the current one"`
  );
});

test(`throws error when registering a wrapper with a duplicate id`, () => {
  const defaultClientFactoryMock = jest.fn();
  const clientProvider = new SavedObjectsClientProvider({
    defaultClientFactory: defaultClientFactoryMock,
    typeRegistry: typeRegistryMock.create(),
  });
  const firstClientWrapperFactoryMock = jest.fn();
  const secondClientWrapperFactoryMock = jest.fn();

  clientProvider.addClientWrapperFactory(1, 'foo', secondClientWrapperFactoryMock);
  expect(() =>
    clientProvider.addClientWrapperFactory(0, 'foo', firstClientWrapperFactoryMock)
  ).toThrowErrorMatchingInlineSnapshot(`"wrapper factory with id foo is already defined"`);
});

test(`invokes and uses wrappers in specified order`, () => {
  const defaultClient = Symbol();
  const typeRegistry = typeRegistryMock.create();
  const defaultClientFactoryMock = jest.fn().mockReturnValue(defaultClient);
  const clientProvider = new SavedObjectsClientProvider({
    defaultClientFactory: defaultClientFactoryMock,
    typeRegistry,
  });
  const firstWrappedClient = Symbol('first client');
  const firstClientWrapperFactoryMock = jest.fn().mockReturnValue(firstWrappedClient);
  const secondWrapperClient = Symbol('second client');
  const secondClientWrapperFactoryMock = jest.fn().mockReturnValue(secondWrapperClient);
  const request = httpServerMock.createKibanaRequest();

  clientProvider.addClientWrapperFactory(1, 'foo', secondClientWrapperFactoryMock);
  clientProvider.addClientWrapperFactory(0, 'bar', firstClientWrapperFactoryMock);
  const actualClient = clientProvider.getClient(request);

  expect(actualClient).toBe(firstWrappedClient);
  expect(firstClientWrapperFactoryMock).toHaveBeenCalledWith({
    request,
    client: secondWrapperClient,
    typeRegistry,
  });
  expect(secondClientWrapperFactoryMock).toHaveBeenCalledWith({
    request,
    client: defaultClient,
    typeRegistry,
  });
});

test(`does not invoke or use excluded wrappers`, () => {
  const defaultClient = Symbol();
  const typeRegistry = typeRegistryMock.create();
  const defaultClientFactoryMock = jest.fn().mockReturnValue(defaultClient);
  const clientProvider = new SavedObjectsClientProvider({
    defaultClientFactory: defaultClientFactoryMock,
    typeRegistry,
  });
  const firstWrappedClient = Symbol('first client');
  const firstClientWrapperFactoryMock = jest.fn().mockReturnValue(firstWrappedClient);
  const secondWrapperClient = Symbol('second client');
  const secondClientWrapperFactoryMock = jest.fn().mockReturnValue(secondWrapperClient);
  const request = httpServerMock.createKibanaRequest();

  clientProvider.addClientWrapperFactory(1, 'foo', secondClientWrapperFactoryMock);
  clientProvider.addClientWrapperFactory(0, 'bar', firstClientWrapperFactoryMock);

  const actualClient = clientProvider.getClient(request, {
    excludedWrappers: ['foo'],
  });

  expect(actualClient).toBe(firstWrappedClient);
  expect(firstClientWrapperFactoryMock).toHaveBeenCalledWith({
    request,
    client: defaultClient,
    typeRegistry,
  });
  expect(secondClientWrapperFactoryMock).not.toHaveBeenCalled();
});

test(`allows all wrappers to be excluded`, () => {
  const defaultClient = Symbol();
  const defaultClientFactoryMock = jest.fn().mockReturnValue(defaultClient);
  const clientProvider = new SavedObjectsClientProvider({
    defaultClientFactory: defaultClientFactoryMock,
    typeRegistry: typeRegistryMock.create(),
  });
  const firstWrappedClient = Symbol('first client');
  const firstClientWrapperFactoryMock = jest.fn().mockReturnValue(firstWrappedClient);
  const secondWrapperClient = Symbol('second client');
  const secondClientWrapperFactoryMock = jest.fn().mockReturnValue(secondWrapperClient);
  const request = httpServerMock.createKibanaRequest();

  clientProvider.addClientWrapperFactory(1, 'foo', secondClientWrapperFactoryMock);
  clientProvider.addClientWrapperFactory(0, 'bar', firstClientWrapperFactoryMock);

  const actualClient = clientProvider.getClient(request, {
    excludedWrappers: ['foo', 'bar'],
  });

  expect(actualClient).toBe(defaultClient);
  expect(firstClientWrapperFactoryMock).not.toHaveBeenCalled();
  expect(secondClientWrapperFactoryMock).not.toHaveBeenCalled();
});

test(`allows hidden typed to be included`, () => {
  const defaultClient = Symbol();
  const defaultClientFactoryMock = jest.fn().mockReturnValue(defaultClient);
  const clientProvider = new SavedObjectsClientProvider({
    defaultClientFactory: defaultClientFactoryMock,
    typeRegistry: typeRegistryMock.create(),
  });
  const request = httpServerMock.createKibanaRequest();

  const actualClient = clientProvider.getClient(request, {
    includedHiddenTypes: ['task'],
  });

  expect(actualClient).toBe(defaultClient);
  expect(defaultClientFactoryMock).toHaveBeenCalledWith({
    request,
    includedHiddenTypes: ['task'],
  });
});
