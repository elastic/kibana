/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { mockCoreContext } from '@kbn/core-base-server-mocks';
import { mockRouter, RouterMock } from '@kbn/core-http-router-server-mocks';
import {
  httpServiceMock,
  InternalHttpServicePrebootMock,
  InternalHttpServiceSetupMock,
} from '@kbn/core-http-server-mocks';
import type { CapabilitiesSetup } from '@kbn/core-capabilities-server';
import { CapabilitiesService } from './capabilities_service';

describe('CapabilitiesService', () => {
  let http: InternalHttpServiceSetupMock;
  let service: CapabilitiesService;
  let setup: CapabilitiesSetup;
  let router: RouterMock;

  beforeEach(() => {
    http = httpServiceMock.createInternalSetupContract();
    router = mockRouter.create();
    http.createRouter.mockReturnValue(router);
    service = new CapabilitiesService(mockCoreContext.create());
  });

  describe('#preboot()', () => {
    let httpPreboot: InternalHttpServicePrebootMock;
    beforeEach(() => {
      httpPreboot = httpServiceMock.createInternalPrebootContract();
      service.preboot({ http: httpPreboot });
    });

    it('registers the capabilities routes', async () => {
      expect(httpPreboot.registerRoutes).toHaveBeenCalledWith('', expect.any(Function));
      expect(httpPreboot.registerRoutes).toHaveBeenCalledTimes(1);

      const [[, callback]] = httpPreboot.registerRoutes.mock.calls;
      callback(router);

      expect(router.post).toHaveBeenCalledTimes(1);
      expect(router.post).toHaveBeenCalledWith(
        expect.objectContaining({
          path: '/api/core/capabilities',
          options: { authRequired: 'optional' },
        }),
        expect.any(Function)
      );
    });
  });

  describe('#setup()', () => {
    beforeEach(() => {
      setup = service.setup({ http });
    });

    it('registers the capabilities routes', async () => {
      expect(http.createRouter).toHaveBeenCalledWith('');
      expect(router.post).toHaveBeenCalledTimes(1);
      expect(router.post).toHaveBeenCalledWith(expect.any(Object), expect.any(Function));
    });

    it('allows to register a capabilities provider', async () => {
      setup.registerProvider(() => ({
        navLinks: { myLink: true },
        catalogue: { myPlugin: true },
      }));
      const start = service.start();
      expect(await start.resolveCapabilities({} as any)).toMatchInlineSnapshot(`
        Object {
          "catalogue": Object {
            "myPlugin": true,
          },
          "management": Object {},
          "navLinks": Object {
            "myLink": true,
          },
        }
      `);
    });

    it('allows to register multiple capabilities providers', async () => {
      setup.registerProvider(() => ({
        navLinks: { A: true },
        catalogue: { A: true },
      }));
      setup.registerProvider(() => ({
        navLinks: { B: true },
        catalogue: { B: true },
      }));
      setup.registerProvider(() => ({
        navLinks: { C: true },
        customSection: {
          C: true,
        },
      }));
      const start = service.start();
      expect(await start.resolveCapabilities({} as any)).toMatchInlineSnapshot(`
        Object {
          "catalogue": Object {
            "A": true,
            "B": true,
          },
          "customSection": Object {
            "C": true,
          },
          "management": Object {},
          "navLinks": Object {
            "A": true,
            "B": true,
            "C": true,
          },
        }
      `);
    });

    it('allows to register capabilities switchers', async () => {
      setup.registerProvider(() => ({
        catalogue: { a: true, b: true, c: true },
      }));
      setup.registerSwitcher((req, capabilities) => {
        return {
          ...capabilities,
          catalogue: {
            ...capabilities.catalogue,
            b: false,
          },
        };
      });
      const start = service.start();
      expect(await start.resolveCapabilities({} as any)).toMatchInlineSnapshot(`
        Object {
          "catalogue": Object {
            "a": true,
            "b": false,
            "c": true,
          },
          "management": Object {},
          "navLinks": Object {},
        }
      `);
    });

    it('allows to register multiple providers and switchers', async () => {
      setup.registerProvider(() => ({
        navLinks: { a: true },
        catalogue: { a: true },
      }));
      setup.registerProvider(() => ({
        navLinks: { b: true },
        catalogue: { b: true },
      }));
      setup.registerProvider(() => ({
        navLinks: { c: true },
        catalogue: { c: true },
        customSection: {
          c: true,
        },
      }));
      setup.registerSwitcher((req, capabilities) => {
        return {
          catalogue: {
            b: false,
          },
        };
      });

      setup.registerSwitcher((req, capabilities) => {
        return {
          navLinks: { c: false },
        };
      });
      setup.registerSwitcher((req, capabilities) => {
        return {
          customSection: {
            c: false,
          },
        };
      });

      const start = service.start();
      expect(await start.resolveCapabilities({} as any)).toMatchInlineSnapshot(`
        Object {
          "catalogue": Object {
            "a": true,
            "b": false,
            "c": true,
          },
          "customSection": Object {
            "c": false,
          },
          "management": Object {},
          "navLinks": Object {
            "a": true,
            "b": true,
            "c": false,
          },
        }
      `);
    });

    it('allows to indicate that default capabilities should be returned', async () => {
      setup.registerProvider(() => ({ customSection: { isDefault: true } }));
      setup.registerSwitcher((req, capabilities, useDefaultCapabilities) =>
        useDefaultCapabilities ? capabilities : { customSection: { isDefault: false } }
      );

      const start = service.start();
      expect(await start.resolveCapabilities({} as any)).toMatchInlineSnapshot(`
        Object {
          "catalogue": Object {},
          "customSection": Object {
            "isDefault": false,
          },
          "management": Object {},
          "navLinks": Object {},
        }
      `);
      expect(await start.resolveCapabilities({} as any, { useDefaultCapabilities: false }))
        .toMatchInlineSnapshot(`
        Object {
          "catalogue": Object {},
          "customSection": Object {
            "isDefault": false,
          },
          "management": Object {},
          "navLinks": Object {},
        }
      `);
      expect(await start.resolveCapabilities({} as any, { useDefaultCapabilities: true }))
        .toMatchInlineSnapshot(`
        Object {
          "catalogue": Object {},
          "customSection": Object {
            "isDefault": true,
          },
          "management": Object {},
          "navLinks": Object {},
        }
      `);
    });
  });
});
