/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as t from 'io-ts';
import { z } from '@kbn/zod';
import { CoreSetup, kibanaResponseFactory } from '@kbn/core/server';
import { loggerMock } from '@kbn/logging-mocks';
import { registerRoutes } from './register_routes';
import { passThroughValidationObject } from './validation_objects';
import { NEVER } from 'rxjs';

describe('registerRoutes', () => {
  const post = jest.fn();

  const postAddVersion = jest.fn();
  const postWithVersion = jest.fn((_options) => {
    return {
      addVersion: postAddVersion,
    };
  });

  const createRouter = jest.fn().mockReturnValue({
    post,
    versioned: {
      post: postWithVersion,
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

  const zodParamsRt = z.object({
    body: z.object({
      bodyParam: z.string(),
    }),
    query: z.object({
      queryParam: z.string(),
    }),
    path: z.object({
      pathParam: z.string(),
    }),
  });

  beforeEach(() => {
    jest.clearAllMocks();

    const coreSetup = {
      http: {
        createRouter,
      },
    } as unknown as CoreSetup;

    const iotsParamsRt = t.type({
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
        'POST /internal/app/feature': {
          endpoint: 'POST /internal/app/feature',
          handler: internalHandler,
          params: iotsParamsRt,
          options: internalOptions,
        },
        'POST /api/app/feature version': {
          endpoint: 'POST /api/app/feature version',
          handler: publicHandler,
          params: iotsParamsRt,
          options: publicOptions,
        },
        'POST /internal/app/feature/error': {
          endpoint: 'POST /internal/app/feature/error',
          handler: errorHandler,
          params: iotsParamsRt,
          options: internalOptions,
        },
        'POST /internal/app/feature_zod': {
          endpoint: 'POST /internal/app/feature_zod',
          handler: internalHandler,
          params: zodParamsRt,
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

    expect(post).toHaveBeenCalledTimes(3);

    const [internalRoute] = post.mock.calls[0];
    expect(internalRoute.path).toEqual('/internal/app/feature');
    expect(internalRoute.options).toEqual(internalOptions);
    expect(internalRoute.validate).toEqual(passThroughValidationObject);

    expect(postWithVersion).toHaveBeenCalledTimes(1);
    const [publicRoute] = postWithVersion.mock.calls[0];
    expect(publicRoute.path).toEqual('/api/app/feature');
    expect(publicRoute.options).toEqual(publicOptions);
    expect(publicRoute.access).toEqual('public');

    expect(postAddVersion).toHaveBeenCalledTimes(1);
    const [versionedRoute] = postAddVersion.mock.calls[0];
    expect(versionedRoute.version).toEqual('version');
    expect(versionedRoute.validate).toEqual({
      request: passThroughValidationObject,
    });
  });

  it('calls the route handler with all dependencies', async () => {
    const [_, internalRouteHandler] = post.mock.calls[0];
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

  it('uses Core validation when using zod', () => {
    const [internalRoute] = post.mock.calls[2];
    expect(internalRoute.path).toEqual('/internal/app/feature_zod');
    expect(internalRoute.options).toEqual(internalOptions);

    expect(internalRoute.validate).not.toEqual(passThroughValidationObject);
    expect(internalRoute.validate).toEqual({
      params: zodParamsRt.shape.path,
      query: zodParamsRt.shape.query,
      body: zodParamsRt.shape.body,
    });
  });

  it('calls the route handler with all dependencies when using zod', async () => {
    const [_, internalRouteHandler] = post.mock.calls[2];
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
    const [_, internalRouteHandler] = post.mock.calls[0];
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
    const [_, publicRouteHandler] = postAddVersion.mock.calls[0];
    const publicResult = await publicRouteHandler(mockContext, mockRequest, kibanaResponseFactory);

    expect(publicHandler).toHaveBeenCalledTimes(1);
    expect(publicResult).toEqual({ status: 201, payload: { message: 'public' }, options: {} });
  });

  it('translates errors thrown in a route handler to an error response', async () => {
    const [_, errorRouteHandler] = post.mock.calls[1];
    const errorResult = await errorRouteHandler(mockContext, mockRequest, kibanaResponseFactory);

    expect(errorHandler).toHaveBeenCalledTimes(1);
    expect(errorResult).toEqual({
      status: 500,
      payload: { message: 'error', attributes: { data: {} } },
      options: {},
    });
  });
});
