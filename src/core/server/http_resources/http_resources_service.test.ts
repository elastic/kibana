/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
import { IRouter, RouteConfig } from '../http';

import { coreMock } from '../mocks';
import { mockCoreContext } from '../core_context.mock';
import { httpServiceMock } from '../http/http_service.mock';
import { httpServerMock } from '../http/http_server.mocks';
import { renderingMock } from '../rendering/rendering_service.mock';
import { HttpResourcesService, SetupDeps } from './http_resources_service';
import { httpResourcesMock } from './http_resources_service.mock';

const coreContext = mockCoreContext.create();

describe('HttpResources service', () => {
  let service: HttpResourcesService;
  let setupDeps: SetupDeps;
  let router: jest.Mocked<IRouter>;
  const kibanaRequest = httpServerMock.createKibanaRequest();
  const context = { core: coreMock.createRequestHandlerContext() };
  describe('#createRegistrar', () => {
    beforeEach(() => {
      setupDeps = {
        http: httpServiceMock.createInternalSetupContract(),
        rendering: renderingMock.createSetupContract(),
      };
      service = new HttpResourcesService(coreContext);
      router = httpServiceMock.createRouter();
    });

    describe('register', () => {
      describe('renderCoreApp', () => {
        it('formats successful response', async () => {
          const routeConfig: RouteConfig<any, any, any, 'get'> = { path: '/', validate: false };
          const { createRegistrar } = await service.setup(setupDeps);
          const { register } = createRegistrar(router);
          register(routeConfig, async (ctx, req, res) => {
            return res.renderCoreApp();
          });
          const [[, routeHandler]] = router.get.mock.calls;

          const responseFactory = httpResourcesMock.createResponseFactory();
          await routeHandler(context, kibanaRequest, responseFactory);
          expect(setupDeps.rendering.render).toHaveBeenCalledWith(
            kibanaRequest,
            context.core.uiSettings.client,
            {
              includeUserSettings: true,
            }
          );
        });

        it('can attach headers, except the CSP header', async () => {
          const routeConfig: RouteConfig<any, any, any, 'get'> = { path: '/', validate: false };
          const { createRegistrar } = await service.setup(setupDeps);
          const { register } = createRegistrar(router);
          register(routeConfig, async (ctx, req, res) => {
            return res.renderCoreApp({
              headers: {
                'content-security-policy': "script-src 'unsafe-eval'",
                'x-kibana': '42',
              },
            });
          });

          const [[, routeHandler]] = router.get.mock.calls;

          const responseFactory = httpResourcesMock.createResponseFactory();
          await routeHandler(context, kibanaRequest, responseFactory);

          expect(responseFactory.ok).toHaveBeenCalledWith({
            body: '<body />',
            headers: {
              'x-kibana': '42',
              'content-security-policy':
                "script-src 'unsafe-eval' 'self'; worker-src blob: 'self'; style-src 'unsafe-inline' 'self'",
            },
          });
        });
      });
      describe('renderAnonymousCoreApp', () => {
        it('formats successful response', async () => {
          const routeConfig: RouteConfig<any, any, any, 'get'> = { path: '/', validate: false };
          const { createRegistrar } = await service.setup(setupDeps);
          const { register } = createRegistrar(router);
          register(routeConfig, async (ctx, req, res) => {
            return res.renderAnonymousCoreApp();
          });
          const [[, routeHandler]] = router.get.mock.calls;

          const responseFactory = httpResourcesMock.createResponseFactory();
          await routeHandler(context, kibanaRequest, responseFactory);
          expect(setupDeps.rendering.render).toHaveBeenCalledWith(
            kibanaRequest,
            context.core.uiSettings.client,
            {
              includeUserSettings: false,
            }
          );
        });

        it('can attach headers, except the CSP header', async () => {
          const routeConfig: RouteConfig<any, any, any, 'get'> = { path: '/', validate: false };
          const { createRegistrar } = await service.setup(setupDeps);
          const { register } = createRegistrar(router);
          register(routeConfig, async (ctx, req, res) => {
            return res.renderAnonymousCoreApp({
              headers: {
                'content-security-policy': "script-src 'unsafe-eval'",
                'x-kibana': '42',
              },
            });
          });

          const [[, routeHandler]] = router.get.mock.calls;

          const responseFactory = httpResourcesMock.createResponseFactory();
          await routeHandler(context, kibanaRequest, responseFactory);

          expect(responseFactory.ok).toHaveBeenCalledWith({
            body: '<body />',
            headers: {
              'x-kibana': '42',
              'content-security-policy':
                "script-src 'unsafe-eval' 'self'; worker-src blob: 'self'; style-src 'unsafe-inline' 'self'",
            },
          });
        });
      });
      describe('renderHtml', () => {
        it('formats successful response', async () => {
          const htmlBody = '<html><body /></html>';
          const routeConfig: RouteConfig<any, any, any, 'get'> = { path: '/', validate: false };
          const { createRegistrar } = await service.setup(setupDeps);
          const { register } = createRegistrar(router);
          register(routeConfig, async (ctx, req, res) => {
            return res.renderHtml({ body: htmlBody });
          });
          const [[, routeHandler]] = router.get.mock.calls;

          const responseFactory = httpResourcesMock.createResponseFactory();
          await routeHandler(context, kibanaRequest, responseFactory);
          expect(responseFactory.ok).toHaveBeenCalledWith({
            body: htmlBody,
            headers: {
              'content-type': 'text/html',
              'content-security-policy':
                "script-src 'unsafe-eval' 'self'; worker-src blob: 'self'; style-src 'unsafe-inline' 'self'",
            },
          });
        });

        it('can attach headers, except the CSP & "content-type" headers', async () => {
          const htmlBody = '<html><body /></html>';
          const routeConfig: RouteConfig<any, any, any, 'get'> = { path: '/', validate: false };
          const { createRegistrar } = await service.setup(setupDeps);
          const { register } = createRegistrar(router);
          register(routeConfig, async (ctx, req, res) => {
            return res.renderHtml({
              body: htmlBody,
              headers: {
                'content-type': 'text/html5',
                'content-security-policy': "script-src 'unsafe-eval'",
                'x-kibana': '42',
              },
            });
          });

          const [[, routeHandler]] = router.get.mock.calls;

          const responseFactory = httpResourcesMock.createResponseFactory();
          await routeHandler(context, kibanaRequest, responseFactory);

          expect(responseFactory.ok).toHaveBeenCalledWith({
            body: htmlBody,
            headers: {
              'content-type': 'text/html',
              'x-kibana': '42',
              'content-security-policy':
                "script-src 'unsafe-eval' 'self'; worker-src blob: 'self'; style-src 'unsafe-inline' 'self'",
            },
          });
        });
      });
      describe('renderJs', () => {
        it('formats successful response', async () => {
          const jsBody = 'alert(1);';
          const routeConfig: RouteConfig<any, any, any, 'get'> = { path: '/', validate: false };
          const { createRegistrar } = await service.setup(setupDeps);
          const { register } = createRegistrar(router);
          register(routeConfig, async (ctx, req, res) => {
            return res.renderJs({ body: jsBody });
          });
          const [[, routeHandler]] = router.get.mock.calls;

          const responseFactory = httpResourcesMock.createResponseFactory();
          await routeHandler(context, kibanaRequest, responseFactory);
          expect(responseFactory.ok).toHaveBeenCalledWith({
            body: jsBody,
            headers: {
              'content-type': 'text/javascript',
              'content-security-policy':
                "script-src 'unsafe-eval' 'self'; worker-src blob: 'self'; style-src 'unsafe-inline' 'self'",
            },
          });
        });

        it('can attach headers, except the CSP & "content-type" headers', async () => {
          const jsBody = 'alert(1);';
          const routeConfig: RouteConfig<any, any, any, 'get'> = { path: '/', validate: false };
          const { createRegistrar } = await service.setup(setupDeps);
          const { register } = createRegistrar(router);
          register(routeConfig, async (ctx, req, res) => {
            return res.renderJs({
              body: jsBody,
              headers: {
                'content-type': 'text/html',
                'content-security-policy': "script-src 'unsafe-eval'",
                'x-kibana': '42',
              },
            });
          });

          const [[, routeHandler]] = router.get.mock.calls;

          const responseFactory = httpResourcesMock.createResponseFactory();
          await routeHandler(context, kibanaRequest, responseFactory);

          expect(responseFactory.ok).toHaveBeenCalledWith({
            body: jsBody,
            headers: {
              'content-type': 'text/javascript',
              'x-kibana': '42',
              'content-security-policy':
                "script-src 'unsafe-eval' 'self'; worker-src blob: 'self'; style-src 'unsafe-inline' 'self'",
            },
          });
        });
      });
    });
  });
});
