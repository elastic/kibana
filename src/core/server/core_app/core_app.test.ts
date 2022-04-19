/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { registerBundleRoutesMock } from './core_app.test.mocks';

import { mockCoreContext } from '../core_context.mock';
import { coreMock, httpServerMock } from '../mocks';
import { httpResourcesMock } from '../http_resources/http_resources_service.mock';
import type { UiPlugins } from '../plugins';
import { PluginType } from '../plugins';
import { CoreApp } from './core_app';
import { mockRouter } from '../http/router/router.mock';
import { RequestHandlerContext } from '..';

const emptyPlugins = (): UiPlugins => ({
  internal: new Map(),
  public: new Map(),
  browserConfigs: new Map(),
});

describe('CoreApp', () => {
  let coreContext: ReturnType<typeof mockCoreContext.create>;
  let coreApp: CoreApp;
  let internalCorePreboot: ReturnType<typeof coreMock.createInternalPreboot>;
  let prebootHTTPResourcesRegistrar: ReturnType<typeof httpResourcesMock.createRegistrar>;
  let internalCoreSetup: ReturnType<typeof coreMock.createInternalSetup>;
  let httpResourcesRegistrar: ReturnType<typeof httpResourcesMock.createRegistrar>;

  beforeEach(() => {
    coreContext = mockCoreContext.create();

    internalCorePreboot = coreMock.createInternalPreboot();
    internalCorePreboot.http.registerRoutes.mockImplementation((path, callback) =>
      callback(mockRouter.create())
    );
    prebootHTTPResourcesRegistrar = httpResourcesMock.createRegistrar();
    internalCorePreboot.httpResources.createRegistrar.mockReturnValue(
      prebootHTTPResourcesRegistrar
    );

    internalCoreSetup = coreMock.createInternalSetup();
    httpResourcesRegistrar = httpResourcesMock.createRegistrar();
    internalCoreSetup.httpResources.createRegistrar.mockReturnValue(httpResourcesRegistrar);
    coreApp = new CoreApp(coreContext);
  });

  afterEach(() => {
    registerBundleRoutesMock.mockReset();
  });

  describe('`/status` route', () => {
    it('is registered with `authRequired: false` is the status page is anonymous', () => {
      internalCoreSetup.status.isStatusPageAnonymous.mockReturnValue(true);
      coreApp.setup(internalCoreSetup, emptyPlugins());

      expect(httpResourcesRegistrar.register).toHaveBeenCalledWith(
        {
          path: '/status',
          validate: false,
          options: {
            authRequired: false,
          },
        },
        expect.any(Function)
      );
    });

    it('is registered with `authRequired: true` is the status page is not anonymous', () => {
      internalCoreSetup.status.isStatusPageAnonymous.mockReturnValue(false);
      coreApp.setup(internalCoreSetup, emptyPlugins());

      expect(httpResourcesRegistrar.register).toHaveBeenCalledWith(
        {
          path: '/status',
          validate: false,
          options: {
            authRequired: true,
          },
        },
        expect.any(Function)
      );
    });
  });

  describe('#preboot', () => {
    let prebootUIPlugins: UiPlugins;
    beforeEach(() => {
      prebootUIPlugins = emptyPlugins();
      prebootUIPlugins.public.set('some-plugin', {
        type: PluginType.preboot,
        configPath: 'some-plugin',
        id: 'some-plugin',
        optionalPlugins: [],
        requiredBundles: [],
        requiredPlugins: [],
      });
    });
    it('calls `registerBundleRoutes` with the correct options', () => {
      coreApp.preboot(internalCorePreboot, prebootUIPlugins);

      expect(registerBundleRoutesMock).toHaveBeenCalledTimes(1);
      expect(registerBundleRoutesMock).toHaveBeenCalledWith({
        uiPlugins: prebootUIPlugins,
        router: expect.any(Object),
        packageInfo: coreContext.env.packageInfo,
        serverBasePath: internalCorePreboot.http.basePath.serverBasePath,
      });
    });

    it('does not call `registerBundleRoutes` if there are no `preboot` UI plugins', () => {
      coreApp.preboot(internalCorePreboot, emptyPlugins());

      expect(registerBundleRoutesMock).not.toHaveBeenCalled();
    });

    it('main route handles core app rendering', () => {
      coreApp.preboot(internalCorePreboot, prebootUIPlugins);

      expect(prebootHTTPResourcesRegistrar.register).toHaveBeenCalledWith(
        {
          path: '/{path*}',
          validate: expect.any(Object),
        },
        expect.any(Function)
      );

      const [[, handler]] = prebootHTTPResourcesRegistrar.register.mock.calls;
      const mockResponseFactory = httpResourcesMock.createResponseFactory();
      handler(
        {} as unknown as RequestHandlerContext,
        httpServerMock.createKibanaRequest(),
        mockResponseFactory
      );

      expect(mockResponseFactory.renderCoreApp).toHaveBeenCalled();
    });

    it('main route handles unknown public API requests', () => {
      coreApp.preboot(internalCorePreboot, prebootUIPlugins);

      const [[, handler]] = prebootHTTPResourcesRegistrar.register.mock.calls;
      const mockResponseFactory = httpResourcesMock.createResponseFactory();
      handler(
        {} as unknown as RequestHandlerContext,
        httpServerMock.createKibanaRequest({ path: '/api/status' }),
        mockResponseFactory
      );

      expect(mockResponseFactory.renderCoreApp).not.toHaveBeenCalled();
      expect(mockResponseFactory.customError).toHaveBeenCalledWith({
        statusCode: 503,
        headers: { 'Retry-After': '30' },
        body: 'Kibana server is not ready yet',
        bypassErrorFormat: true,
      });
    });

    it('main route handles unknown internal API requests', () => {
      coreApp.preboot(internalCorePreboot, prebootUIPlugins);

      const [[, handler]] = prebootHTTPResourcesRegistrar.register.mock.calls;
      const mockResponseFactory = httpResourcesMock.createResponseFactory();
      handler(
        {} as unknown as RequestHandlerContext,
        httpServerMock.createKibanaRequest({ path: '/internal/security/me' }),
        mockResponseFactory
      );

      expect(mockResponseFactory.renderCoreApp).not.toHaveBeenCalled();
      expect(mockResponseFactory.customError).toHaveBeenCalledWith({
        statusCode: 503,
        headers: { 'Retry-After': '30' },
        body: 'Kibana server is not ready yet',
        bypassErrorFormat: true,
      });
    });
  });

  describe('`/app/{id}/{any*}` route', () => {
    it('is registered with the correct parameters', () => {
      coreApp.setup(internalCoreSetup, emptyPlugins());

      expect(httpResourcesRegistrar.register).toHaveBeenCalledWith(
        {
          path: '/app/{id}/{any*}',
          validate: false,
          options: {
            authRequired: true,
          },
        },
        expect.any(Function)
      );
    });
  });

  it('`setup` calls `registerBundleRoutes` with the correct options', () => {
    const uiPlugins = emptyPlugins();
    coreApp.setup(internalCoreSetup, uiPlugins);

    expect(registerBundleRoutesMock).toHaveBeenCalledTimes(1);
    expect(registerBundleRoutesMock).toHaveBeenCalledWith({
      uiPlugins,
      router: expect.any(Object),
      packageInfo: coreContext.env.packageInfo,
      serverBasePath: internalCoreSetup.http.basePath.serverBasePath,
    });
  });
});
