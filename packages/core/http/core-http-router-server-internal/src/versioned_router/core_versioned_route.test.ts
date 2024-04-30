/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { ApiVersion } from '@kbn/core-http-common';
import type {
  KibanaResponseFactory,
  RequestHandler,
  RouteConfig,
  VersionedRouteValidation,
} from '@kbn/core-http-server';
import { Router } from '../router';
import { createFooValidation } from '../router.test.util';
import { createRouter } from './mocks';
import { CoreVersionedRouter, unwrapVersionedResponseBodyValidation } from '.';
import { passThroughValidation } from './core_versioned_route';
import { Method } from './types';
import { createRequest } from './core_versioned_route.test.util';
import { isConfigSchema } from '@kbn/config-schema';

describe('Versioned route', () => {
  let router: Router;
  let responseFactory: jest.Mocked<KibanaResponseFactory>;
  let testValidation: ReturnType<typeof createFooValidation>;
  const handlerFn: RequestHandler = async (ctx, req, res) => res.ok({ body: { foo: 1 } });
  beforeEach(() => {
    testValidation = createFooValidation();
    responseFactory = {
      custom: jest.fn(({ body, statusCode }) => ({
        options: {},
        status: statusCode,
        payload: body,
      })),
      badRequest: jest.fn(({ body }) => ({ status: 400, payload: body, options: {} })),
      ok: jest.fn(({ body } = {}) => ({
        options: {},
        status: 200,
        payload: body,
      })),
    } as any;
    router = createRouter();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('can register multiple handlers', () => {
    const versionedRouter = CoreVersionedRouter.from({ router });
    versionedRouter
      .get({ path: '/test/{id}', access: 'internal' })
      .addVersion({ version: '1', validate: false }, handlerFn)
      .addVersion({ version: '2', validate: false }, handlerFn)
      .addVersion({ version: '3', validate: false }, handlerFn);
    const routes = versionedRouter.getRoutes();
    expect(routes).toHaveLength(1);
    const [route] = routes;
    expect(route.handlers).toHaveLength(3);
    // We only register one route with the underlying router
    expect(router.get).toHaveBeenCalledTimes(1);
  });

  it('does not allow specifying a handler for the same version more than once', () => {
    const versionedRouter = CoreVersionedRouter.from({ router });
    expect(() =>
      versionedRouter
        .get({ path: '/test/{id}', access: 'internal' })
        .addVersion({ version: '1', validate: false }, handlerFn)
        .addVersion({ version: '1', validate: false }, handlerFn)
        .addVersion({ version: '3', validate: false }, handlerFn)
    ).toThrowError(
      `Version "1" handler has already been registered for the route [get] [/test/{id}]`
    );
  });

  it('only allows versions that are numbers greater than 0 for internal APIs', () => {
    const versionedRouter = CoreVersionedRouter.from({ router });
    expect(() =>
      versionedRouter
        .get({ path: '/test/{id}', access: 'internal' })
        .addVersion({ version: 'foo' as ApiVersion, validate: false }, handlerFn)
    ).toThrowError(`Invalid version number`);
    expect(() =>
      versionedRouter
        .get({ path: '/test/{id}', access: 'internal' })
        .addVersion({ version: '-1', validate: false }, handlerFn)
    ).toThrowError(`Invalid version number`);
    expect(() =>
      versionedRouter
        .get({ path: '/test/{id}', access: 'internal' })
        .addVersion({ version: '1.1', validate: false }, handlerFn)
    ).toThrowError(`Invalid version number`);
    expect(() =>
      versionedRouter
        .get({ path: '/test/{id}', access: 'internal' })
        .addVersion({ version: '1', validate: false }, handlerFn)
    ).not.toThrow();
  });

  it('only allows correctly formatted version date strings for public APIs', () => {
    const versionedRouter = CoreVersionedRouter.from({ router });
    expect(() =>
      versionedRouter
        .get({ path: '/test/{id}', access: 'public' })
        .addVersion({ version: '1-1-2020' as ApiVersion, validate: false }, handlerFn)
    ).toThrowError(/Invalid version/);
    expect(() =>
      versionedRouter
        .get({ path: '/test/{id}', access: 'public' })
        .addVersion({ version: '', validate: false }, handlerFn)
    ).toThrowError(/Invalid version/);
    expect(() =>
      versionedRouter
        .get({ path: '/test/{id}', access: 'public' })
        .addVersion({ version: 'abc', validate: false }, handlerFn)
    ).toThrowError(/Invalid version/);
    expect(() =>
      versionedRouter
        .get({ path: '/test/{id}', access: 'public' })
        .addVersion({ version: '2023-10-31', validate: false }, handlerFn)
    ).not.toThrow();
  });

  it('passes through the expected values to the IRouter registrar', () => {
    const versionedRouter = CoreVersionedRouter.from({ router });
    const opts: Parameters<typeof versionedRouter.post>[0] = {
      path: '/test/{id}',
      access: 'internal',
      options: {
        authRequired: true,
        tags: ['access:test'],
        timeout: { payload: 60_000, idleSocket: 10_000 },
        xsrfRequired: false,
      },
    };

    versionedRouter.post(opts);
    expect(router.post).toHaveBeenCalledTimes(1);
    const { access, options } = opts;

    const expectedRouteConfig: RouteConfig<unknown, unknown, unknown, Method> = {
      path: opts.path,
      options: { access, ...options },
      validate: passThroughValidation,
    };

    expect(router.post).toHaveBeenCalledWith(
      expect.objectContaining(expectedRouteConfig),
      expect.any(Function),
      { isVersioned: true }
    );
  });

  it('allows public versions other than "2023-10-31"', () => {
    expect(() =>
      CoreVersionedRouter.from({ router, isDev: false })
        .get({ access: 'public', path: '/foo' })
        .addVersion({ version: '2023-01-31', validate: false }, (ctx, req, res) => res.ok())
    ).not.toThrow();
  });

  it.each([['static' as const], ['lazy' as const]])(
    'runs %s request validations',
    async (staticOrLazy) => {
      let handler: RequestHandler;
      const { fooValidation, validateBodyFn, validateOutputFn, validateParamsFn, validateQueryFn } =
        testValidation;

      (router.post as jest.Mock).mockImplementation((opts: unknown, fn) => (handler = fn));
      const versionedRouter = CoreVersionedRouter.from({ router });
      versionedRouter.post({ path: '/test/{id}', access: 'internal' }).addVersion(
        {
          version: '1',
          validate: staticOrLazy === 'static' ? fooValidation : () => fooValidation,
        },
        handlerFn
      );

      const kibanaResponse = await handler!(
        {} as any,
        createRequest({
          version: '1',
          body: { foo: 1 },
          params: { foo: 1 },
          query: { foo: 1 },
        }),
        responseFactory
      );

      expect(kibanaResponse.status).toBe(200);
      expect(validateBodyFn).toHaveBeenCalledTimes(1);
      expect(validateParamsFn).toHaveBeenCalledTimes(1);
      expect(validateQueryFn).toHaveBeenCalledTimes(1);
      expect(validateOutputFn).toHaveBeenCalledTimes(0); // does not call this in non-dev
    }
  );

  it('constructs lazily provided validations once (idempotency)', async () => {
    let handler: RequestHandler;
    const { fooValidation } = testValidation;

    const response200 = fooValidation.response[200].body;
    const lazyResponse200 = jest.fn(() => response200());
    fooValidation.response[200].body = lazyResponse200;

    const response404 = fooValidation.response[404].body;
    const lazyResponse404 = jest.fn(() => response404());
    fooValidation.response[404].body = lazyResponse404;

    (router.post as jest.Mock).mockImplementation((opts: unknown, fn) => (handler = fn));
    const versionedRouter = CoreVersionedRouter.from({ router });
    const lazyValidation = jest.fn(() => fooValidation);
    versionedRouter.post({ path: '/test/{id}', access: 'internal' }).addVersion(
      {
        version: '1',
        validate: lazyValidation,
      },
      handlerFn
    );

    for (let i = 0; i < 10; i++) {
      const { status } = await handler!(
        {} as any,
        createRequest({
          version: '1',
          body: { foo: 1 },
          params: { foo: 1 },
          query: { foo: 1 },
        }),
        responseFactory
      );
      const [route] = versionedRouter.getRoutes();
      const [
        {
          options: { validate },
        },
      ] = route.handlers;

      const res200 = (validate as () => VersionedRouteValidation<unknown, unknown, unknown>)()
        .response![200].body;

      expect(isConfigSchema(unwrapVersionedResponseBodyValidation(res200))).toBe(true);

      const res404 = (validate as () => VersionedRouteValidation<unknown, unknown, unknown>)()
        .response![404].body;

      expect(isConfigSchema(unwrapVersionedResponseBodyValidation(res404))).toBe(true);

      expect(status).toBe(200);
    }

    expect(lazyValidation).toHaveBeenCalledTimes(1);
    expect(lazyResponse200).toHaveBeenCalledTimes(1);
    expect(lazyResponse404).toHaveBeenCalledTimes(1);
  });

  describe('when in dev', () => {
    // NOTE: Temporary test to ensure single public API version is enforced
    it('only allows "2023-10-31" as public route versions', () => {
      expect(() =>
        CoreVersionedRouter.from({ router, isDev: true })
          .get({ access: 'public', path: '/foo' })
          .addVersion({ version: '2023-01-31', validate: false }, (ctx, req, res) => res.ok())
      ).toThrow(/Invalid public version/);
    });

    it('runs response validations', async () => {
      let handler: RequestHandler;
      const { fooValidation, validateBodyFn, validateOutputFn, validateParamsFn, validateQueryFn } =
        testValidation;

      (router.post as jest.Mock).mockImplementation((opts: unknown, fn) => (handler = fn));
      const versionedRouter = CoreVersionedRouter.from({ router, isDev: true });
      versionedRouter.post({ path: '/test/{id}', access: 'internal' }).addVersion(
        {
          version: '1',
          validate: fooValidation,
        },
        handlerFn
      );

      const kibanaResponse = await handler!(
        {} as any,
        createRequest({
          version: '1',
          body: { foo: 1 },
          params: { foo: 1 },
          query: { foo: 1 },
        }),
        responseFactory
      );

      expect(kibanaResponse.status).toBe(200);
      expect(validateBodyFn).toHaveBeenCalledTimes(1);
      expect(validateParamsFn).toHaveBeenCalledTimes(1);
      expect(validateQueryFn).toHaveBeenCalledTimes(1);
      expect(validateOutputFn).toHaveBeenCalledTimes(1);
    });

    it('runs custom response validations', async () => {
      let handler: RequestHandler;
      const { fooValidation, validateBodyFn, validateOutputFn, validateParamsFn, validateQueryFn } =
        testValidation;

      const custom = jest.fn(() => ({ value: 1 }));
      fooValidation.response[200].body = { custom } as any;
      (router.post as jest.Mock).mockImplementation((opts: unknown, fn) => (handler = fn));
      const versionedRouter = CoreVersionedRouter.from({ router, isDev: true });
      versionedRouter.post({ path: '/test/{id}', access: 'internal' }).addVersion(
        {
          version: '1',
          validate: fooValidation,
        },
        handlerFn
      );

      const kibanaResponse = await handler!(
        {} as any,
        createRequest({
          version: '1',
          body: { foo: 1 },
          params: { foo: 1 },
          query: { foo: 1 },
        }),
        responseFactory
      );

      expect(kibanaResponse.status).toBe(200);
      expect(validateBodyFn).toHaveBeenCalledTimes(1);
      expect(validateParamsFn).toHaveBeenCalledTimes(1);
      expect(validateQueryFn).toHaveBeenCalledTimes(1);
      expect(validateOutputFn).toHaveBeenCalledTimes(0);
      expect(custom).toHaveBeenCalledTimes(1);
    });
  });

  it('allows using default resolution for specific internal routes', async () => {
    const versionedRouter = CoreVersionedRouter.from({
      router,
      isDev: true,
      useVersionResolutionStrategyForInternalPaths: ['/bypass_me/{id?}'],
    });

    let bypassVersionHandler: RequestHandler;
    (router.post as jest.Mock).mockImplementation(
      (opts: unknown, fn) => (bypassVersionHandler = fn)
    );
    versionedRouter.post({ path: '/bypass_me/{id?}', access: 'internal' }).addVersion(
      {
        version: '1',
        validate: false,
      },
      handlerFn
    );

    let doNotBypassHandler1: RequestHandler;
    (router.put as jest.Mock).mockImplementation((opts: unknown, fn) => (doNotBypassHandler1 = fn));
    versionedRouter.put({ path: '/do_not_bypass_me/{id}', access: 'internal' }).addVersion(
      {
        version: '1',
        validate: false,
      },
      handlerFn
    );

    let doNotBypassHandler2: RequestHandler;
    (router.get as jest.Mock).mockImplementation((opts: unknown, fn) => (doNotBypassHandler2 = fn));
    versionedRouter.get({ path: '/do_not_bypass_me_either', access: 'internal' }).addVersion(
      {
        version: '1',
        validate: false,
      },
      handlerFn
    );

    const byPassedVersionResponse = await bypassVersionHandler!(
      {} as any,
      createRequest({ version: undefined }),
      responseFactory
    );

    const doNotBypassResponse1 = await doNotBypassHandler1!(
      {} as any,
      createRequest({ version: undefined }),
      responseFactory
    );

    const doNotBypassResponse2 = await doNotBypassHandler2!(
      {} as any,
      createRequest({ version: undefined }),
      responseFactory
    );

    expect(byPassedVersionResponse.status).toBe(200);
    expect(doNotBypassResponse1.status).toBe(400);
    expect(doNotBypassResponse1.payload).toMatch('Please specify a version');
    expect(doNotBypassResponse2.status).toBe(400);
    expect(doNotBypassResponse2.payload).toMatch('Please specify a version');
  });
});
