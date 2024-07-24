/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { RouteConfig } from '@kbn/core-http-server';
import { mockCoreContext } from '@kbn/core-base-server-mocks';
import { httpServiceMock, httpServerMock } from '@kbn/core-http-server-mocks';
import { renderingServiceMock } from '@kbn/core-rendering-server-mocks';
import { HttpResourcesService, PrebootDeps, SetupDeps } from './http_resources_service';
import type { HttpResources } from '@kbn/core-http-resources-server';
import {
  createCoreRequestHandlerContextMock,
  createHttpResourcesResponseFactory,
} from './test_helpers/http_resources_service_test_mocks';

const coreContext = mockCoreContext.create();

describe('HttpResources service', () => {
  let service: HttpResourcesService;
  let prebootDeps: PrebootDeps;
  let setupDeps: SetupDeps;
  let router: ReturnType<typeof httpServiceMock.createRouter>;
  const kibanaRequest = httpServerMock.createKibanaRequest();
  const context = createCoreRequestHandlerContextMock();

  describe('#createRegistrar', () => {
    beforeEach(() => {
      prebootDeps = {
        http: httpServiceMock.createInternalPrebootContract(),
        rendering: renderingServiceMock.createPrebootContract(),
      };
      setupDeps = {
        http: httpServiceMock.createInternalSetupContract(),
        rendering: renderingServiceMock.createSetupContract(),
      };
      service = new HttpResourcesService(coreContext);
      router = httpServiceMock.createRouter();
    });

    function runRegisterTestSuite(
      name: string,
      initializer: () => Promise<HttpResources['register']>,
      getDeps: () => PrebootDeps | SetupDeps
    ) {
      describe(`${name} register`, () => {
        const routeConfig: RouteConfig<any, any, any, 'get'> = { path: '/', validate: false };
        let register: HttpResources['register'];

        beforeEach(async () => {
          register = await initializer();
        });

        it('registration defaults to "public" access', () => {
          register(routeConfig, async (ctx, req, res) => res.ok());
          const [[registeredRouteConfig]] = router.get.mock.calls;
          expect(registeredRouteConfig.options?.access).toBe('public');
        });

        it('registration can set access to "internal"', () => {
          register({ ...routeConfig, options: { access: 'internal' } }, async (ctx, req, res) =>
            res.ok()
          );
          const [[registeredRouteConfig]] = router.get.mock.calls;
          expect(registeredRouteConfig.options?.access).toBe('internal');
        });

        describe('renderCoreApp', () => {
          it('formats successful response', async () => {
            register(routeConfig, async (ctx, req, res) => {
              return res.renderCoreApp();
            });
            const [[, routeHandler]] = router.get.mock.calls;

            const responseFactory = createHttpResourcesResponseFactory();
            await routeHandler(context, kibanaRequest, responseFactory);
            expect(getDeps().rendering.render).toHaveBeenCalledWith(
              kibanaRequest,
              {
                client: (await context.core).uiSettings.client,
                globalClient: (await context.core).uiSettings.globalClient,
              },
              {
                isAnonymousPage: false,
              }
            );
          });
        });

        describe('renderAnonymousCoreApp', () => {
          it('formats successful response', async () => {
            register(routeConfig, async (ctx, req, res) => {
              return res.renderAnonymousCoreApp();
            });
            const [[, routeHandler]] = router.get.mock.calls;

            const responseFactory = createHttpResourcesResponseFactory();
            await routeHandler(context, kibanaRequest, responseFactory);
            expect(getDeps().rendering.render).toHaveBeenCalledWith(
              kibanaRequest,
              {
                client: (await context.core).uiSettings.client,
                globalClient: (await context.core).uiSettings.globalClient,
              },
              {
                isAnonymousPage: true,
              }
            );
          });
        });

        describe('renderHtml', () => {
          it('formats successful response', async () => {
            const htmlBody = '<html><body /></html>';
            register(routeConfig, async (ctx, req, res) => {
              return res.renderHtml({ body: htmlBody });
            });
            const [[, routeHandler]] = router.get.mock.calls;

            const responseFactory = createHttpResourcesResponseFactory();
            await routeHandler(context, kibanaRequest, responseFactory);
            expect(responseFactory.ok).toHaveBeenCalledWith({
              body: htmlBody,
              headers: {
                'content-type': 'text/html',
              },
            });
          });

          it('can attach headers, except the "content-type" header', async () => {
            const htmlBody = '<html><body /></html>';
            register(routeConfig, async (ctx, req, res) => {
              return res.renderHtml({
                body: htmlBody,
                headers: {
                  'content-type': 'text/html5',
                  'x-kibana': '42',
                },
              });
            });

            const [[, routeHandler]] = router.get.mock.calls;

            const responseFactory = createHttpResourcesResponseFactory();
            await routeHandler(context, kibanaRequest, responseFactory);

            expect(responseFactory.ok).toHaveBeenCalledWith({
              body: htmlBody,
              headers: {
                'content-type': 'text/html',
                'x-kibana': '42',
              },
            });
          });
        });

        describe('renderJs', () => {
          it('formats successful response', async () => {
            const jsBody = 'alert(1);';
            register(routeConfig, async (ctx, req, res) => {
              return res.renderJs({ body: jsBody });
            });
            const [[, routeHandler]] = router.get.mock.calls;

            const responseFactory = createHttpResourcesResponseFactory();
            await routeHandler(context, kibanaRequest, responseFactory);
            expect(responseFactory.ok).toHaveBeenCalledWith({
              body: jsBody,
              headers: {
                'content-type': 'text/javascript',
              },
            });
          });

          it('can attach headers, except the "content-type" header', async () => {
            const jsBody = 'alert(1);';
            register(routeConfig, async (ctx, req, res) => {
              return res.renderJs({
                body: jsBody,
                headers: {
                  'content-type': 'text/html',
                  'x-kibana': '42',
                },
              });
            });

            const [[, routeHandler]] = router.get.mock.calls;

            const responseFactory = createHttpResourcesResponseFactory();
            await routeHandler(context, kibanaRequest, responseFactory);

            expect(responseFactory.ok).toHaveBeenCalledWith({
              body: jsBody,
              headers: {
                'content-type': 'text/javascript',
                'x-kibana': '42',
              },
            });
          });
        });

        describe('renderCss', () => {
          it('formats successful response', async () => {
            const cssBody = `body {border: 1px solid red;}`;
            register(routeConfig, async (ctx, req, res) => {
              return res.renderCss({ body: cssBody });
            });
            const [[, routeHandler]] = router.get.mock.calls;

            const responseFactory = createHttpResourcesResponseFactory();
            await routeHandler(context, kibanaRequest, responseFactory);
            expect(responseFactory.ok).toHaveBeenCalledWith({
              body: cssBody,
              headers: {
                'content-type': 'text/css',
              },
            });
          });

          it('can attach headers, except the "content-type" header', async () => {
            const cssBody = `body {border: 1px solid red;}`;
            register(routeConfig, async (ctx, req, res) => {
              return res.renderCss({
                body: cssBody,
                headers: {
                  'content-type': 'text/css5',
                  'x-kibana': '42',
                },
              });
            });

            const [[, routeHandler]] = router.get.mock.calls;

            const responseFactory = createHttpResourcesResponseFactory();
            await routeHandler(context, kibanaRequest, responseFactory);

            expect(responseFactory.ok).toHaveBeenCalledWith({
              body: cssBody,
              headers: {
                'content-type': 'text/css',
                'x-kibana': '42',
              },
            });
          });
        });
      });
    }

    runRegisterTestSuite(
      '#preboot',
      async () => {
        const { createRegistrar } = await service.preboot(prebootDeps);
        return createRegistrar(router).register;
      },
      () => prebootDeps
    );

    runRegisterTestSuite(
      '#setup',
      async () => {
        await service.preboot(prebootDeps);
        const { createRegistrar } = await service.setup(setupDeps);
        return createRegistrar(router).register;
      },
      () => setupDeps
    );
  });
});
