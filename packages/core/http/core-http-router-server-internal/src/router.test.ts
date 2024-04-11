/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Router, type RouterOptions } from './router';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { schema } from '@kbn/config-schema';
import { createFooValidation } from './router.test.util';
import { createRequestMock } from '@kbn/hapi-mocks/src/request';

const mockResponse: any = {
  code: jest.fn().mockImplementation(() => mockResponse),
  header: jest.fn().mockImplementation(() => mockResponse),
};
const mockResponseToolkit: any = {
  response: jest.fn().mockReturnValue(mockResponse),
};

const logger = loggingSystemMock.create().get();
const enhanceWithContext = (fn: (...args: any[]) => any) => fn.bind(null, {});

const routerOptions: RouterOptions = {
  isDev: false,
  versionedRouterOptions: {
    defaultHandlerResolutionStrategy: 'oldest',
    useVersionResolutionStrategyForInternalPaths: [],
  },
};

describe('Router', () => {
  afterEach(() => jest.clearAllMocks());
  describe('#getRoutes', () => {
    it('returns expected route metadata', () => {
      const router = new Router('', logger, enhanceWithContext, routerOptions);
      const validation = schema.object({ foo: schema.string() });
      router.post(
        { path: '/', validate: { body: validation, query: validation, params: validation } },
        (context, req, res) => res.ok()
      );
      const routes = router.getRoutes();
      expect(routes).toHaveLength(1);
      const [route] = routes;
      expect(route).toMatchObject({
        handler: expect.any(Function),
        method: 'post',
        path: '/',
        validationSchemas: { body: validation, query: validation, params: validation },
        isVersioned: false,
      });
    });

    it('can exclude versioned routes', () => {
      const router = new Router('', logger, enhanceWithContext, routerOptions);
      const validation = schema.object({ foo: schema.string() });
      router.post(
        {
          path: '/versioned',
          validate: { body: validation, query: validation, params: validation },
        },
        (context, req, res) => res.ok(),
        { isVersioned: true }
      );
      router.get(
        {
          path: '/unversioned',
          validate: { body: validation, query: validation, params: validation },
        },
        (context, req, res) => res.ok()
      );
      const routes = router.getRoutes({ excludeVersionedRoutes: true });
      expect(routes).toHaveLength(1);
      const [route] = routes;
      expect(route).toMatchObject({
        method: 'get',
        path: '/unversioned',
      });
    });
  });

  const { fooValidation, validateBodyFn, validateOutputFn, validateParamsFn, validateQueryFn } =
    createFooValidation();

  it.each([['static' as const], ['lazy' as const]])(
    'runs %s route validations',
    async (staticOrLazy) => {
      const router = new Router('', logger, enhanceWithContext, routerOptions);
      router.post(
        {
          path: '/',
          validate: staticOrLazy ? fooValidation : () => fooValidation,
        },
        (context, req, res) => res.ok()
      );
      const [{ handler }] = router.getRoutes();
      await handler(
        createRequestMock({
          params: { foo: 1 },
          query: { foo: 1 },
          payload: { foo: 1 },
        }),
        mockResponseToolkit
      );
      expect(validateBodyFn).toHaveBeenCalledTimes(1);
      expect(validateParamsFn).toHaveBeenCalledTimes(1);
      expect(validateQueryFn).toHaveBeenCalledTimes(1);
      expect(validateOutputFn).toHaveBeenCalledTimes(0);
    }
  );

  describe('Options', () => {
    it('throws if validation for a route is not defined explicitly', () => {
      const router = new Router('', logger, enhanceWithContext, routerOptions);
      expect(
        // we use 'any' because validate is a required field
        () => router.get({ path: '/' } as any, (context, req, res) => res.ok({}))
      ).toThrowErrorMatchingInlineSnapshot(
        `"The [get] at [/] does not have a 'validate' specified. Use 'false' as the value if you want to bypass validation."`
      );
    });
    it('throws if validation for a route is declared wrong', () => {
      const router = new Router('', logger, enhanceWithContext, routerOptions);
      expect(() =>
        router.get(
          // we use 'any' because validate requires valid Type or function usage
          {
            path: '/',
            validate: { params: { validate: () => 'error' } } as any,
          },
          (context, req, res) => res.ok({})
        )
      ).toThrowErrorMatchingInlineSnapshot(
        `"Expected a valid validation logic declared with '@kbn/config-schema' package or a RouteValidationFunction at key: [params]."`
      );
    });

    it('throws if options.body.output is not a valid value', () => {
      const router = new Router('', logger, enhanceWithContext, routerOptions);
      expect(() =>
        router.post(
          // we use 'any' because TS already checks we cannot provide this body.output
          {
            path: '/',
            options: { body: { output: 'file' } } as any, // We explicitly don't support 'file'
            validate: { body: schema.object({}, { unknowns: 'allow' }) },
          },
          (context, req, res) => res.ok({})
        )
      ).toThrowErrorMatchingInlineSnapshot(
        `"[options.body.output: 'file'] in route POST / is not valid. Only 'data' or 'stream' are valid."`
      );
    });

    it('should default `output: "stream" and parse: false` when no body validation is required but not a GET', () => {
      const router = new Router('', logger, enhanceWithContext, routerOptions);
      router.post({ path: '/', validate: {} }, (context, req, res) => res.ok({}));
      const [route] = router.getRoutes();
      expect(route.options).toEqual({ body: { output: 'stream', parse: false } });
    });

    it('should NOT default `output: "stream" and parse: false` when the user has specified body options (he cares about it)', () => {
      const router = new Router('', logger, enhanceWithContext, routerOptions);
      router.post(
        { path: '/', options: { body: { maxBytes: 1 } }, validate: {} },
        (context, req, res) => res.ok({})
      );
      const [route] = router.getRoutes();
      expect(route.options).toEqual({ body: { maxBytes: 1 } });
    });

    it('should NOT default `output: "stream" and parse: false` when no body validation is required and GET', () => {
      const router = new Router('', logger, enhanceWithContext, routerOptions);
      router.get({ path: '/', validate: {} }, (context, req, res) => res.ok({}));
      const [route] = router.getRoutes();
      expect(route.options).toEqual({});
    });
  });
});
