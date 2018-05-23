import { ScopedSavedObjectsClientProvider } from './scoped_client_provider';

test(`uses default client factory when one isn't registered`, () => {
  const defaultClientFactoryMock = jest.fn();
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
  clientProvider.getScopedSavedObjectsClient(request);

  expect(defaultClientFactoryMock).toHaveBeenCalledTimes(1);
  expect(defaultClientFactoryMock).toHaveBeenCalledWith({
    request,
    index,
    mappings,
    onBeforeWrite,
  });
});

test(`uses custom client factory when one is registered`, () => {
  const defaultClientFactoryMock = jest.fn();
  const index = Symbol();
  const mappings = Symbol();
  const onBeforeWrite = () => {};
  const request = Symbol();
  const customClientFactoryMock = jest.fn();

  const clientProvider = new ScopedSavedObjectsClientProvider({
    index,
    mappings,
    onBeforeWrite,
    defaultClientFactory: defaultClientFactoryMock
  });
  clientProvider.registerScopedSavedObjectsClientFactory(customClientFactoryMock);
  clientProvider.getScopedSavedObjectsClient(request);

  expect(customClientFactoryMock).toHaveBeenCalledTimes(1);
  expect(customClientFactoryMock).toHaveBeenCalledWith({
    request,
    index,
    mappings,
    onBeforeWrite,
  });
});

test(`throws error when more than one scoped saved objects client factory is registered`, () => {
  const clientProvider = new ScopedSavedObjectsClientProvider({});
  clientProvider.registerScopedSavedObjectsClientFactory(() => {});
  expect(() => {
    clientProvider.registerScopedSavedObjectsClientFactory(() => {});
  }).toThrowErrorMatchingSnapshot();
});

test(`invokes and uses instance from single registered wrapper factory`, () => {
  const defaultClient = Symbol();
  const defaultClientFactoryMock = jest.fn().mockReturnValue(defaultClient);
  const clientProvider = new ScopedSavedObjectsClientProvider({
    defaultClientFactory: defaultClientFactoryMock
  });
  const wrappedClient = Symbol();
  const clientWrapperFactoryMock = jest.fn().mockReturnValue(wrappedClient);
  const request = Symbol();

  clientProvider.registerScopedSavedObjectsClientWrapperFactory(clientWrapperFactoryMock);
  const actualClient = clientProvider.getScopedSavedObjectsClient(request);

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

  clientProvider.registerScopedSavedObjectsClientWrapperFactory(firstClientWrapperFactoryMock);
  clientProvider.registerScopedSavedObjectsClientWrapperFactory(secondClientWrapperFactoryMock);
  const actualClient = clientProvider.getScopedSavedObjectsClient(request);

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
