/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CoreRouteHandlerContext } from './core_route_handler_context';
import { coreMock, httpServerMock } from './mocks';

describe('#elasticsearch', () => {
  describe('#client', () => {
    test('returns the results of coreStart.elasticsearch.client.asScoped', () => {
      const request = httpServerMock.createKibanaRequest();
      const coreStart = coreMock.createInternalStart();
      const context = new CoreRouteHandlerContext(coreStart, request);

      const client = context.elasticsearch.client;
      expect(client).toBe(coreStart.elasticsearch.client.asScoped.mock.results[0].value);
    });

    test('lazily created', () => {
      const request = httpServerMock.createKibanaRequest();
      const coreStart = coreMock.createInternalStart();
      const context = new CoreRouteHandlerContext(coreStart, request);

      expect(coreStart.elasticsearch.client.asScoped).not.toHaveBeenCalled();
      const client = context.elasticsearch.client;
      expect(coreStart.elasticsearch.client.asScoped).toHaveBeenCalled();
      expect(client).toBeDefined();
    });

    test('only creates one instance', () => {
      const request = httpServerMock.createKibanaRequest();
      const coreStart = coreMock.createInternalStart();
      const context = new CoreRouteHandlerContext(coreStart, request);

      const client1 = context.elasticsearch.client;
      const client2 = context.elasticsearch.client;
      expect(coreStart.elasticsearch.client.asScoped.mock.calls.length).toBe(1);
      const mockResult = coreStart.elasticsearch.client.asScoped.mock.results[0].value;
      expect(client1).toBe(mockResult);
      expect(client2).toBe(mockResult);
    });
  });
});

describe('#savedObjects', () => {
  describe('#client', () => {
    test('returns the results of coreStart.savedObjects.getScopedClient', () => {
      const request = httpServerMock.createKibanaRequest();
      const coreStart = coreMock.createInternalStart();
      const context = new CoreRouteHandlerContext(coreStart, request);

      const client = context.savedObjects.client;
      expect(client).toBe(coreStart.savedObjects.getScopedClient.mock.results[0].value);
    });

    test('lazily created', () => {
      const request = httpServerMock.createKibanaRequest();
      const coreStart = coreMock.createInternalStart();
      const context = new CoreRouteHandlerContext(coreStart, request);

      const savedObjects = context.savedObjects;
      expect(coreStart.savedObjects.getScopedClient).not.toHaveBeenCalled();
      const client = savedObjects.client;
      expect(coreStart.savedObjects.getScopedClient).toHaveBeenCalled();
      expect(client).toBeDefined();
    });

    test('only creates one instance', () => {
      const request = httpServerMock.createKibanaRequest();
      const coreStart = coreMock.createInternalStart();
      const context = new CoreRouteHandlerContext(coreStart, request);

      const client1 = context.savedObjects.client;
      const client2 = context.savedObjects.client;
      expect(coreStart.savedObjects.getScopedClient.mock.calls.length).toBe(1);
      const mockResult = coreStart.savedObjects.getScopedClient.mock.results[0].value;
      expect(client1).toBe(mockResult);
      expect(client2).toBe(mockResult);
    });
  });

  describe('#typeRegistry', () => {
    test('returns the results of coreStart.savedObjects.getTypeRegistry', () => {
      const request = httpServerMock.createKibanaRequest();
      const coreStart = coreMock.createInternalStart();
      const context = new CoreRouteHandlerContext(coreStart, request);

      const typeRegistry = context.savedObjects.typeRegistry;
      expect(typeRegistry).toBe(coreStart.savedObjects.getTypeRegistry.mock.results[0].value);
    });

    test('lazily created', () => {
      const request = httpServerMock.createKibanaRequest();
      const coreStart = coreMock.createInternalStart();
      const context = new CoreRouteHandlerContext(coreStart, request);

      expect(coreStart.savedObjects.getTypeRegistry).not.toHaveBeenCalled();
      const typeRegistry = context.savedObjects.typeRegistry;
      expect(coreStart.savedObjects.getTypeRegistry).toHaveBeenCalled();
      expect(typeRegistry).toBeDefined();
    });

    test('only creates one instance', () => {
      const request = httpServerMock.createKibanaRequest();
      const coreStart = coreMock.createInternalStart();
      const context = new CoreRouteHandlerContext(coreStart, request);

      const typeRegistry1 = context.savedObjects.typeRegistry;
      const typeRegistry2 = context.savedObjects.typeRegistry;
      expect(coreStart.savedObjects.getTypeRegistry.mock.calls.length).toBe(1);
      const mockResult = coreStart.savedObjects.getTypeRegistry.mock.results[0].value;
      expect(typeRegistry1).toBe(mockResult);
      expect(typeRegistry2).toBe(mockResult);
    });
  });
});

