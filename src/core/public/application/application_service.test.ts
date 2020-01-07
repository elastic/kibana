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

import { createElement } from 'react';
import { BehaviorSubject, Subject } from 'rxjs';
import { bufferCount, skip, take, takeUntil } from 'rxjs/operators';
import { shallow } from 'enzyme';

import { injectedMetadataServiceMock } from '../injected_metadata/injected_metadata_service.mock';
import { contextServiceMock } from '../context/context_service.mock';
import { httpServiceMock } from '../http/http_service.mock';
import { MockCapabilitiesService, MockHistory } from './application_service.test.mocks';
import { MockLifecycle } from './test_types';
import { ApplicationService } from './application_service';
import { AppNavLinkStatus, AppStatus, AppUpdater } from './types';

function mount() {}

describe('#setup()', () => {
  let setupDeps: MockLifecycle<'setup'>;
  let startDeps: MockLifecycle<'start'>;
  let service: ApplicationService;

  beforeEach(() => {
    const http = httpServiceMock.createSetupContract({ basePath: '/test' });
    setupDeps = {
      http,
      context: contextServiceMock.createSetupContract(),
      injectedMetadata: injectedMetadataServiceMock.createSetupContract(),
    };
    setupDeps.injectedMetadata.getLegacyMode.mockReturnValue(false);
    startDeps = { http };
    service = new ApplicationService();
  });

  describe('register', () => {
    it('throws an error if two apps with the same id are registered', () => {
      const { register } = service.setup(setupDeps);

      register(Symbol(), { id: 'app1', mount } as any);
      expect(() =>
        register(Symbol(), { id: 'app1', mount } as any)
      ).toThrowErrorMatchingInlineSnapshot(
        `"An application is already registered with the id \\"app1\\""`
      );
    });

    it('throws error if additional apps are registered after setup', async () => {
      const { register } = service.setup(setupDeps);

      await service.start(startDeps);
      expect(() =>
        register(Symbol(), { id: 'app1', mount } as any)
      ).toThrowErrorMatchingInlineSnapshot(`"Applications cannot be registered after \\"setup\\""`);
    });

    it('allows to register a statusUpdater for the application', async () => {
      const setup = service.setup(setupDeps);

      const pluginId = Symbol('plugin');
      const updater$ = new BehaviorSubject<AppUpdater>(app => ({}));
      setup.register(pluginId, { id: 'app1', mount, updater$ } as any);
      setup.register(pluginId, { id: 'app2', mount } as any);
      const { availableApps$ } = await service.start(startDeps);

      expect(await availableApps$.pipe(take(1)).toPromise()).toMatchInlineSnapshot(`
        Map {
          "app1" => Object {
            "appRoute": "/app/app1",
            "id": "app1",
            "legacy": false,
            "mount": [Function],
            "navLinkStatus": 0,
            "status": 0,
          },
          "app2" => Object {
            "appRoute": "/app/app2",
            "id": "app2",
            "legacy": false,
            "mount": [Function],
            "navLinkStatus": 0,
            "status": 0,
          },
        }
      `);

      updater$.next(app => ({
        status: AppStatus.inaccessible,
        tooltip: 'App inaccessible due to reason',
      }));

      expect(await availableApps$.pipe(take(1)).toPromise()).toMatchInlineSnapshot(`
        Map {
          "app1" => Object {
            "appRoute": "/app/app1",
            "id": "app1",
            "legacy": false,
            "mount": [Function],
            "navLinkStatus": 0,
            "status": 2,
            "tooltip": "App inaccessible due to reason",
          },
          "app2" => Object {
            "appRoute": "/app/app2",
            "id": "app2",
            "legacy": false,
            "mount": [Function],
            "navLinkStatus": 0,
            "status": 0,
          },
        }
      `);
    });

    it('throws an error if an App with the same appRoute is registered', () => {
      const { register, registerLegacyApp } = service.setup(setupDeps);

      register(Symbol(), { id: 'app1', mount } as any);

      expect(() =>
        register(Symbol(), { id: 'app2', mount, appRoute: '/app/app1' } as any)
      ).toThrowErrorMatchingInlineSnapshot(
        `"An application is already registered with the appRoute \\"/app/app1\\""`
      );
      expect(() => registerLegacyApp({ id: 'app1' } as any)).toThrow();

      register(Symbol(), { id: 'app-next', mount, appRoute: '/app/app3' } as any);

      expect(() =>
        register(Symbol(), { id: 'app2', mount, appRoute: '/app/app3' } as any)
      ).toThrowErrorMatchingInlineSnapshot(
        `"An application is already registered with the appRoute \\"/app/app3\\""`
      );
      expect(() => registerLegacyApp({ id: 'app3' } as any)).not.toThrow();
    });

    it('throws an error if an App starts with the HTTP base path', () => {
      const { register } = service.setup(setupDeps);

      expect(() =>
        register(Symbol(), { id: 'app2', mount, appRoute: '/test/app2' } as any)
      ).toThrowErrorMatchingInlineSnapshot(
        `"Cannot register an application route that includes HTTP base path"`
      );
    });
  });

  describe('registerLegacyApp', () => {
    it('throws an error if two apps with the same id are registered', () => {
      const { registerLegacyApp } = service.setup(setupDeps);

      registerLegacyApp({ id: 'app2' } as any);
      expect(() => registerLegacyApp({ id: 'app2' } as any)).toThrowErrorMatchingInlineSnapshot(
        `"An application is already registered with the id \\"app2\\""`
      );
    });

    it('throws error if additional apps are registered after setup', async () => {
      const { registerLegacyApp } = service.setup(setupDeps);

      await service.start(startDeps);
      expect(() => registerLegacyApp({ id: 'app2' } as any)).toThrowErrorMatchingInlineSnapshot(
        `"Applications cannot be registered after \\"setup\\""`
      );
    });

    it('throws an error if a LegacyApp with the same appRoute is registered', () => {
      const { register, registerLegacyApp } = service.setup(setupDeps);

      registerLegacyApp({ id: 'app1' } as any);

      expect(() =>
        register(Symbol(), { id: 'app2', mount, appRoute: '/app/app1' } as any)
      ).toThrowErrorMatchingInlineSnapshot(
        `"An application is already registered with the appRoute \\"/app/app1\\""`
      );
      expect(() => registerLegacyApp({ id: 'app1:other' } as any)).not.toThrow();
    });
  });

  describe('registerAppStatusUpdater', () => {
    it('updates status fields', async () => {
      const setup = service.setup(setupDeps);

      const pluginId = Symbol('plugin');
      setup.register(pluginId, { id: 'app1', mount } as any);
      setup.register(pluginId, { id: 'app2', mount } as any);
      setup.registerAppUpdater(
        new BehaviorSubject<AppUpdater>(app => {
          if (app.id === 'app1') {
            return {
              status: AppStatus.inaccessible,
              navLinkStatus: AppNavLinkStatus.disabled,
              tooltip: 'App inaccessible due to reason',
            };
          }
          return {
            tooltip: 'App accessible',
          };
        })
      );
      const start = await service.start(startDeps);
      expect(await start.availableApps$.pipe(take(1)).toPromise()).toMatchInlineSnapshot(`
        Map {
          "app1" => Object {
            "appRoute": "/app/app1",
            "id": "app1",
            "legacy": false,
            "mount": [Function],
            "navLinkStatus": 2,
            "status": 2,
            "tooltip": "App inaccessible due to reason",
          },
          "app2" => Object {
            "appRoute": "/app/app2",
            "id": "app2",
            "legacy": false,
            "mount": [Function],
            "navLinkStatus": 0,
            "status": 0,
            "tooltip": "App accessible",
          },
        }
      `);
    });

    it(`properly combine with application's updater$`, async () => {
      const setup = service.setup(setupDeps);
      const pluginId = Symbol('plugin');
      const appStatusUpdater$ = new BehaviorSubject<AppUpdater>(app => ({
        status: AppStatus.inaccessible,
        navLinkStatus: AppNavLinkStatus.disabled,
      }));
      setup.register(pluginId, { id: 'app1', updater$: appStatusUpdater$, mount } as any);
      setup.register(pluginId, { id: 'app2', mount } as any);

      setup.registerAppUpdater(
        new BehaviorSubject<AppUpdater>(app => {
          if (app.id === 'app1') {
            return {
              tooltip: 'App inaccessible due to reason',
            };
          }
          return {
            status: AppStatus.inaccessible,
            navLinkStatus: AppNavLinkStatus.hidden,
          };
        })
      );

      const { availableApps$ } = await service.start(startDeps);

      expect(await availableApps$.pipe(take(1)).toPromise()).toMatchInlineSnapshot(`
        Map {
          "app1" => Object {
            "appRoute": "/app/app1",
            "id": "app1",
            "legacy": false,
            "mount": [Function],
            "navLinkStatus": 2,
            "status": 2,
            "tooltip": "App inaccessible due to reason",
          },
          "app2" => Object {
            "appRoute": "/app/app2",
            "id": "app2",
            "legacy": false,
            "mount": [Function],
            "navLinkStatus": 3,
            "status": 2,
          },
        }
      `);
    });

    it('excludes applications that are inaccessible', async () => {
      const setup = service.setup(setupDeps);

      const pluginId = Symbol('plugin');
      setup.register(pluginId, { id: 'app1', mount } as any);
      setup.register(pluginId, { id: 'app2', mount } as any);
      setup.registerAppUpdater(
        new BehaviorSubject<AppUpdater>(app => {
          if (app.id === 'app1') {
            return {
              status: AppStatus.inaccessible,
            };
          }
        })
      );

      const start = await service.start(startDeps);

      expect(await start.availableApps$.pipe(take(1)).toPromise()).toMatchInlineSnapshot(`
        Map {
          "app1" => Object {
            "appRoute": "/app/app1",
            "id": "app1",
            "legacy": false,
            "mount": [Function],
            "navLinkStatus": 0,
            "status": 2,
          },
          "app2" => Object {
            "appRoute": "/app/app2",
            "id": "app2",
            "legacy": false,
            "mount": [Function],
            "navLinkStatus": 0,
            "status": 0,
          },
        }
      `);
    });

    it('applies the most restrictive status in case of multiple updaters', async () => {
      const setup = service.setup(setupDeps);

      const pluginId = Symbol('plugin');
      setup.register(pluginId, { id: 'app1', mount } as any);
      setup.registerAppUpdater(
        new BehaviorSubject<AppUpdater>(app => {
          return {
            status: AppStatus.inaccessible,
            navLinkStatus: AppNavLinkStatus.disabled,
          };
        })
      );
      setup.registerAppUpdater(
        new BehaviorSubject<AppUpdater>(app => {
          return {
            status: AppStatus.accessible,
            navLinkStatus: AppNavLinkStatus.default,
          };
        })
      );

      const start = await service.start(startDeps);

      expect(await start.availableApps$.pipe(take(1)).toPromise()).toMatchInlineSnapshot(`
        Map {
          "app1" => Object {
            "appRoute": "/app/app1",
            "id": "app1",
            "legacy": false,
            "mount": [Function],
            "navLinkStatus": 2,
            "status": 2,
          },
        }
      `);
    });

    it('emits on availableApps$ when a status updater changes', async () => {
      const setup = service.setup(setupDeps);

      const pluginId = Symbol('plugin');
      setup.register(pluginId, { id: 'app1', mount } as any);

      const statusUpdater = new BehaviorSubject<AppUpdater>(app => {
        return {
          status: AppStatus.inaccessible,
          navLinkStatus: AppNavLinkStatus.disabled,
        };
      });
      setup.registerAppUpdater(statusUpdater);

      const start = await service.start(startDeps);
      let latestValue = null;
      start.availableApps$.subscribe(apps => {
        latestValue = apps;
      });
      expect(latestValue).toMatchInlineSnapshot(`
        Map {
          "app1" => Object {
            "appRoute": "/app/app1",
            "id": "app1",
            "legacy": false,
            "mount": [Function],
            "navLinkStatus": 2,
            "status": 2,
          },
        }
      `);

      statusUpdater.next(app => {
        return {
          status: AppStatus.accessible,
        };
      });

      expect(latestValue).toMatchInlineSnapshot(`
        Map {
          "app1" => Object {
            "appRoute": "/app/app1",
            "id": "app1",
            "legacy": false,
            "mount": [Function],
            "navLinkStatus": 0,
            "status": 0,
          },
        }
      `);
    });

    it('also updates legacy apps', async () => {
      const setup = service.setup(setupDeps);

      setup.registerLegacyApp({ id: 'app1', mount } as any);

      setup.registerAppUpdater(
        new BehaviorSubject<AppUpdater>(app => {
          return {
            status: AppStatus.inaccessible,
            navLinkStatus: AppNavLinkStatus.hidden,
            tooltip: 'App inaccessible due to reason',
          };
        })
      );

      const start = await service.start(startDeps);

      expect(await start.availableApps$.pipe(take(1)).toPromise()).toMatchInlineSnapshot(`
        Map {
          "app1" => Object {
            "id": "app1",
            "legacy": true,
            "mount": [Function],
            "navLinkStatus": 3,
            "status": 2,
            "tooltip": "App inaccessible due to reason",
          },
        }
      `);
    });
  });

  it("`registerMountContext` calls context container's registerContext", () => {
    const { registerMountContext } = service.setup(setupDeps);
    const container = setupDeps.context.createContextContainer.mock.results[0].value;
    const pluginId = Symbol();

    registerMountContext(pluginId, 'test' as any, mount as any);
    expect(container.registerContext).toHaveBeenCalledWith(pluginId, 'test', mount);
  });
});

