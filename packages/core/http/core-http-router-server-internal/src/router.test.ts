/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Router, type RouterOptions } from './router';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { isConfigSchema, schema } from '@kbn/config-schema';
import { createFooValidation } from './router.test.util';
import { createRequestMock } from '@kbn/hapi-mocks/src/request';
import type { RouteValidatorRequestAndResponses } from '@kbn/core-http-server';

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
  let testValidation: ReturnType<typeof createFooValidation>;
  beforeEach(() => {
    testValidation = createFooValidation();
  });
  afterEach(() => jest.clearAllMocks());
  describe('#getRoutes', () => {
    it('returns expected route metadata', () => {
      const router = new Router('', logger, enhanceWithContext, routerOptions);
      const validation = schema.object({ foo: schema.string() });
      router.post(
        {
          path: '/',
          validate: { body: validation, query: validation, params: validation },
          options: {
            deprecated: true,
            discontinued: 'post test discontinued',
            summary: 'post test summary',
            description: 'post test description',
          },
        },
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
        options: {
          deprecated: true,
          discontinued: 'post test discontinued',
          summary: 'post test summary',
          description: 'post test description',
        },
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

  it.each([['static' as const], ['lazy' as const]])(
    'runs %s route validations',
    async (staticOrLazy) => {
      const { fooValidation } = testValidation;
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
      const { validateBodyFn, validateParamsFn, validateQueryFn, validateOutputFn } =
        testValidation;
      expect(validateBodyFn).toHaveBeenCalledTimes(1);
      expect(validateParamsFn).toHaveBeenCalledTimes(1);
      expect(validateQueryFn).toHaveBeenCalledTimes(1);
      expect(validateOutputFn).toHaveBeenCalledTimes(0);
    }
  );

  it('constructs lazily provided validations once (idempotency)', async () => {
    const router = new Router('', logger, enhanceWithContext, routerOptions);
    const { fooValidation } = testValidation;

    const response200 = fooValidation.response[200].body;
    const lazyResponse200 = jest.fn(() => response200());
    fooValidation.response[200].body = lazyResponse200;

    const response404 = fooValidation.response[404].body;
    const lazyResponse404 = jest.fn(() => response404());
    fooValidation.response[404].body = lazyResponse404;

    const lazyValidation = jest.fn(() => fooValidation);
    router.post(
      {
        path: '/',
        validate: lazyValidation,
      },
      (context, req, res) => res.ok()
    );
    const [{ handler, validationSchemas }] = router.getRoutes();
    for (let i = 0; i < 10; i++) {
      await handler(
        createRequestMock({
          params: { foo: 1 },
          query: { foo: 1 },
          payload: { foo: 1 },
        }),
        mockResponseToolkit
      );

      expect(
        isConfigSchema(
          (
            validationSchemas as () => RouteValidatorRequestAndResponses<unknown, unknown, unknown>
          )().response![200].body!()
        )
      ).toBe(true);
      expect(
        isConfigSchema(
          (
            validationSchemas as () => RouteValidatorRequestAndResponses<unknown, unknown, unknown>
          )().response![404].body!()
        )
      ).toBe(true);
    }
    expect(lazyValidation).toHaveBeenCalledTimes(1);
    expect(lazyResponse200).toHaveBeenCalledTimes(1);
    expect(lazyResponse404).toHaveBeenCalledTimes(1);
  });

  it('registers pluginId if provided', () => {
    const pluginId = Symbol('test');
    const router = new Router('', logger, enhanceWithContext, { pluginId });
    expect(router.pluginId).toBe(pluginId);
  });

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
        `"Expected a valid validation logic declared with '@kbn/config-schema' package, '@kbn/zod' package or a RouteValidationFunction at key: [params]."`
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

    it('throws if enabled security config is not valid', () => {
      const router = new Router('', logger, enhanceWithContext, routerOptions);
      expect(() =>
        router.get(
          {
            path: '/',
            validate: false,
            security: {
              authz: {
                requiredPrivileges: [],
              },
            },
          },
          (context, req, res) => res.ok({})
        )
      ).toThrowErrorMatchingInlineSnapshot(
        `"[authz.requiredPrivileges]: array size is [0], but cannot be smaller than [1]"`
      );
    });

    it('throws if disabled security config does not provide opt-out reason', () => {
      const router = new Router('', logger, enhanceWithContext, routerOptions);
      expect(() =>
        router.get(
          {
            path: '/',
            validate: false,
            security: {
              // @ts-expect-error
              authz: {
                enabled: false,
              },
            },
          },
          (context, req, res) => res.ok({})
        )
      ).toThrowErrorMatchingInlineSnapshot(
        `"[authz.reason]: expected value of type [string] but got [undefined]"`
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
