/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { CoreSetup, kibanaResponseFactory } from '@kbn/core/server';
import { loggerMock } from '@kbn/logging-mocks';
import { z } from '@kbn/zod';
import * as t from 'io-ts';
import { NEVER } from 'rxjs';
import * as makeZodValidationObject from './make_zod_validation_object';
import { registerRoutes } from './register_routes';
import { passThroughValidationObject, noParamsValidationObject } from './validation_objects';
import { ServerRouteRepository } from '@kbn/server-route-repository-utils';

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
  const coreSetup = {
    http: {
      createRouter,
    },
  } as unknown as CoreSetup;
  const mockLogger = loggerMock.create();
  const mockService = jest.fn();

  const mockContext = {};
  const mockRequest = {
    events: {
      aborted$: NEVER,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates a router and defines the routes', () => {
    callRegisterRoutes({
      'POST /internal/route': {
        endpoint: 'POST /internal/route',
        handler: jest.fn(),
      },
      'POST /api/public_route version': {
        endpoint: 'POST /api/public_route version',
        handler: jest.fn(),
      },
      'POST /api/internal_but_looks_like_public version': {
        endpoint: 'POST /api/internal_but_looks_like_public version',
        options: {
          access: 'internal',
        },
        handler: jest.fn(),
      },
      'POST /internal/route_with_security': {
        endpoint: `POST /internal/route_with_security`,
        handler: jest.fn(),
        security: {
          authz: {
            enabled: false,
            reason: 'whatever',
          },
        },
      },
      'POST /api/route_with_security version': {
        endpoint: `POST /api/route_with_security version`,
        handler: jest.fn(),
        security: {
          authz: {
            enabled: false,
            reason: 'whatever',
          },
        },
      },
    } satisfies ServerRouteRepository);

    expect(createRouter).toHaveBeenCalledTimes(1);

    const [internalRoute] = post.mock.calls[0];
    expect(internalRoute.path).toEqual('/internal/route');
    expect(internalRoute.options).toEqual({
      access: 'internal',
    });
    expect(internalRoute.validate).toEqual(noParamsValidationObject);

    const [internalRouteWithSecurity] = post.mock.calls[1];

    expect(internalRouteWithSecurity.path).toEqual('/internal/route_with_security');
    expect(internalRouteWithSecurity.security).toEqual({
      authz: {
        enabled: false,
        reason: 'whatever',
      },
    });

    const [publicRoute] = postWithVersion.mock.calls[0];
    expect(publicRoute.path).toEqual('/api/public_route');
    expect(publicRoute.access).toEqual('public');

    const [apiInternalRoute] = postWithVersion.mock.calls[1];
    expect(apiInternalRoute.path).toEqual('/api/internal_but_looks_like_public');
    expect(apiInternalRoute.access).toEqual('internal');

    const [versionedRoute] = postAddVersion.mock.calls[0];
    expect(versionedRoute.version).toEqual('version');
    expect(versionedRoute.validate).toEqual({
      request: noParamsValidationObject,
    });

    const [publicRouteWithSecurity] = postWithVersion.mock.calls[2];

    expect(publicRouteWithSecurity.path).toEqual('/api/route_with_security');
    expect(publicRouteWithSecurity.security).toEqual({
      authz: {
        enabled: false,
        reason: 'whatever',
      },
    });
  });

  it('does not allow any params if no schema is provided', () => {
    const pathDoesNotAllowExcessKeys = () => {
      noParamsValidationObject.params.parse({
        unexpectedKey: 'not_allowed',
      });
    };
    const queryDoesNotAllowExcessKeys = () => {
      noParamsValidationObject.query.parse({
        unexpectedKey: 'not_allowed',
      });
    };
    const bodyDoesNotAllowExcessKeys = () => {
      noParamsValidationObject.body.parse({
        unexpectedKey: 'not_allowed',
      });
    };

    expect(pathDoesNotAllowExcessKeys).toThrowErrorMatchingInlineSnapshot(`
      "[
        {
          \\"code\\": \\"unrecognized_keys\\",
          \\"keys\\": [
            \\"unexpectedKey\\"
          ],
          \\"path\\": [],
          \\"message\\": \\"Unrecognized key(s) in object: 'unexpectedKey'\\"
        }
      ]"
    `);
    expect(queryDoesNotAllowExcessKeys).toThrowErrorMatchingInlineSnapshot(`
      "[
        {
          \\"code\\": \\"unrecognized_keys\\",
          \\"keys\\": [
            \\"unexpectedKey\\"
          ],
          \\"path\\": [],
          \\"message\\": \\"Unrecognized key(s) in object: 'unexpectedKey'\\"
        }
      ]"
    `);
    expect(bodyDoesNotAllowExcessKeys).toThrowErrorMatchingInlineSnapshot(`
      "[
        {
          \\"code\\": \\"unrecognized_keys\\",
          \\"keys\\": [
            \\"unexpectedKey\\"
          ],
          \\"path\\": [],
          \\"message\\": \\"Unrecognized key(s) in object: 'unexpectedKey'\\"
        }
      ]"
    `);
  });

  it('calls the route handler with all dependencies', async () => {
    const handler = jest.fn();

    callRegisterRoutes({
      'POST /internal/route': {
        endpoint: 'POST /internal/route',
        handler,
      },
    });

    const [_, wrappedHandler] = post.mock.calls[0];
    await wrappedHandler(mockContext, mockRequest, kibanaResponseFactory);

    expect(handler).toBeCalledTimes(1);
    const [args] = handler.mock.calls[0];
    expect(Object.keys(args).sort()).toEqual(
      ['aService', 'request', 'response', 'context', 'params', 'logger'].sort()
    );

    const { params, logger, aService, request, response, context } = args;
    expect(params).toEqual(undefined);
    expect(request).toBe(mockRequest);
    expect(response).toBe(kibanaResponseFactory);
    expect(context).toBe(mockContext);
    expect(aService).toBe(mockService);
    expect(logger).toBe(mockLogger);
  });

  it('wraps a plain route handler result into a response', async () => {
    const handler = jest.fn().mockResolvedValue('result');

    callRegisterRoutes({
      'POST /internal/route': {
        endpoint: 'POST /internal/route',
        handler,
      },
    });

    const [_, wrappedHandler] = post.mock.calls[0];
    const result = await wrappedHandler(mockContext, mockRequest, kibanaResponseFactory);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      status: 200,
      payload: 'result',
      options: { body: 'result' },
    });
  });

  it('allows for route handlers to define a custom response', async () => {
    const handler = jest
      .fn()
      .mockResolvedValue(
        kibanaResponseFactory.custom({ statusCode: 201, body: { message: 'result' } })
      );

    callRegisterRoutes({
      'POST /internal/route': {
        endpoint: 'POST /internal/route',
        handler,
      },
    });

    const [_, wrappedHandler] = post.mock.calls[0];
    const result = await wrappedHandler(mockContext, mockRequest, kibanaResponseFactory);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ status: 201, payload: { message: 'result' }, options: {} });
  });

  it('translates errors thrown in a route handler to an error response', async () => {
    const handler = jest.fn().mockRejectedValue(new Error('error'));

    callRegisterRoutes({
      'POST /internal/route': {
        endpoint: 'POST /internal/route',
        handler,
      },
    });

    const [_, wrappedHandler] = post.mock.calls[0];
    const error = await wrappedHandler(mockContext, mockRequest, kibanaResponseFactory);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(error).toEqual({
      status: 500,
      payload: { message: 'error', attributes: { data: {} } },
      options: {},
    });
  });

  describe('when using zod', () => {
    const makeZodValidationObjectSpy = jest.spyOn(
      makeZodValidationObject,
      'makeZodValidationObject'
    );

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

    it('uses Core validation', () => {
      callRegisterRoutes({
        'POST /internal/route': {
          endpoint: 'POST /internal/route',
          params: zodParamsRt,
          handler: jest.fn,
        },
      });

      const [internalRoute] = post.mock.calls[0];
      expect(makeZodValidationObjectSpy).toHaveBeenCalledWith(zodParamsRt);
      expect(internalRoute.validate).toEqual(makeZodValidationObjectSpy.mock.results[0].value);
    });

    it('passes on params', async () => {
      const handler = jest.fn();
      callRegisterRoutes({
        'POST /internal/route': {
          endpoint: 'POST /internal/route',
          params: zodParamsRt,
          handler,
        },
      });

      const [_, wrappedHandler] = post.mock.calls[0];

      await wrappedHandler(
        mockContext,
        {
          ...mockRequest,
          params: {
            pathParam: 'path',
          },
          query: {
            queryParam: 'query',
          },
          body: {
            bodyParam: 'body',
          },
        },
        kibanaResponseFactory
      );

      expect(handler).toBeCalledTimes(1);
      const [args] = handler.mock.calls[0];
      const { params } = args;
      expect(params).toEqual({
        path: {
          pathParam: 'path',
        },
        query: {
          queryParam: 'query',
        },
        body: {
          bodyParam: 'body',
        },
      });
    });
  });

  describe('when using io-ts', () => {
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

    it('bypasses Core validation', () => {
      callRegisterRoutes({
        'POST /internal/route': {
          endpoint: 'POST /internal/route',
          params: iotsParamsRt,
          handler: jest.fn,
        },
      });

      const [internalRoute] = post.mock.calls[0];
      expect(internalRoute.validate).toEqual(passThroughValidationObject);
    });

    it('decodes params', async () => {
      const handler = jest.fn();
      callRegisterRoutes({
        'POST /internal/route': {
          endpoint: 'POST /internal/route',
          params: iotsParamsRt,
          handler,
        },
      });

      const [_, wrappedHandler] = post.mock.calls[0];

      await wrappedHandler(
        mockContext,
        {
          ...mockRequest,
          params: {
            pathParam: 'path',
          },
          query: {
            queryParam: 'query',
          },
          body: {
            bodyParam: 'body',
          },
        },
        kibanaResponseFactory
      );

      expect(handler).toBeCalledTimes(1);
      const [args] = handler.mock.calls[0];
      const { params } = args;
      expect(params).toEqual({
        path: {
          pathParam: 'path',
        },
        query: {
          queryParam: 'query',
        },
        body: {
          bodyParam: 'body',
        },
      });
    });
  });

  function callRegisterRoutes(repository: any) {
    registerRoutes({
      core: coreSetup,
      logger: mockLogger,
      dependencies: {
        aService: mockService,
      },
      repository,
      runDevModeChecks: true,
    });
  }
});