describe('#start()', () => {
  let setupDeps: MockLifecycle<'setup'>;
  let startDeps: MockLifecycle<'start'>;
  let service: ApplicationService;

  beforeEach(() => {
    MockHistory.push.mockReset();
    const http = httpServiceMock.createSetupContract({ basePath: '/test' });
    setupDeps = {
      http,
      context: contextServiceMock.createSetupContract(),
      injectedMetadata: injectedMetadataServiceMock.createSetupContract(),
    };
    setupDeps.injectedMetadata.getLegacyMode.mockReturnValue(false);
    startDeps = { http };
    service = new ApplicationService();
  });

  it('rejects if called prior to #setup()', async () => {
    await expect(service.start(startDeps)).rejects.toThrowErrorMatchingInlineSnapshot(
      `"ApplicationService#setup() must be invoked before start."`
    );
  });

  it('exposes available apps', async () => {
    setupDeps.injectedMetadata.getLegacyMode.mockReturnValue(true);
    const { register, registerLegacyApp } = service.setup(setupDeps);

    register(Symbol(), { id: 'app1', mount } as any);
    registerLegacyApp({ id: 'app2' } as any);

    const { availableApps$ } = await service.start(startDeps);
    const availableApps = await availableApps$.pipe(take(1)).toPromise();

    expect(availableApps).toMatchInlineSnapshot(`
      Map {
        "app1" => Object {
          "appRoute": "/app/app1",
          "id": "app1",
          "legacy": false,
          "mount": [Function],
          "navLinkStatus": 0,
          "status": 0,
        },
        "app2" => Object {
          "id": "app2",
          "legacy": true,
          "navLinkStatus": 0,
          "status": 0,
        },
      }
    `);
  });

  it('passes appIds to capabilities', async () => {
    const { register } = service.setup(setupDeps);

    register(Symbol(), { id: 'app1', mount } as any);
    register(Symbol(), { id: 'app2', mount } as any);
    register(Symbol(), { id: 'app3', mount } as any);
    await service.start(startDeps);

    expect(MockCapabilitiesService.start).toHaveBeenCalledWith({
      appIds: ['app1', 'app2', 'app3'],
      http: setupDeps.http,
    });
  });

  it('filters available applications based on capabilities', async () => {
    MockCapabilitiesService.start.mockResolvedValueOnce({
      capabilities: {
        navLinks: {
          app1: true,
          app2: false,
          legacyApp1: true,
          legacyApp2: false,
        },
      },
    } as any);

    const { register, registerLegacyApp } = service.setup(setupDeps);

    register(Symbol(), { id: 'app1', mount } as any);
    registerLegacyApp({ id: 'legacyApp1' } as any);
    register(Symbol(), { id: 'app2', mount } as any);
    registerLegacyApp({ id: 'legacyApp2' } as any);

    const { availableApps$ } = await service.start(startDeps);
    const availableApps = await availableApps$.pipe(take(1)).toPromise();

    expect(availableApps).toMatchInlineSnapshot(`
      Map {
        "app1" => Object {
          "appRoute": "/app/app1",
          "id": "app1",
          "legacy": false,
          "mount": [Function],
          "navLinkStatus": 0,
          "status": 0,
        },
        "legacyApp1" => Object {
          "id": "legacyApp1",
          "legacy": true,
          "navLinkStatus": 0,
          "status": 0,
        },
      }
    `);
  });

  describe('getComponent', () => {
    it('returns renderable JSX tree', async () => {
      service.setup(setupDeps);

      const { getComponent } = await service.start(startDeps);

      expect(() => shallow(createElement(getComponent))).not.toThrow();
      expect(getComponent()).toMatchInlineSnapshot(`
        <AppRouter
          history={
            Object {
              "push": [MockFunction],
            }
          }
          mounters={Map {}}
        />
      `);
    });

    it('renders null when in legacy mode', async () => {
      setupDeps.injectedMetadata.getLegacyMode.mockReturnValue(true);
      service.setup(setupDeps);

      const { getComponent } = await service.start(startDeps);

      expect(() => shallow(createElement(getComponent))).not.toThrow();
      expect(getComponent()).toBe(null);
    });
  });

  describe('getUrlForApp', () => {
    it('creates URL for unregistered appId', async () => {
      service.setup(setupDeps);

      const { getUrlForApp } = await service.start(startDeps);

      expect(getUrlForApp('app1')).toBe('/app/app1');
    });

    it('creates URL for registered appId', async () => {
      const { register, registerLegacyApp } = service.setup(setupDeps);

      register(Symbol(), { id: 'app1', mount } as any);
      registerLegacyApp({ id: 'legacyApp1' } as any);
      register(Symbol(), { id: 'app2', mount, appRoute: '/custom/path' } as any);

      const { getUrlForApp } = await service.start(startDeps);

      expect(getUrlForApp('app1')).toBe('/app/app1');
      expect(getUrlForApp('legacyApp1')).toBe('/app/legacyApp1');
      expect(getUrlForApp('app2')).toBe('/custom/path');
    });

    it('creates URLs with path parameter', async () => {
      service.setup(setupDeps);

      const { getUrlForApp } = await service.start(startDeps);

      expect(getUrlForApp('app1', { path: 'deep/link' })).toBe('/app/app1/deep/link');
      expect(getUrlForApp('app1', { path: '/deep//link/' })).toBe('/app/app1/deep/link');
      expect(getUrlForApp('app1', { path: '//deep/link//' })).toBe('/app/app1/deep/link');
      expect(getUrlForApp('app1', { path: 'deep/link///' })).toBe('/app/app1/deep/link');
    });
  });

  describe('navigateToApp', () => {
    it('changes the browser history to /app/:appId', async () => {
      service.setup(setupDeps);

      const { navigateToApp } = await service.start(startDeps);

      navigateToApp('myTestApp');
      expect(MockHistory.push).toHaveBeenCalledWith('/app/myTestApp', undefined);

      navigateToApp('myOtherApp');
      expect(MockHistory.push).toHaveBeenCalledWith('/app/myOtherApp', undefined);
    });

    it('changes the browser history for custom appRoutes', async () => {
      const { register } = service.setup(setupDeps);

      register(Symbol(), { id: 'app2', mount, appRoute: '/custom/path' } as any);

      const { navigateToApp } = await service.start(startDeps);

      navigateToApp('myTestApp');
      expect(MockHistory.push).toHaveBeenCalledWith('/app/myTestApp', undefined);

      navigateToApp('app2');
      expect(MockHistory.push).toHaveBeenCalledWith('/custom/path', undefined);
    });

    it('appends a path if specified', async () => {
      const { register } = service.setup(setupDeps);

      register(Symbol(), { id: 'app2', mount, appRoute: '/custom/path' } as any);

      const { navigateToApp } = await service.start(startDeps);

      navigateToApp('myTestApp', { path: 'deep/link/to/location/2' });
      expect(MockHistory.push).toHaveBeenCalledWith(
        '/app/myTestApp/deep/link/to/location/2',
        undefined
      );

      navigateToApp('app2', { path: 'deep/link/to/location/2' });
      expect(MockHistory.push).toHaveBeenCalledWith(
        '/custom/path/deep/link/to/location/2',
        undefined
      );
    });

    it('includes state if specified', async () => {
      const { register } = service.setup(setupDeps);

      register(Symbol(), { id: 'app2', mount, appRoute: '/custom/path' } as any);

      const { navigateToApp } = await service.start(startDeps);

      navigateToApp('myTestApp', { state: 'my-state' });
      expect(MockHistory.push).toHaveBeenCalledWith('/app/myTestApp', 'my-state');

      navigateToApp('app2', { state: 'my-state' });
      expect(MockHistory.push).toHaveBeenCalledWith('/custom/path', 'my-state');
    });

    it('redirects when in legacyMode', async () => {
      setupDeps.redirectTo = jest.fn();
      setupDeps.injectedMetadata.getLegacyMode.mockReturnValue(true);
      service.setup(setupDeps);

      const { navigateToApp } = await service.start(startDeps);

      navigateToApp('myTestApp');
      expect(setupDeps.redirectTo).toHaveBeenCalledWith('/test/app/myTestApp');
    });

    it('updates currentApp$ after mounting', async () => {
      service.setup(setupDeps);

      const { currentAppId$, navigateToApp } = await service.start(startDeps);
      const stop$ = new Subject();
      const promise = currentAppId$.pipe(skip(1), bufferCount(4), takeUntil(stop$)).toPromise();

      await navigateToApp('alpha');
      await navigateToApp('beta');
      await navigateToApp('gamma');
      await navigateToApp('delta');
      stop$.next();

      const appIds = await promise;

      expect(appIds).toMatchInlineSnapshot(`
        Array [
          "alpha",
          "beta",
          "gamma",
          "delta",
        ]
      `);
    });

    it('sets window.location.href when navigating to legacy apps', async () => {
      setupDeps.http = httpServiceMock.createSetupContract({ basePath: '/test' });
      setupDeps.injectedMetadata.getLegacyMode.mockReturnValue(true);
      setupDeps.redirectTo = jest.fn();
      service.setup(setupDeps);

      const { navigateToApp } = await service.start(startDeps);

      await navigateToApp('alpha');
      expect(setupDeps.redirectTo).toHaveBeenCalledWith('/test/app/alpha');
    });

    it('handles legacy apps with subapps', async () => {
      setupDeps.http = httpServiceMock.createSetupContract({ basePath: '/test' });
      setupDeps.injectedMetadata.getLegacyMode.mockReturnValue(true);
      setupDeps.redirectTo = jest.fn();

      const { registerLegacyApp } = service.setup(setupDeps);

      registerLegacyApp({ id: 'baseApp:legacyApp1' } as any);

      const { navigateToApp } = await service.start(startDeps);

      await navigateToApp('baseApp:legacyApp1');
      expect(setupDeps.redirectTo).toHaveBeenCalledWith('/test/app/baseApp');
    });
  });
});
