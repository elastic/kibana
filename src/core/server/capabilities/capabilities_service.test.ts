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

import { httpServiceMock, HttpServiceSetupMock } from '../http/http_service.mock';
import { mockRouter, RouterMock } from '../http/router/router.mock';
import { CapabilitiesService, CapabilitiesSetup } from './capabilities_service';
import { mockCoreContext } from '../core_context.mock';

describe('CapabilitiesService', () => {
  let http: HttpServiceSetupMock;
  let service: CapabilitiesService;
  let setup: CapabilitiesSetup;
  let router: RouterMock;

  beforeEach(() => {
    http = httpServiceMock.createSetupContract();
    router = mockRouter.create();
    http.createRouter.mockReturnValue(router);
    service = new CapabilitiesService(mockCoreContext.create());
  });

  describe('#setup()', () => {
    beforeEach(() => {
      setup = service.setup({ http });
    });

    it('registers the capabilities route', async () => {
      expect(http.createRouter).toHaveBeenCalledWith('/api/core/capabilities');
      expect(router.post).toHaveBeenCalledWith(expect.any(Object), expect.any(Function));
    });

    it('allows to register capabilities providers', async () => {
      setup.registerCapabilitiesProvider(() => ({
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

    it('allows to register capabilities switchers', async () => {
      setup.registerCapabilitiesProvider(() => ({
        catalogue: { a: true, b: true, c: true },
      }));
      setup.registerCapabilitiesSwitcher((req, capabilities) => {
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
  });
});
