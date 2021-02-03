/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { mockCoreContext } from '../core_context.mock';
import { coreMock } from '../mocks';
import { httpResourcesMock } from '../http_resources/http_resources_service.mock';
import { CoreApp } from './core_app';

describe('CoreApp', () => {
  let coreApp: CoreApp;
  let internalCoreSetup: ReturnType<typeof coreMock.createInternalSetup>;
  let httpResourcesRegistrar: ReturnType<typeof httpResourcesMock.createRegistrar>;

  beforeEach(() => {
    const coreContext = mockCoreContext.create();
    internalCoreSetup = coreMock.createInternalSetup();
    httpResourcesRegistrar = httpResourcesMock.createRegistrar();
    internalCoreSetup.httpResources.createRegistrar.mockReturnValue(httpResourcesRegistrar);
    coreApp = new CoreApp(coreContext);
  });

  describe('`/status` route', () => {
    it('is registered with `authRequired: false` is the status page is anonymous', () => {
      internalCoreSetup.status.isStatusPageAnonymous.mockReturnValue(true);
      coreApp.setup(internalCoreSetup);

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
      coreApp.setup(internalCoreSetup);

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
});
