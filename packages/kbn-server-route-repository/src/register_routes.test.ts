/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as t from 'io-ts';
import { CoreSetup, kibanaResponseFactory } from '@kbn/core/server';
import { loggerMock } from '@kbn/logging-mocks';
import { registerRoutes } from './register_routes';
import { routeValidationObject } from './route_validation_object';
import { NEVER } from 'rxjs';

describe('registerRoutes', () => {
  const get = jest.fn();

  const getAddVersion = jest.fn();
  const getWithVersion = jest.fn((_options) => {
    return {
      addVersion: getAddVersion,
    };
  });

  const createRouter = jest.fn().mockReturnValue({
    get,
    versioned: {
      get: getWithVersion,
    },
  });

  const internalOptions = {
    internal: true,
  };
  const publicOptions = {
    public: true,
  };

  const internalHandler = jest.fn().mockResolvedValue('internal');
  const publicHandler = jest
    .fn()
    .mockResolvedValue(
      kibanaResponseFactory.custom({ statusCode: 201, body: { message: 'public' } })
    );
  const errorHandler = jest.fn().mockRejectedValue(new Error('error'));

  const mockLogger = loggerMock.create();
  const mockService = jest.fn();

  const mockContext = {};
  const mockRequest = {
    body: {
      bodyParam: 'body',
    },
    query: {
      queryParam: 'query',
    },
    params: {
      pathParam: 'path',
    },
    events: {
      aborted$: NEVER,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();

    const coreSetup = {
      http: {
        createRouter,
      },
    } as unknown as CoreSetup;

    const paramsRt = t.type({
      body: t.type({
        bodyParam: t.string,
      }),
      query: t.type({
        queryParam: t.string,
      }),
      path: t.type({
        pathParam: t.string,
      }),
    });

    registerRoutes({
      core: coreSetup,
      repository: {
        'GET /internal/app/feature': {
          endpoint: 'GET /internal/app/feature',
          handler: internalHandler,
          params: paramsRt,
          options: internalOptions,
        },
        'GET /api/app/feature version': {
          endpoint: 'GET /api/app/feature version',
          handler: publicHandler,
          params: paramsRt,
          options: publicOptions,
        },
        'GET /internal/app/feature/error': {
          endpoint: 'GET /internal/app/feature/error',
          handler: errorHandler,
          params: paramsRt,
          options: internalOptions,
        },
      },
      dependencies: {
        aService: mockService,
      },
      logger: mockLogger,
    });
  });

  it('creates a router and defines the routes', () => {
    expect(createRouter).toHaveBeenCalledTimes(1);

    expect(get).toHaveBeenCalledTimes(2);

    const [internalRoute] = get.mock.calls[0];
    expect(internalRoute.path).toEqual('/internal/app/feature');
    expect(internalRoute.options).toEqual(internalOptions);
    expect(internalRoute.validate).toEqual(routeValidationObject);

    expect(getWithVersion).toHaveBeenCalledTimes(1);
    const [publicRoute] = getWithVersion.mock.calls[0];
    expect(publicRoute.path).toEqual('/api/app/feature');
    expect(publicRoute.options).toEqual(publicOptions);
    expect(publicRoute.access).toEqual('public');

    expect(getAddVersion).toHaveBeenCalledTimes(1);
    const [versionedRoute] = getAddVersion.mock.calls[0];
    expect(versionedRoute.version).toEqual('version');
    expect(versionedRoute.validate).toEqual({
      request: routeValidationObject,
    });
  });

  it('calls the route handler with all dependencies', async () => {
    const [_, internalRouteHandler] = get.mock.calls[0];
    await internalRouteHandler(mockContext, mockRequest, kibanaResponseFactory);

    const [args] = internalHandler.mock.calls[0];
    expect(Object.keys(args).sort()).toEqual(
      ['aService', 'request', 'response', 'context', 'params', 'logger'].sort()
    );

    const { params, logger, aService, request, response, context } = args;
    expect(params).toEqual({
      body: {
        bodyParam: 'body',
      },
      query: {
        queryParam: 'query',
      },
      path: {
        pathParam: 'path',
      },
    });
    expect(request).toBe(mockRequest);
    expect(response).toBe(kibanaResponseFactory);
    expect(context).toBe(mockContext);
    expect(aService).toBe(mockService);
    expect(logger).toBe(mockLogger);
  });

  it('wraps a plain route handler result into a response', async () => {
    const [_, internalRouteHandler] = get.mock.calls[0];
    const internalResult = await internalRouteHandler(
      mockContext,
      mockRequest,
      kibanaResponseFactory
    );

    expect(internalHandler).toHaveBeenCalledTimes(1);
    expect(internalResult).toEqual({
      status: 200,
      payload: 'internal',
      options: { body: 'internal' },
    });
  });

  it('allows for route handlers to define a custom response', async () => {
    const [_, publicRouteHandler] = getAddVersion.mock.calls[0];
    const publicResult = await publicRouteHandler(mockContext, mockRequest, kibanaResponseFactory);

    expect(publicHandler).toHaveBeenCalledTimes(1);
    expect(publicResult).toEqual({ status: 201, payload: { message: 'public' }, options: {} });
  });

  it('translates errors thrown in a route handler to an error response', async () => {
    const [_, errorRouteHandler] = get.mock.calls[1];
    const errorResult = await errorRouteHandler(mockContext, mockRequest, kibanaResponseFactory);

    expect(errorHandler).toHaveBeenCalledTimes(1);
    expect(errorResult).toEqual({
      status: 500,
      payload: { message: 'error', attributes: { data: {} } },
      options: {},
    });
  });
});
