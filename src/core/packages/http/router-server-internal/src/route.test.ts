/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { hapiMocks } from '@kbn/hapi-mocks';
import { buildRoute, validateHapiRequest, handle } from './route';
import { createRouter } from './versioned_router/mocks';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import type { Logger } from '@kbn/logging';
import { RouteValidator } from './validator';
import { schema } from '@kbn/config-schema';
import { z } from '@kbn/zod/v4';
import type { Router } from './router';
import type { RouteAccess } from '@kbn/core-http-server';
import { createRequest } from './versioned_router/core_versioned_route.test.util';
import { kibanaResponseFactory } from './response';

describe('handle', () => {
  let handler: jest.Func;
  let log: Logger;
  let router: Router;
  beforeEach(() => {
    router = createRouter();
    handler = jest.fn(async () => kibanaResponseFactory.ok());
    log = loggingSystemMock.createLogger();
  });
  describe('post validation events', () => {
    it('emits with validation schemas provided', async () => {
      const validate = { body: schema.object({ foo: schema.number() }) };
      await handle(createRequest({ body: { foo: 1 } }), {
        router,
        handler,
        log,
        method: 'get',
        route: { path: '/test', validate },
        routeSchemas: RouteValidator.from(validate),
      });
      // Failure
      await handle(createRequest({ body: { foo: 'bar' } }), {
        router,
        handler,
        log,
        method: 'get',
        route: {
          path: '/test',
          validate,
          options: {
            deprecated: {
              severity: 'warning',
              reason: { type: 'bump', newApiVersion: '123' },
              documentationUrl: 'http://test.foo',
            },
          },
        },
        routeSchemas: RouteValidator.from(validate),
      });

      expect(handler).toHaveBeenCalledTimes(1);
      expect(router.emitPostValidate).toHaveBeenCalledTimes(2);

      expect(router.emitPostValidate).toHaveBeenNthCalledWith(1, expect.any(Object), {
        deprecated: undefined,
        isInternalApiRequest: false,
        isPublicAccess: false,
      });
      expect(router.emitPostValidate).toHaveBeenNthCalledWith(2, expect.any(Object), {
        deprecated: {
          severity: 'warning',
          reason: { type: 'bump', newApiVersion: '123' },
          documentationUrl: 'http://test.foo',
        },
        isInternalApiRequest: false,
        isPublicAccess: false,
      });
    });

    it('emits with no validation schemas provided', async () => {
      await handle(createRequest({ body: { foo: 1 } }), {
        router,
        handler,
        log,
        method: 'get',
        route: {
          path: '/test',
          validate: false,
          options: {
            deprecated: {
              severity: 'warning',
              reason: { type: 'bump', newApiVersion: '123' },
              documentationUrl: 'http://test.foo',
            },
          },
        },
        routeSchemas: undefined,
      });

      expect(handler).toHaveBeenCalledTimes(1);
      expect(router.emitPostValidate).toHaveBeenCalledTimes(1);

      expect(router.emitPostValidate).toHaveBeenCalledWith(expect.any(Object), {
        deprecated: {
          severity: 'warning',
          reason: { type: 'bump', newApiVersion: '123' },
          documentationUrl: 'http://test.foo',
        },
        isInternalApiRequest: false,
        isPublicAccess: false,
      });
    });
  });

  it('maps request validation failures with onRequestValidationError', async () => {
    let rawError: unknown;
    const response = await handle(createRequest({ query: { foo: 'bar' } }), {
      router,
      handler,
      log,
      method: 'get',
      route: {
        path: '/test',
        validate: {
          request: { query: schema.object({ foo: schema.number() }) },
          response: {
            422: {
              description: 'Validation failed',
              body: () => schema.object({ message: schema.string(), source: schema.string() }),
            },
          },
          onRequestValidationError: (error, request, res) => {
            expect(error).toMatchObject({
              message: '[request query.foo]: expected value of type [number] but got [string]',
              source: 'query',
            });
            rawError = error.rawError;
            expect(request.query).toEqual({});
            return res.custom({
              statusCode: 422,
              body: { message: error.message, source: error.source },
            });
          },
        },
      },
      routeSchemas: RouteValidator.from({ query: schema.object({ foo: schema.number() }) }),
    });

    expect(handler).not.toHaveBeenCalled();
    expect(response.status).toEqual(422);
    expect(response.payload).toEqual({
      message: '[request query.foo]: expected value of type [number] but got [string]',
      source: 'query',
    });
    expect(rawError).toBeInstanceOf(Error);
    expect(rawError).toMatchObject({
      message: '[request query.foo]: expected value of type [number] but got [string]',
    });
    expect(log.error).toHaveBeenCalledWith('422 Request Validation Error', {
      error: { message: '[request query.foo]: expected value of type [number] but got [string]' },
      http: { request: { method: undefined, path: undefined }, response: { status_code: 422 } },
    });
  });

  it('preserves zod request validation failures as rawError', async () => {
    let rawError: unknown;
    const response = await handle(createRequest({ body: { foo: 1 } }), {
      router,
      handler,
      log,
      method: 'post',
      route: {
        path: '/test',
        validate: {
          request: { body: z.object({ foo: z.string() }) },
          response: { 422: { description: 'Validation failed' } },
          onRequestValidationError: (error, _request, res) => {
            rawError = error.rawError;
            return res.custom({
              statusCode: 422,
              body: { message: error.message, source: error.source },
            });
          },
        },
      },
      routeSchemas: RouteValidator.from({ body: z.object({ foo: z.string() }) }),
    });

    expect(response.status).toEqual(422);
    expect(response.payload).toMatchObject({
      message: expect.stringContaining('Invalid input: expected string, received number'),
      source: 'body',
    });
    expect(rawError).toBeInstanceOf(z.ZodError);
  });

  it('preserves custom validation result failures as rawError', async () => {
    let rawError: unknown;
    const response = await handle(createRequest({ query: { foo: 'bar' } }), {
      router,
      handler,
      log,
      method: 'get',
      route: {
        path: '/test',
        validate: {
          request: {
            query: (_data, validationResult) =>
              validationResult.badRequest(new Error('Custom validation failed')),
          },
          response: { 422: { description: 'Validation failed' } },
          onRequestValidationError: (error, _request, res) => {
            rawError = error.rawError;
            return res.custom({
              statusCode: 422,
              body: { message: error.message, source: error.source },
            });
          },
        },
      },
      routeSchemas: RouteValidator.from({
        query: (_data, validationResult) =>
          validationResult.badRequest(new Error('Custom validation failed')),
      }),
    });

    expect(response.status).toEqual(422);
    expect(response.payload).toEqual({
      message: '[request query]: Custom validation failed',
      source: 'query',
    });
    expect(rawError).toBeInstanceOf(Error);
    expect(rawError).toMatchObject({ message: 'Custom validation failed' });
  });

  it('normalizes custom validation functions that throw non-Error values', async () => {
    let rawError: unknown;
    const thrownValue = { code: 'invalid_query' };
    const response = await handle(createRequest({ query: { foo: 'bar' } }), {
      router,
      handler,
      log,
      method: 'get',
      route: {
        path: '/test',
        validate: {
          request: {
            query: () => {
              throw thrownValue;
            },
          },
          response: { 422: { description: 'Validation failed' } },
          onRequestValidationError: (error, _request, res) => {
            rawError = error.rawError;
            return res.custom({
              statusCode: 422,
              body: { message: error.message, source: error.source },
            });
          },
        },
      },
      routeSchemas: RouteValidator.from({
        query: () => {
          throw thrownValue;
        },
      }),
    });

    expect(response.status).toEqual(422);
    expect(response.payload).toEqual({
      message: '[request query]: [object Object]',
      source: 'query',
    });
    expect(rawError).toBe(thrownValue);
  });

  it('adds the public API version header to custom request validation error responses', async () => {
    const response = await handle(createRequest({ query: { foo: 'bar' } }), {
      router,
      handler,
      log,
      method: 'get',
      route: {
        path: '/test',
        validate: {
          request: { query: schema.object({ foo: schema.number() }) },
          response: { 418: { description: 'Validation failed' } },
          onRequestValidationError: (_error, _request, res) =>
            res.custom({ statusCode: 418, body: { error: 'validation_failed' } }),
        },
        options: { access: 'public' },
      },
      routeSchemas: RouteValidator.from({ query: schema.object({ foo: schema.number() }) }),
    });

    expect(response.status).toEqual(418);
    expect(response.options.headers).toEqual({ 'elastic-api-version': '2023-10-31' });
  });

  it('validates custom request validation error responses in dev mode', async () => {
    const response = await handle(createRequest({ query: { foo: 'bar' } }), {
      router,
      handler,
      log,
      method: 'get',
      isDevMode: true,
      route: {
        path: '/test',
        validate: {
          request: { query: schema.object({ foo: schema.number() }) },
          response: {
            422: {
              description: 'Validation failed',
              body: () => schema.object({ message: schema.string() }),
            },
          },
          onRequestValidationError: (_error, _request, res) =>
            res.custom({ statusCode: 422, body: { message: 1 } }),
        },
      },
      routeSchemas: RouteValidator.from({ query: schema.object({ foo: schema.number() }) }),
    });

    expect(response.status).toEqual(500);
    expect(response.payload).toMatch(
      'Failed output validation: [response body.message]: expected value of type [string] but got [number]'
    );
    expect(log.error).not.toHaveBeenCalled();
  });

  it('validates custom request validation error responses against the returned documented status', async () => {
    const response = await handle(createRequest({ query: { foo: 'bar' } }), {
      router,
      handler,
      log,
      method: 'get',
      isDevMode: true,
      route: {
        path: '/test',
        validate: {
          request: { query: schema.object({ foo: schema.number() }) },
          response: {
            400: {
              description: 'Bad request',
              body: () => schema.object({ message: schema.string() }),
            },
            422: {
              description: 'Validation failed',
              body: () => schema.object({ code: schema.literal('validation_failed') }),
            },
          },
          onRequestValidationError: (_error, _request, res) =>
            res.custom({ statusCode: 422, body: { code: 'validation_failed' } }),
        },
      },
      routeSchemas: RouteValidator.from({ query: schema.object({ foo: schema.number() }) }),
    });

    expect(response.status).toEqual(422);
    expect(response.payload).toEqual({ code: 'validation_failed' });
    expect(log.error).toHaveBeenCalledWith('422 Request Validation Error', {
      error: { message: '[request query.foo]: expected value of type [number] but got [string]' },
      http: { request: { method: undefined, path: undefined }, response: { status_code: 422 } },
    });
  });

  it('does not validate custom request validation error response bodies outside dev mode', async () => {
    const body = jest.fn(() => schema.object({ message: schema.string() }));

    const response = await handle(createRequest({ query: { foo: 'bar' } }), {
      router,
      handler,
      log,
      method: 'get',
      isDevMode: false,
      route: {
        path: '/test',
        validate: {
          request: { query: schema.object({ foo: schema.number() }) },
          response: {
            422: {
              description: 'Validation failed',
              body,
            },
          },
          onRequestValidationError: (_error, _request, res) =>
            res.custom({ statusCode: 422, body: { message: 1 } }),
        },
      },
      routeSchemas: RouteValidator.from({ query: schema.object({ foo: schema.number() }) }),
    });

    expect(response.status).toEqual(422);
    expect(response.payload).toEqual({ message: 1 });
    expect(body).not.toHaveBeenCalled();
  });

  it('rejects undocumented custom request validation error status codes in dev mode', async () => {
    const response = await handle(createRequest({ query: { foo: 'bar' } }), {
      router,
      handler,
      log,
      method: 'get',
      isDevMode: true,
      route: {
        path: '/test',
        validate: {
          request: { query: schema.object({ foo: schema.number() }) },
          response: { 400: { description: 'Validation failed' } },
          onRequestValidationError: (_error, _request, res) =>
            res.custom({ statusCode: 422, body: { message: 'Invalid request' } }),
        },
      },
      routeSchemas: RouteValidator.from({ query: schema.object({ foo: schema.number() }) }),
    });

    expect(response.status).toEqual(500);
    expect(response.payload).toMatch(
      "Failed output validation: No response validation defined for status code [422] in 'validate.response'."
    );
    expect(log.error).not.toHaveBeenCalled();
  });

  it('rejects invalid onRequestValidationError config', () => {
    expect(() =>
      buildRoute({
        router,
        handler,
        log,
        method: 'get',
        route: {
          path: '/test',
          validate: {
            request: { query: schema.object({ foo: schema.number() }) },
            response: { 400: { description: 'Validation failed' } },
            onRequestValidationError: 'not a function' as never,
          },
        },
      })
    ).toThrow(
      "The [get] at [/test] has an invalid 'validate.onRequestValidationError'. Expected a function."
    );
  });

  it('rejects onRequestValidationError config without response metadata', () => {
    expect(() =>
      buildRoute({
        router,
        handler,
        log,
        method: 'get',
        route: {
          path: '/test',
          validate: {
            request: { query: schema.object({ foo: schema.number() }) },
            onRequestValidationError: (_error, _request, res) => res.badRequest(),
          },
        },
      })
    ).toThrow(
      "The [get] at [/test] has an invalid 'validate.response'. Expected response metadata when 'validate.onRequestValidationError' is configured."
    );
  });
});

