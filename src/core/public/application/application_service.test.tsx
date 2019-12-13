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

import { shallow } from 'enzyme';
import React from 'react';

import { injectedMetadataServiceMock } from '../injected_metadata/injected_metadata_service.mock';
import { MockCapabilitiesService, MockHistory } from './application_service.test.mocks';
import { ApplicationService } from './application_service';
import { contextServiceMock } from '../context/context_service.mock';
import { httpServiceMock } from '../http/http_service.mock';

describe('#setup()', () => {
  describe('register', () => {
    it('throws an error if two apps with the same id are registered', () => {
      const service = new ApplicationService();
      const context = contextServiceMock.createSetupContract();
      const setup = service.setup({ context });
      setup.register(Symbol(), { id: 'app1', mount: jest.fn() } as any);
      expect(() =>
        setup.register(Symbol(), { id: 'app1', mount: jest.fn() } as any)
      ).toThrowErrorMatchingInlineSnapshot(
        `"An application is already registered with the id \\"app1\\""`
      );
    });

    it('throws error if additional apps are registered after setup', async () => {
      const service = new ApplicationService();
      const context = contextServiceMock.createSetupContract();
      const setup = service.setup({ context });
      const http = httpServiceMock.createStartContract();
      const injectedMetadata = injectedMetadataServiceMock.createStartContract();
      await service.start({ http, injectedMetadata });
      expect(() =>
        setup.register(Symbol(), { id: 'app1' } as any)
      ).toThrowErrorMatchingInlineSnapshot(`"Applications cannot be registered after \\"setup\\""`);
    });

    it('logs a warning when registering a deprecated app mount', async () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn');
      const service = new ApplicationService();
      const context = contextServiceMock.createSetupContract();
      const setup = service.setup({ context });
      setup.register(Symbol(), { id: 'app1', mount: (ctx: any, params: any) => {} } as any);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        `App [app1] is using deprecated mount context. Use core.getStartServices() instead.`
      );
      consoleWarnSpy.mockRestore();
    });
  });

  describe('registerLegacyApp', () => {
    it('throws an error if two apps with the same id are registered', () => {
      const service = new ApplicationService();
      const context = contextServiceMock.createSetupContract();
      const setup = service.setup({ context });
      setup.registerLegacyApp({ id: 'app2' } as any);
      expect(() =>
        setup.registerLegacyApp({ id: 'app2' } as any)
      ).toThrowErrorMatchingInlineSnapshot(
        `"A legacy application is already registered with the id \\"app2\\""`
      );
    });

    it('throws error if additional apps are registered after setup', async () => {
      const service = new ApplicationService();
      const context = contextServiceMock.createSetupContract();
      const setup = service.setup({ context });
      const http = httpServiceMock.createStartContract();
      const injectedMetadata = injectedMetadataServiceMock.createStartContract();
      await service.start({ http, injectedMetadata });
      expect(() =>
        setup.registerLegacyApp({ id: 'app2' } as any)
      ).toThrowErrorMatchingInlineSnapshot(`"Applications cannot be registered after \\"setup\\""`);
    });
  });

  it("`registerMountContext` calls context container's registerContext", () => {
    const service = new ApplicationService();
    const context = contextServiceMock.createSetupContract();
    const setup = service.setup({ context });
    const container = context.createContextContainer.mock.results[0].value;
    const pluginId = Symbol();
    const noop = () => {};
    setup.registerMountContext(pluginId, 'test' as any, noop as any);
    expect(container.registerContext).toHaveBeenCalledWith(pluginId, 'test', noop);
  });
});

