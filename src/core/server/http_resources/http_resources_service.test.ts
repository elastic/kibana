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
  beforeEach(() => {
    setupDeps = {
      http: httpServiceMock.createSetupContract(),
      rendering: renderingMock.createSetupContract(),
    };
    service = new HttpResourcesService(coreContext);
    router = httpServiceMock.createRouter();
  });
  describe('#createRegistrar', () => {
    describe('registerCoreApp', () => {
      it('registers core app with route config', async () => {
        const routeConfig: RouteConfig<any, any, any, 'get'> = { path: '/', validate: false };
        const { createRegistrar } = await service.setup(setupDeps);
        const { registerCoreApp } = createRegistrar(router);
        registerCoreApp(routeConfig);

        const [[routerConfig]] = router.get.mock.calls;
        expect(routerConfig).toBe(routeConfig);
      });

      it('renders page with user settings and CSP header', async () => {
        const routeConfig: RouteConfig<any, any, any, 'get'> = { path: '/', validate: false };
        const { createRegistrar } = await service.setup(setupDeps);
        const { registerCoreApp } = createRegistrar(router);
        registerCoreApp(routeConfig);

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

        expect(responseFactory.ok).toHaveBeenCalledWith({
          body: '<body />',
          headers: {
            'content-security-policy':
              "script-src 'unsafe-eval' 'self'; worker-src blob: 'self'; style-src 'unsafe-inline' 'self'",
          },
        });
      });

      it('can attach headers, except the CSP header', async () => {
        const routeConfig: RouteConfig<any, any, any, 'get'> = { path: '/', validate: false };
        const { createRegistrar } = await service.setup(setupDeps);
        const { registerCoreApp } = createRegistrar(router);
        registerCoreApp(routeConfig, {
          headers: {
            'content-security-policy': "script-src 'unsafe-eval'",
            'x-kibana': '42',
          },
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
    describe('registerAnonymousCoreApp', () => {
      it('registers core app with route config', async () => {
        const routeConfig: RouteConfig<any, any, any, 'get'> = { path: '/', validate: false };
        const { createRegistrar } = await service.setup(setupDeps);
        const { registerAnonymousCoreApp } = createRegistrar(router);
        registerAnonymousCoreApp(routeConfig);

        const [[routerConfig]] = router.get.mock.calls;
        expect(routerConfig).toBe(routeConfig);
      });

      it('renders page with user settings and CSP header', async () => {
        const routeConfig: RouteConfig<any, any, any, 'get'> = { path: '/', validate: false };
        const { createRegistrar } = await service.setup(setupDeps);
        const { registerAnonymousCoreApp } = createRegistrar(router);
        registerAnonymousCoreApp(routeConfig);

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

        expect(responseFactory.ok).toHaveBeenCalledWith({
          body: '<body />',
          headers: {
            'content-security-policy':
              "script-src 'unsafe-eval' 'self'; worker-src blob: 'self'; style-src 'unsafe-inline' 'self'",
          },
        });
      });

      it('can attach headers, except the CSP header', async () => {
        const routeConfig: RouteConfig<any, any, any, 'get'> = { path: '/', validate: false };
        const { createRegistrar } = await service.setup(setupDeps);
        const { registerAnonymousCoreApp } = createRegistrar(router);
        registerAnonymousCoreApp(routeConfig, {
          headers: {
            'content-security-policy': "script-src 'unsafe-eval'",
            'x-kibana': '42',
          },
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
    it.todo('register');
  });
});