describe('#uiSettings', () => {
  describe('#client', () => {
    test('returns the results of coreStart.uiSettings.asScopedToClient', () => {
      const request = httpServerMock.createKibanaRequest();
      const coreStart = coreMock.createInternalStart();
      const context = new CoreRouteHandlerContext(coreStart, request);

      const client = context.uiSettings.client;
      expect(client).toBe(coreStart.uiSettings.asScopedToClient.mock.results[0].value);
    });

    test('lazily created', () => {
      const request = httpServerMock.createKibanaRequest();
      const coreStart = coreMock.createInternalStart();
      const context = new CoreRouteHandlerContext(coreStart, request);

      expect(coreStart.uiSettings.asScopedToClient).not.toHaveBeenCalled();
      const client = context.uiSettings.client;
      expect(coreStart.uiSettings.asScopedToClient).toHaveBeenCalled();
      expect(client).toBeDefined();
    });

    test('only creates one instance', () => {
      const request = httpServerMock.createKibanaRequest();
      const coreStart = coreMock.createInternalStart();
      const context = new CoreRouteHandlerContext(coreStart, request);

      const client1 = context.uiSettings.client;
      const client2 = context.uiSettings.client;
      expect(coreStart.uiSettings.asScopedToClient.mock.calls.length).toBe(1);
      const mockResult = coreStart.uiSettings.asScopedToClient.mock.results[0].value;
      expect(client1).toBe(mockResult);
      expect(client2).toBe(mockResult);
    });
  });
});

describe('#deprecations', () => {
  describe('#client', () => {
    test('returns the results of coreStart.deprecations.asScopedToClient', () => {
      const request = httpServerMock.createKibanaRequest();
      const coreStart = coreMock.createInternalStart();
      const context = new CoreRouteHandlerContext(coreStart, request);

      const client = context.deprecations.client;
      expect(client).toBe(coreStart.deprecations.asScopedToClient.mock.results[0].value);
    });

    test('lazily created', () => {
      const request = httpServerMock.createKibanaRequest();
      const coreStart = coreMock.createInternalStart();
      const context = new CoreRouteHandlerContext(coreStart, request);

      expect(coreStart.deprecations.asScopedToClient).not.toHaveBeenCalled();
      const client = context.deprecations.client;
      expect(coreStart.deprecations.asScopedToClient).toHaveBeenCalled();
      expect(client).toBeDefined();
    });

    test('only creates one instance', () => {
      const request = httpServerMock.createKibanaRequest();
      const coreStart = coreMock.createInternalStart();
      const context = new CoreRouteHandlerContext(coreStart, request);

      const client1 = context.deprecations.client;
      const client2 = context.deprecations.client;
      expect(coreStart.deprecations.asScopedToClient.mock.calls.length).toBe(1);
      const mockResult = coreStart.deprecations.asScopedToClient.mock.results[0].value;
      expect(client1).toBe(mockResult);
      expect(client2).toBe(mockResult);
    });
  });
});
