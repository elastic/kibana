/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { registerBundleRoutesMock } from './core_app.test.mocks';

import { mockCoreContext } from '../core_context.mock';
import { coreMock } from '../mocks';
import { httpResourcesMock } from '../http_resources/http_resources_service.mock';
import type { UiPlugins } from '../plugins';
import { CoreApp } from './core_app';

const emptyPlugins = (): UiPlugins => ({
  internal: new Map(),
  public: new Map(),
  browserConfigs: new Map(),
});

describe('CoreApp', () => {
  let coreContext: ReturnType<typeof mockCoreContext.create>;
  let coreApp: CoreApp;
  let internalCoreSetup: ReturnType<typeof coreMock.createInternalSetup>;
  let httpResourcesRegistrar: ReturnType<typeof httpResourcesMock.createRegistrar>;

  beforeEach(() => {
    coreContext = mockCoreContext.create();
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

  it('calls `registerBundleRoutes` with the correct options', () => {
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
