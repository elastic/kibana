/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { hapiMocks } from '@kbn/hapi-mocks';
import { validateHapiRequest, handle } from './route';
import { createRouter } from './versioned_router/mocks';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { Logger } from '@kbn/logging';
import { RouteValidator } from './validator';
import { schema } from '@kbn/config-schema';
import { Router } from './router';
import { RouteAccess } from '@kbn/core-http-server';
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