describe('#start()', () => {
  beforeEach(() => {
    MockHistory.push.mockReset();
  });

  it('exposes available apps from capabilities', async () => {
    const service = new ApplicationService();
    const context = contextServiceMock.createSetupContract();
    const setup = service.setup({ context });
    setup.register(Symbol(), { id: 'app1', mount: jest.fn() } as any);
    setup.registerLegacyApp({ id: 'app2' } as any);

    const http = httpServiceMock.createStartContract();
    const injectedMetadata = injectedMetadataServiceMock.createStartContract();
    const startContract = await service.start({ http, injectedMetadata });

    expect(startContract.availableApps).toMatchInlineSnapshot(`
      Map {
        "app1" => Object {
          "id": "app1",
          "mount": [MockFunction],
        },
      }
    `);
    expect(startContract.availableLegacyApps).toMatchInlineSnapshot(`
                        Map {
                          "app2" => Object {
                            "id": "app2",
                          },
                        }
                `);
  });

  it('passes registered applications to capabilities', async () => {
    const service = new ApplicationService();
    const context = contextServiceMock.createSetupContract();
    const setup = service.setup({ context });
    const app1 = { id: 'app1', mount: jest.fn() };
    setup.register(Symbol(), app1 as any);

    const http = httpServiceMock.createStartContract();
    const injectedMetadata = injectedMetadataServiceMock.createStartContract();
    await service.start({ http, injectedMetadata });

    expect(MockCapabilitiesService.start).toHaveBeenCalledWith({
      apps: new Map([['app1', app1]]),
      legacyApps: new Map(),
      http,
    });
  });

  it('passes registered legacy applications to capabilities', async () => {
    const service = new ApplicationService();
    const context = contextServiceMock.createSetupContract();
    const setup = service.setup({ context });
    setup.registerLegacyApp({ id: 'legacyApp1' } as any);

    const http = httpServiceMock.createStartContract();
    const injectedMetadata = injectedMetadataServiceMock.createStartContract();
    await service.start({ http, injectedMetadata });

    expect(MockCapabilitiesService.start).toHaveBeenCalledWith({
      apps: new Map(),
      legacyApps: new Map([['legacyApp1', { id: 'legacyApp1' }]]),
      http,
    });
  });

  it('returns renderable JSX tree', async () => {
    const service = new ApplicationService();
    const context = contextServiceMock.createSetupContract();
    service.setup({ context });

    const http = httpServiceMock.createStartContract();
    const injectedMetadata = injectedMetadataServiceMock.createStartContract();
    injectedMetadata.getLegacyMode.mockReturnValue(false);
    const start = await service.start({ http, injectedMetadata });

    expect(() => shallow(React.createElement(() => start.getComponent()))).not.toThrow();
  });

  describe('navigateToApp', () => {
    it('changes the browser history to /app/:appId', async () => {
      const service = new ApplicationService();
      const context = contextServiceMock.createSetupContract();
      service.setup({ context });

      const http = httpServiceMock.createStartContract();
      const injectedMetadata = injectedMetadataServiceMock.createStartContract();
      injectedMetadata.getLegacyMode.mockReturnValue(false);
      const start = await service.start({ http, injectedMetadata });

      start.navigateToApp('myTestApp');
      expect(MockHistory.push).toHaveBeenCalledWith('/app/myTestApp', undefined);
      start.navigateToApp('myOtherApp');
      expect(MockHistory.push).toHaveBeenCalledWith('/app/myOtherApp', undefined);
    });

    it('appends a path if specified', async () => {
      const service = new ApplicationService();
      const context = contextServiceMock.createSetupContract();
      service.setup({ context });

      const http = httpServiceMock.createStartContract();
      const injectedMetadata = injectedMetadataServiceMock.createStartContract();
      injectedMetadata.getLegacyMode.mockReturnValue(false);
      const start = await service.start({ http, injectedMetadata });

      start.navigateToApp('myTestApp', { path: 'deep/link/to/location/2' });
      expect(MockHistory.push).toHaveBeenCalledWith(
        '/app/myTestApp/deep/link/to/location/2',
        undefined
      );
    });

    it('includes state if specified', async () => {
      const service = new ApplicationService();
      const context = contextServiceMock.createSetupContract();
      service.setup({ context });

      const http = httpServiceMock.createStartContract();
      const injectedMetadata = injectedMetadataServiceMock.createStartContract();
      injectedMetadata.getLegacyMode.mockReturnValue(false);
      const start = await service.start({ http, injectedMetadata });

      start.navigateToApp('myTestApp', { state: 'my-state' });
      expect(MockHistory.push).toHaveBeenCalledWith('/app/myTestApp', 'my-state');
    });

    it('redirects when in legacyMode', async () => {
      const service = new ApplicationService();
      const context = contextServiceMock.createSetupContract();
      service.setup({ context });

      const http = httpServiceMock.createStartContract();
      const injectedMetadata = injectedMetadataServiceMock.createStartContract();
      injectedMetadata.getLegacyMode.mockReturnValue(true);
      const redirectTo = jest.fn();
      const start = await service.start({ http, injectedMetadata, redirectTo });
      start.navigateToApp('myTestApp');
      expect(redirectTo).toHaveBeenCalledWith('/app/myTestApp');
    });
  });
});
