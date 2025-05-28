/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ApiVersion } from '@kbn/core-http-common';
import type {
  RequestHandler,
  VersionedRouteValidation,
  RouteSecurity,
} from '@kbn/core-http-server';
import { InternalRouteHandler, Router } from '../router';
import { createFooValidation } from '../router.test.util';
import { createRouter } from './mocks';
import { CoreVersionedRouter, unwrapVersionedResponseBodyValidation } from '.';
import { createRequest } from './core_versioned_route.test.util';
import { isConfigSchema } from '@kbn/config-schema';
import { ELASTIC_HTTP_VERSION_HEADER } from '@kbn/core-http-common';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { getEnvOptions, createTestEnv } from '@kbn/config-mocks';

const notDevOptions = getEnvOptions();
notDevOptions.cliArgs.dev = false;
const notDevEnv = createTestEnv({ envOptions: notDevOptions });
const devEnv = createTestEnv();

describe('Versioned route', () => {
  let router: Router;
  let versionedRouter: CoreVersionedRouter;
  let testValidation: ReturnType<typeof createFooValidation>;
  const handlerFn: RequestHandler = async (ctx, req, res) => res.ok({ body: { foo: 1 } });
  beforeEach(() => {
    testValidation = createFooValidation();
    router = createRouter();
    versionedRouter = CoreVersionedRouter.from({
      router,
      log: loggingSystemMock.createLogger(),
      env: notDevEnv,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('#getRoutes', () => {
    it('returns the expected metadata', () => {
      versionedRouter
        .get({
          path: '/test/{id}',
          access: 'public',
          options: {
            httpResource: true,
            availability: {
              since: '1.0.0',
              stability: 'experimental',
            },
            excludeFromOAS: true,
            tags: ['1', '2', '3'],
          },
          description: 'test',
          summary: 'test',
          enableQueryVersion: false,
          security: {
            authz: {
              requiredPrivileges: ['foo'],
            },
          },
        })
        .addVersion({ version: '2023-10-31', validate: false }, handlerFn);

      expect(versionedRouter.getRoutes()[0].options).toMatchObject({
        access: 'public',
        enableQueryVersion: false,
        description: 'test',
        summary: 'test',
        options: {
          httpResource: true,
          availability: {
            since: '1.0.0',
            stability: 'experimental',
          },
          excludeFromOAS: true,
          tags: ['1', '2', '3'],
        },
      });
    });
  });

  it('can register multiple handlers', () => {
    versionedRouter
      .get({
        path: '/test/{id}',
        access: 'internal',
        security: {
          authz: {
            requiredPrivileges: ['foo'],
          },
        },
      })
      .addVersion({ version: '1', validate: false }, handlerFn)
      .addVersion({ version: '2', validate: false }, handlerFn)
      .addVersion({ version: '3', validate: false }, handlerFn);
    const routes = versionedRouter.getRoutes();
    expect(routes).toHaveLength(1);
    const [route] = routes;
    expect(route.handlers).toHaveLength(3);
    // We only register one route with the underlying router
    expect(router.registerRoute).toHaveBeenCalledTimes(1);
    expect(router.registerRoute).toHaveBeenCalledWith({
      isVersioned: true,
      handler: expect.any(Function),
      security: expect.any(Function),
      method: 'get',
      options: { access: 'internal' },
      path: '/test/{id}',
    });
  });

  it('does not allow specifying a handler for the same version more than once', () => {
    expect(() =>
      versionedRouter
        .get({
          path: '/test/{id}',
          access: 'internal',
          security: {
            authz: {
              requiredPrivileges: ['foo'],
            },
          },
        })
        .addVersion({ version: '1', validate: false }, handlerFn)
        .addVersion({ version: '1', validate: false }, handlerFn)
        .addVersion({ version: '3', validate: false }, handlerFn)
    ).toThrowError(
      `Version "1" handler has already been registered for the route [get] [/test/{id}]`
    );
  });

  it('only allows versions that are numbers greater than 0 for internal APIs', () => {
    expect(() =>
      versionedRouter
        .get({
          path: '/test/{id}',
          access: 'internal',
          security: {
            authz: {
              requiredPrivileges: ['foo'],
            },
          },
        })
        .addVersion({ version: 'foo' as ApiVersion, validate: false }, handlerFn)
    ).toThrowError(`Invalid version number`);
    expect(() =>
      versionedRouter
        .get({
          path: '/test/{id}',
          access: 'internal',
          security: {
            authz: {
              requiredPrivileges: ['foo'],
            },
          },
        })
        .addVersion({ version: '-1', validate: false }, handlerFn)
    ).toThrowError(`Invalid version number`);
    expect(() =>
      versionedRouter
        .get({
          path: '/test/{id}',
          access: 'internal',
          security: {
            authz: {
              requiredPrivileges: ['foo'],
            },
          },
        })
        .addVersion({ version: '1.1', validate: false }, handlerFn)
    ).toThrowError(`Invalid version number`);
    expect(() =>
      versionedRouter
        .get({
          path: '/test/{id}',
          access: 'internal',
          security: {
            authz: {
              requiredPrivileges: ['foo'],
            },
          },
        })
        .addVersion({ version: '1', validate: false }, handlerFn)
    ).not.toThrow();
  });

  it('only allows correctly formatted version date strings for public APIs', () => {
    expect(() =>
      versionedRouter
        .get({
          path: '/test/{id}',
          access: 'public',
          security: {
            authz: {
              requiredPrivileges: ['foo'],
            },
          },
        })
        .addVersion({ version: '1-1-2020' as ApiVersion, validate: false }, handlerFn)
    ).toThrowError(/Invalid version/);
    expect(() =>
      versionedRouter
        .get({
          path: '/test/{id}',
          access: 'public',
          security: {
            authz: {
              requiredPrivileges: ['foo'],
            },
          },
        })
        .addVersion({ version: '', validate: false }, handlerFn)
    ).toThrowError(/Invalid version/);
    expect(() =>
      versionedRouter
        .get({
          path: '/test/{id}',
          access: 'public',
          security: {
            authz: {
              requiredPrivileges: ['foo'],
            },
          },
        })
        .addVersion({ version: 'abc', validate: false }, handlerFn)
    ).toThrowError(/Invalid version/);
    expect(() =>
      versionedRouter
        .get({
          path: '/test/{id}',
          access: 'public',
          security: {
            authz: {
              requiredPrivileges: ['foo'],
            },
          },
        })
        .addVersion({ version: '2023-10-31', validate: false }, handlerFn)
    ).not.toThrow();
  });

  it('passes through all expected values to the router registrar', () => {
    const opts: Parameters<typeof versionedRouter.post>[0] = {
      path: '/test/{id}',
      access: 'internal',
      summary: 'test',
      description: 'test',
      options: {
        authRequired: true,
        tags: ['oas:test'],
        timeout: { payload: 60_000, idleSocket: 10_000 },
        xsrfRequired: false,
        excludeFromOAS: true,
        httpResource: true,
      },
      security: {
        authz: {
          requiredPrivileges: ['foo'],
        },
      },
    };

    versionedRouter.post(opts);

    expect(router.registerRoute).toHaveBeenCalledTimes(1);
    expect(router.registerRoute).toHaveBeenCalledWith({
      handler: expect.any(Function),
      isVersioned: true,
      method: 'post',
      options: {
        access: 'internal',
        authRequired: true,
        excludeFromOAS: true,
        httpResource: true,
        tags: ['oas:test'],
        timeout: { idleSocket: 10_000, payload: 60_000 },
        xsrfRequired: false,
      },
      path: '/test/{id}',
      security: expect.any(Function),
    });
  });

  it('allows public versions other than "2023-10-31"', () => {
    expect(() =>
      CoreVersionedRouter.from({ router, log: loggingSystemMock.createLogger(), env: notDevEnv })
        .get({
          access: 'public',
          path: '/foo',
          security: {
            authz: {
              requiredPrivileges: ['foo'],
            },
          },
        })
        .addVersion({ version: '2023-01-31', validate: false }, (ctx, req, res) => res.ok())
    ).not.toThrow();
  });

  it.each([['static' as const], ['lazy' as const]])(
    'runs %s request validations',
    async (staticOrLazy) => {
      let handler: InternalRouteHandler;
      const { fooValidation, validateBodyFn, validateOutputFn, validateParamsFn, validateQueryFn } =
        testValidation;

      (router.registerRoute as jest.Mock).mockImplementation((opts) => (handler = opts.handler));
      versionedRouter
        .post({
          path: '/test/{id}',
          access: 'internal',
          security: {
            authz: {
              requiredPrivileges: ['foo'],
            },
          },
        })
        .addVersion(
          {
            version: '1',
            validate: staticOrLazy === 'static' ? fooValidation : () => fooValidation,
          },
          handlerFn
        );

      const kibanaResponse = await handler!(
        createRequest({
          version: '1',
          body: { foo: 1 },
          params: { foo: 1 },
          query: { foo: 1 },
        })
      );

      expect(kibanaResponse.status).toBe(200);
      expect(validateBodyFn).toHaveBeenCalledTimes(1);
      expect(validateParamsFn).toHaveBeenCalledTimes(1);
      expect(validateQueryFn).toHaveBeenCalledTimes(1);
      expect(validateOutputFn).toHaveBeenCalledTimes(0); // does not call this in non-dev
    }
  );

  it('constructs lazily provided validations once (idempotency)', async () => {
    let handler: InternalRouteHandler;
    const { fooValidation } = testValidation;

    const response200 = fooValidation.response[200].body;
    const lazyResponse200 = jest.fn(() => response200());
    fooValidation.response[200].body = lazyResponse200;

    const response404 = fooValidation.response[404].body;
    const lazyResponse404 = jest.fn(() => response404());
    fooValidation.response[404].body = lazyResponse404;

    (router.registerRoute as jest.Mock).mockImplementation((opts) => (handler = opts.handler));
    const lazyValidation = jest.fn(() => fooValidation);
    versionedRouter
      .post({
        path: '/test/{id}',
        access: 'internal',
        security: {
          authz: {
            requiredPrivileges: ['foo'],
          },
        },
      })
      .addVersion(
        {
          version: '1',
          validate: lazyValidation,
        },
        handlerFn
      );

    for (let i = 0; i < 10; i++) {
      const { status } = await handler!(
        createRequest({
          version: '1',
          body: { foo: 1 },
          params: { foo: 1 },
          query: { foo: 1 },
        })
      );
      const [route] = versionedRouter.getRoutes();
      const [
        {
          options: { validate },
        },
      ] = route.handlers;

      const res200 = (validate as () => VersionedRouteValidation<unknown, unknown, unknown>)()
        .response![200].body!;

      expect(isConfigSchema(unwrapVersionedResponseBodyValidation(res200))).toBe(true);

      const res404 = (validate as () => VersionedRouteValidation<unknown, unknown, unknown>)()
        .response![404].body!;

      expect(isConfigSchema(unwrapVersionedResponseBodyValidation(res404))).toBe(true);

      expect(status).toBe(200);
    }

    expect(lazyValidation).toHaveBeenCalledTimes(1);
    expect(lazyResponse200).toHaveBeenCalledTimes(1);
    expect(lazyResponse404).toHaveBeenCalledTimes(1);
  });

  describe('when in dev', () => {
    beforeEach(() => {
      versionedRouter = CoreVersionedRouter.from({
        router,
        env: devEnv,
        log: loggingSystemMock.createLogger(),
      });
    });
    // NOTE: Temporary test to ensure single public API version is enforced
    it('only allows "2023-10-31" as public route versions', () => {
      expect(() =>
        versionedRouter
          .get({
            access: 'public',
            path: '/foo',
            security: {
              authz: {
                requiredPrivileges: ['foo'],
              },
            },
          })
          .addVersion({ version: '2023-01-31', validate: false }, (ctx, req, res) => res.ok())
      ).toThrow(/Invalid public version/);
    });

    it('runs response validations', async () => {
      let handler: InternalRouteHandler;
      const { fooValidation, validateBodyFn, validateOutputFn, validateParamsFn, validateQueryFn } =
        testValidation;

      (router.registerRoute as jest.Mock).mockImplementation((opts) => (handler = opts.handler));
      versionedRouter
        .post({
          path: '/test/{id}',
          access: 'internal',
          security: {
            authz: {
              requiredPrivileges: ['foo'],
            },
          },
        })
        .addVersion(
          {
            version: '1',
            validate: fooValidation,
          },
          handlerFn
        );

      const kibanaResponse = await handler!(
        createRequest({
          version: '1',
          body: { foo: 1 },
          params: { foo: 1 },
          query: { foo: 1 },
        })
      );

      expect(kibanaResponse.status).toBe(200);
      expect(validateBodyFn).toHaveBeenCalledTimes(1);
      expect(validateParamsFn).toHaveBeenCalledTimes(1);
      expect(validateQueryFn).toHaveBeenCalledTimes(1);
      expect(validateOutputFn).toHaveBeenCalledTimes(1);
    });

    it('handles "undefined" response schemas', async () => {
      let handler: InternalRouteHandler;

      (router.registerRoute as jest.Mock).mockImplementation((opts) => (handler = opts.handler));
      versionedRouter = CoreVersionedRouter.from({
        router,
        env: devEnv,
        log: loggingSystemMock.createLogger(),
      });
      versionedRouter
        .post({
          path: '/test/{id}',
          access: 'internal',
          security: {
            authz: {
              requiredPrivileges: ['foo'],
            },
          },
        })
        .addVersion(
          {
            version: '1',
            validate: { response: { 500: { description: 'jest description', body: undefined } } },
          },
          async (ctx, req, res) => res.custom({ statusCode: 500 })
        );

      await expect(
        handler!(
          createRequest({
            version: '1',
            body: { foo: 1 },
            params: { foo: 1 },
            query: { foo: 1 },
          })
        )
      ).resolves.not.toThrow();
    });

    it('runs custom response validations', async () => {
      let handler: InternalRouteHandler;
      const { fooValidation, validateBodyFn, validateOutputFn, validateParamsFn, validateQueryFn } =
        testValidation;

      const custom = jest.fn(() => ({ value: 1 }));
      fooValidation.response[200].body = { custom } as any;
      (router.registerRoute as jest.Mock).mockImplementation((opts) => (handler = opts.handler));
      versionedRouter = CoreVersionedRouter.from({
        router,
        env: devEnv,
        log: loggingSystemMock.createLogger(),
      });
      versionedRouter
        .post({
          path: '/test/{id}',
          access: 'internal',
          security: {
            authz: {
              requiredPrivileges: ['foo'],
            },
          },
        })
        .addVersion(
          {
            version: '1',
            validate: fooValidation,
          },
          handlerFn
        );

      const kibanaResponse = await handler!(
        createRequest({
          version: '1',
          body: { foo: 1 },
          params: { foo: 1 },
          query: { foo: 1 },
        })
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
    versionedRouter = CoreVersionedRouter.from({
      router,
      env: devEnv,
      log: loggingSystemMock.createLogger(),
      useVersionResolutionStrategyForInternalPaths: ['/bypass_me/{id?}'],
    });

    let bypassVersionHandler: InternalRouteHandler;
    (router.registerRoute as jest.Mock).mockImplementation(
      (opts) => (bypassVersionHandler = opts.handler)
    );
    versionedRouter
      .post({
        path: '/bypass_me/{id?}',
        access: 'internal',
        security: {
          authz: {
            requiredPrivileges: ['foo'],
          },
        },
      })
      .addVersion(
        {
          version: '1',
          validate: false,
        },
        handlerFn
      );

    let doNotBypassHandler1: InternalRouteHandler;
    (router.registerRoute as jest.Mock).mockImplementation(
      (opts) => (doNotBypassHandler1 = opts.handler)
    );
    versionedRouter
      .put({
        path: '/do_not_bypass_me/{id}',
        access: 'internal',
        security: {
          authz: {
            requiredPrivileges: ['foo'],
          },
        },
      })
      .addVersion(
        {
          version: '1',
          validate: false,
        },
        handlerFn
      );

    let doNotBypassHandler2: InternalRouteHandler;
    (router.registerRoute as jest.Mock).mockImplementation(
      (opts) => (doNotBypassHandler2 = opts.handler)
    );
    versionedRouter
      .get({
        path: '/do_not_bypass_me_either',
        access: 'internal',
        security: {
          authz: {
            requiredPrivileges: ['foo'],
          },
        },
      })
      .addVersion(
        {
          version: '1',
          validate: false,
        },
        handlerFn
      );

    const byPassedVersionResponse = await bypassVersionHandler!(
      createRequest({ version: undefined })
    );

    const doNotBypassResponse1 = await doNotBypassHandler1!(createRequest({ version: undefined }));

    const doNotBypassResponse2 = await doNotBypassHandler2!(createRequest({ version: undefined }));

    expect(byPassedVersionResponse.status).toBe(200);
    expect(doNotBypassResponse1.status).toBe(400);
    expect(doNotBypassResponse1.payload).toMatch('Please specify a version');
    expect(doNotBypassResponse2.status).toBe(400);
    expect(doNotBypassResponse2.payload).toMatch('Please specify a version');
  });

  it('can register multiple handlers with different security configurations', () => {
    const securityConfig1: RouteSecurity = {
      authz: {
        requiredPrivileges: ['foo'],
      },
      authc: {
        enabled: 'optional',
      },
    };
    const securityConfig2: RouteSecurity = {
      authz: {
        requiredPrivileges: ['foo', 'bar'],
      },
      authc: {
        enabled: true,
      },
    };
    const securityConfig3: RouteSecurity = {
      authz: {
        requiredPrivileges: ['foo', 'bar', 'baz'],
      },
    };
    versionedRouter
      .get({
        path: '/test/{id}',
        access: 'internal',
        security: {
          authz: {
            requiredPrivileges: ['foo'],
          },
        },
      })
      .addVersion(
        {
          version: '1',
          validate: false,
          security: securityConfig1,
        },
        handlerFn
      )
      .addVersion(
        {
          version: '2',
          validate: false,
          security: securityConfig2,
        },
        handlerFn
      )
      .addVersion(
        {
          version: '3',
          validate: false,
          security: securityConfig3,
        },
        handlerFn
      );
    const routes = versionedRouter.getRoutes();
    expect(routes).toHaveLength(1);
    const [route] = routes;
    expect(route.handlers).toHaveLength(3);

    expect(route.handlers[0].options.security).toStrictEqual(securityConfig1);
    expect(route.handlers[1].options.security).toStrictEqual(securityConfig2);
    expect(route.handlers[2].options.security).toStrictEqual(securityConfig3);
    expect(router.registerRoute).toHaveBeenCalledTimes(1);
  });

  it('falls back to default security configuration if it is not specified for specific version', () => {
    const securityConfigDefault: RouteSecurity = {
      authz: {
        requiredPrivileges: ['foo', 'bar', 'baz'],
      },
      authc: undefined,
    };
    const securityConfig1: RouteSecurity = {
      authz: {
        requiredPrivileges: ['foo'],
      },
      authc: undefined,
    };
    const securityConfig2: RouteSecurity = {
      authz: {
        requiredPrivileges: ['foo', 'bar'],
      },
      authc: undefined,
    };
    const versionedRoute = versionedRouter
      .get({ path: '/test/{id}', access: 'internal', security: securityConfigDefault })
      .addVersion(
        {
          version: '1',
          validate: false,
          security: securityConfig1,
        },
        handlerFn
      )
      .addVersion(
        {
          version: '2',
          validate: false,
          security: securityConfig2,
        },
        handlerFn
      )
      .addVersion(
        {
          version: '3',
          validate: false,
        },
        handlerFn
      );
    const routes = versionedRouter.getRoutes();
    expect(routes).toHaveLength(1);
    const [route] = routes;
    expect(route.handlers).toHaveLength(3);

    expect(
      // @ts-expect-error
      versionedRoute.getSecurity({
        headers: { [ELASTIC_HTTP_VERSION_HEADER]: '99' },
      })
    ).toStrictEqual(securityConfigDefault);

    expect(
      // @ts-expect-error
      versionedRoute.getSecurity({
        headers: { [ELASTIC_HTTP_VERSION_HEADER]: '1' },
      })
    ).toStrictEqual(securityConfig1);

    expect(
      // @ts-expect-error
      versionedRoute.getSecurity({
        headers: { [ELASTIC_HTTP_VERSION_HEADER]: '2' },
      })
    ).toStrictEqual(securityConfig2);

    expect(
      // @ts-expect-error
      versionedRoute.getSecurity({
        headers: { [ELASTIC_HTTP_VERSION_HEADER]: '99' },
      })
    ).toStrictEqual(securityConfigDefault);
    expect(router.registerRoute).toHaveBeenCalledTimes(1);
  });

  it('validates security configuration', () => {
    const validSecurityConfig: RouteSecurity = {
      authz: {
        requiredPrivileges: ['foo'],
      },
      authc: {
        enabled: 'optional',
      },
    };

    expect(() =>
      versionedRouter.get({
        path: '/test/{id}',
        access: 'internal',
        security: {
          authz: {
            requiredPrivileges: [],
          },
        },
      })
    ).toThrowErrorMatchingInlineSnapshot(
      `"[authz.requiredPrivileges]: array size is [0], but cannot be smaller than [1]"`
    );

    const route = versionedRouter.get({
      path: '/test/{id}',
      access: 'internal',
      security: validSecurityConfig,
    });

    expect(() =>
      route.addVersion(
        {
          version: '1',
          validate: false,
          security: {
            authz: {
              requiredPrivileges: [{ allRequired: ['foo'], anyRequired: ['bar'] }],
            },
          },
        },
        handlerFn
      )
    ).toThrowErrorMatchingInlineSnapshot(`
      "[authz.requiredPrivileges.0]: types that failed validation:
      - [authz.requiredPrivileges.0.0.anyRequired]: array size is [1], but cannot be smaller than [2]
      - [authz.requiredPrivileges.0.1]: expected value of type [string] but got [Object]"
    `);
  });

  it('should correctly merge security configuration for versions', () => {
    const validSecurityConfig: RouteSecurity = {
      authz: {
        requiredPrivileges: ['foo'],
      },
      authc: {
        enabled: 'optional',
      },
    };

    const route = versionedRouter.get({
      path: '/test/{id}',
      access: 'internal',
      security: validSecurityConfig,
    });

    route.addVersion(
      {
        version: '1',
        validate: false,
        security: {
          authz: {
            requiredPrivileges: ['foo', 'bar'],
          },
        },
      },
      handlerFn
    );

    // @ts-expect-error for test purpose
    const security = route.getSecurity({ headers: { [ELASTIC_HTTP_VERSION_HEADER]: '1' } });

    expect(security.authc).toEqual({ enabled: 'optional' });

    expect(security.authz).toEqual({ requiredPrivileges: ['foo', 'bar'] });
  });

  describe('emits post validation events on the router', () => {
    let handler: InternalRouteHandler;

    it('for routes with validation', async () => {
      const { fooValidation } = testValidation;
      (router.registerRoute as jest.Mock).mockImplementation((opts) => (handler = opts.handler));
      versionedRouter
        .post({
          path: '/test/{id}',
          access: 'internal',
          security: {
            authz: {
              requiredPrivileges: ['foo'],
            },
          },
        })
        .addVersion(
          {
            version: '1',
            validate: fooValidation,
            options: {
              deprecated: {
                severity: 'warning',
                reason: { type: 'bump', newApiVersion: '123' },
                documentationUrl: 'http://test.foo',
              },
            },
          },
          handlerFn
        );

      await handler!(
        createRequest({
          version: '1',
          body: { foo: 1 },
          params: { foo: 1 },
          query: { foo: 1 },
        })
      );
      // Failed validation
      await handler!(createRequest({ version: '1' }));

      expect(router.emitPostValidate).toHaveBeenCalledTimes(2);
      expect(router.emitPostValidate).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({ apiVersion: '1' }),
        {
          deprecated: {
            severity: 'warning',
            reason: { type: 'bump', newApiVersion: '123' },
            documentationUrl: 'http://test.foo',
          },
          isInternalApiRequest: false,
          isPublicAccess: false,
        }
      );
      expect(router.emitPostValidate).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ apiVersion: '1' }),
        {
          deprecated: {
            severity: 'warning',
            reason: { type: 'bump', newApiVersion: '123' },
            documentationUrl: 'http://test.foo',
          },
          isInternalApiRequest: false,
          isPublicAccess: false,
        }
      );
    });

    it('for routes without validation', async () => {
      (router.registerRoute as jest.Mock).mockImplementation((opts) => (handler = opts.handler));
      versionedRouter
        .post({
          path: '/test/{id}',
          access: 'internal',
          security: {
            authz: {
              requiredPrivileges: ['foo'],
            },
          },
        })
        .addVersion(
          {
            version: '1',
            validate: false,
            options: {
              deprecated: {
                severity: 'warning',
                reason: { type: 'bump', newApiVersion: '123' },
                documentationUrl: 'http://test.foo',
              },
            },
          },
          handlerFn
        );

      await handler!(createRequest({ version: '1' }));
      expect(router.emitPostValidate).toHaveBeenCalledTimes(1);
      expect(router.emitPostValidate).toHaveBeenCalledWith(
        expect.objectContaining({ apiVersion: '1' }),
        {
          deprecated: {
            severity: 'warning',
            reason: { type: 'bump', newApiVersion: '123' },
            documentationUrl: 'http://test.foo',
          },
          isInternalApiRequest: false,
          isPublicAccess: false,
        }
      );
    });
  });
});