describe('validateHapiRequest', () => {
  let router: Router;
  let log: Logger;
  beforeEach(() => {
    router = createRouter();
    log = loggingSystemMock.createLogger();
  });
  it('validates hapi requests and returns kibana requests: ok case', () => {
    const { ok, error } = validateHapiRequest(hapiMocks.createRequest({ payload: { ok: true } }), {
      log,
      routeInfo: { access: 'public', httpResource: false },
      router,
      routeSchemas: RouteValidator.from({ body: schema.object({ ok: schema.literal(true) }) }),
    });
    expect(ok?.body).toEqual({ ok: true });
    expect(error).toBeUndefined();
    expect(log.error).not.toHaveBeenCalled();
  });
  it('validates hapi requests and returns kibana requests: error case', () => {
    const { ok, error } = validateHapiRequest(hapiMocks.createRequest({ payload: { ok: false } }), {
      log,
      routeInfo: { access: 'public', httpResource: false },
      router,
      routeSchemas: RouteValidator.from({ body: schema.object({ ok: schema.literal(true) }) }),
    });
    expect(ok).toBeUndefined();
    expect(error?.status).toEqual(400);
    expect(error?.payload).toMatch(/expected value to equal/);
    expect(log.error).toHaveBeenCalledTimes(1);
    expect(log.error).toHaveBeenCalledWith('400 Bad Request', {
      error: { message: '[request body.ok]: expected value to equal [true]' },
      http: { request: { method: undefined, path: undefined }, response: { status_code: 400 } },
    });
  });

  it('emits post validation events on the router', () => {
    const deps = {
      log,
      routeInfo: { access: 'public' as RouteAccess, httpResource: false },
      router,
      routeSchemas: RouteValidator.from({ body: schema.object({ ok: schema.literal(true) }) }),
    };
    {
      const { ok, error } = validateHapiRequest(
        hapiMocks.createRequest({ payload: { ok: false } }),
        deps
      );
      expect(ok).toBeUndefined();
      expect(error).toBeDefined();
      expect(router.emitPostValidate).toHaveBeenCalledTimes(1);
      expect(router.emitPostValidate).toHaveBeenCalledWith(expect.any(Object), {
        deprecated: undefined,
        isInternalApiRequest: false,
        isPublicAccess: true,
      });
    }
    {
      const { ok, error } = validateHapiRequest(
        hapiMocks.createRequest({ payload: { ok: true } }),
        deps
      );
      expect(ok).toBeDefined();
      expect(error).toBeUndefined();
      expect(router.emitPostValidate).toHaveBeenCalledTimes(2);
      expect(router.emitPostValidate).toHaveBeenNthCalledWith(2, expect.any(Object), {
        deprecated: undefined,
        isInternalApiRequest: false,
        isPublicAccess: true,
      });
    }
  });
});
