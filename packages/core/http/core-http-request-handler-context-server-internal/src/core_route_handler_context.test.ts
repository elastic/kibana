/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CoreRouteHandlerContext } from './core_route_handler_context';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import { createCoreRouteHandlerContextParamsMock } from './test_helpers';

describe('#elasticsearch', () => {
  describe('#client', () => {
    test('returns the results of params.elasticsearch.client.asScoped', () => {
      const request = httpServerMock.createKibanaRequest();
      const params = createCoreRouteHandlerContextParamsMock();
      const context = new CoreRouteHandlerContext(params, request);

      const client = context.elasticsearch.client;
      expect(client).toBe(params.elasticsearch.client.asScoped.mock.results[0].value);
    });

    test('lazily created', () => {
      const request = httpServerMock.createKibanaRequest();
      const params = createCoreRouteHandlerContextParamsMock();
      const context = new CoreRouteHandlerContext(params, request);

      expect(params.elasticsearch.client.asScoped).not.toHaveBeenCalled();
      const client = context.elasticsearch.client;
      expect(params.elasticsearch.client.asScoped).toHaveBeenCalled();
      expect(client).toBeDefined();
    });

    test('only creates one instance', () => {
      const request = httpServerMock.createKibanaRequest();
      const params = createCoreRouteHandlerContextParamsMock();
      const context = new CoreRouteHandlerContext(params, request);

      const client1 = context.elasticsearch.client;
      const client2 = context.elasticsearch.client;
      expect(params.elasticsearch.client.asScoped.mock.calls.length).toBe(1);
      const mockResult = params.elasticsearch.client.asScoped.mock.results[0].value;
      expect(client1).toBe(mockResult);
      expect(client2).toBe(mockResult);
    });
  });
});

describe('#savedObjects', () => {
  describe('#client', () => {
    test('returns the results of params.savedObjects.getScopedClient', () => {
      const request = httpServerMock.createKibanaRequest();
      const params = createCoreRouteHandlerContextParamsMock();
      const context = new CoreRouteHandlerContext(params, request);

      const client = context.savedObjects.client;
      expect(client).toBe(params.savedObjects.getScopedClient.mock.results[0].value);
    });

    test('lazily created', () => {
      const request = httpServerMock.createKibanaRequest();
      const params = createCoreRouteHandlerContextParamsMock();
      const context = new CoreRouteHandlerContext(params, request);

      const savedObjects = context.savedObjects;
      expect(params.savedObjects.getScopedClient).not.toHaveBeenCalled();
      const client = savedObjects.client;
      expect(params.savedObjects.getScopedClient).toHaveBeenCalled();
      expect(client).toBeDefined();
    });

    test('only creates one instance', () => {
      const request = httpServerMock.createKibanaRequest();
      const params = createCoreRouteHandlerContextParamsMock();
      const context = new CoreRouteHandlerContext(params, request);

      const client1 = context.savedObjects.client;
      const client2 = context.savedObjects.client;
      expect(params.savedObjects.getScopedClient.mock.calls.length).toBe(1);
      const mockResult = params.savedObjects.getScopedClient.mock.results[0].value;
      expect(client1).toBe(mockResult);
      expect(client2).toBe(mockResult);
    });
  });

  describe('#typeRegistry', () => {
    test('returns the results of params.savedObjects.getTypeRegistry', () => {
      const request = httpServerMock.createKibanaRequest();
      const params = createCoreRouteHandlerContextParamsMock();
      const context = new CoreRouteHandlerContext(params, request);

      const typeRegistry = context.savedObjects.typeRegistry;
      expect(typeRegistry).toBe(params.savedObjects.getTypeRegistry.mock.results[0].value);
    });

    test('lazily created', () => {
      const request = httpServerMock.createKibanaRequest();
      const params = createCoreRouteHandlerContextParamsMock();
      const context = new CoreRouteHandlerContext(params, request);

      expect(params.savedObjects.getTypeRegistry).not.toHaveBeenCalled();
      const typeRegistry = context.savedObjects.typeRegistry;
      expect(params.savedObjects.getTypeRegistry).toHaveBeenCalled();
      expect(typeRegistry).toBeDefined();
    });

    test('only creates one instance', () => {
      const request = httpServerMock.createKibanaRequest();
      const params = createCoreRouteHandlerContextParamsMock();
      const context = new CoreRouteHandlerContext(params, request);

      const typeRegistry1 = context.savedObjects.typeRegistry;
      const typeRegistry2 = context.savedObjects.typeRegistry;
      expect(params.savedObjects.getTypeRegistry.mock.calls.length).toBe(1);
      const mockResult = params.savedObjects.getTypeRegistry.mock.results[0].value;
      expect(typeRegistry1).toBe(mockResult);
      expect(typeRegistry2).toBe(mockResult);
    });
  });
});

describe('#uiSettings', () => {
  describe('#client', () => {
    test('returns the results of params.uiSettings.asScopedToClient', () => {
      const request = httpServerMock.createKibanaRequest();
      const params = createCoreRouteHandlerContextParamsMock();
      const context = new CoreRouteHandlerContext(params, request);

      const client = context.uiSettings.client;
      expect(client).toBe(params.uiSettings.asScopedToClient.mock.results[0].value);
    });

    test('lazily created', () => {
      const request = httpServerMock.createKibanaRequest();
      const params = createCoreRouteHandlerContextParamsMock();
      const context = new CoreRouteHandlerContext(params, request);

      expect(params.uiSettings.asScopedToClient).not.toHaveBeenCalled();
      const client = context.uiSettings.client;
      expect(params.uiSettings.asScopedToClient).toHaveBeenCalled();
      expect(client).toBeDefined();
    });

    test('only creates one instance', () => {
      const request = httpServerMock.createKibanaRequest();
      const params = createCoreRouteHandlerContextParamsMock();
      const context = new CoreRouteHandlerContext(params, request);

      const client1 = context.uiSettings.client;
      const client2 = context.uiSettings.client;
      expect(params.uiSettings.asScopedToClient.mock.calls.length).toBe(1);
      const mockResult = params.uiSettings.asScopedToClient.mock.results[0].value;
      expect(client1).toBe(mockResult);
      expect(client2).toBe(mockResult);
    });
  });
});

describe('#deprecations', () => {
  describe('#client', () => {
    test('returns the results of params.deprecations.asScopedToClient', () => {
      const request = httpServerMock.createKibanaRequest();
      const params = createCoreRouteHandlerContextParamsMock();
      const context = new CoreRouteHandlerContext(params, request);

      const client = context.deprecations.client;
      expect(client).toBe(params.deprecations.asScopedToClient.mock.results[0].value);
    });

    test('lazily created', () => {
      const request = httpServerMock.createKibanaRequest();
      const params = createCoreRouteHandlerContextParamsMock();
      const context = new CoreRouteHandlerContext(params, request);

      expect(params.deprecations.asScopedToClient).not.toHaveBeenCalled();
      const client = context.deprecations.client;
      expect(params.deprecations.asScopedToClient).toHaveBeenCalled();
      expect(client).toBeDefined();
    });

    test('only creates one instance', () => {
      const request = httpServerMock.createKibanaRequest();
      const params = createCoreRouteHandlerContextParamsMock();
      const context = new CoreRouteHandlerContext(params, request);

      const client1 = context.deprecations.client;
      const client2 = context.deprecations.client;
      expect(params.deprecations.asScopedToClient.mock.calls.length).toBe(1);
      const mockResult = params.deprecations.asScopedToClient.mock.results[0].value;
      expect(client1).toBe(mockResult);
      expect(client2).toBe(mockResult);
    });
  });
});
