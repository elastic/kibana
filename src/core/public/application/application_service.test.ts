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
import { bufferCount, take, takeUntil } from 'rxjs/operators';
import { shallow } from 'enzyme';

import { injectedMetadataServiceMock } from '../injected_metadata/injected_metadata_service.mock';
import { contextServiceMock } from '../context/context_service.mock';
import { httpServiceMock } from '../http/http_service.mock';
import { overlayServiceMock } from '../overlays/overlay_service.mock';
import { MockCapabilitiesService, MockHistory } from './application_service.test.mocks';
import { MockLifecycle } from './test_types';
import { ApplicationService } from './application_service';
import { App, AppNavLinkStatus, AppStatus, AppUpdater, LegacyApp } from './types';

const createApp = (props: Partial<App>): App => {
  return {
    id: 'some-id',
    title: 'some-title',
    mount: () => () => undefined,
    ...props,
  };
};

const createLegacyApp = (props: Partial<LegacyApp>): LegacyApp => {
  return {
    id: 'some-id',
    title: 'some-title',
    appUrl: '/my-url',
    ...props,
  };
};

let setupDeps: MockLifecycle<'setup'>;
let startDeps: MockLifecycle<'start'>;
let service: ApplicationService;

describe('#setup()', () => {
  beforeEach(() => {
    const http = httpServiceMock.createSetupContract({ basePath: '/base-path' });
    setupDeps = {
      http,
      context: contextServiceMock.createSetupContract(),
      injectedMetadata: injectedMetadataServiceMock.createSetupContract(),
    };
    setupDeps.injectedMetadata.getLegacyMode.mockReturnValue(false);
    startDeps = { http, overlays: overlayServiceMock.createStartContract() };
    service = new ApplicationService();
  });

  describe('register', () => {
    it('throws an error if two apps with the same id are registered', () => {
      const { register } = service.setup(setupDeps);

      register(Symbol(), createApp({ id: 'app1' }));
      expect(() =>
        register(Symbol(), createApp({ id: 'app1' }))
      ).toThrowErrorMatchingInlineSnapshot(
        `"An application is already registered with the id \\"app1\\""`
      );
    });

    it('throws error if additional apps are registered after setup', async () => {
      const { register } = service.setup(setupDeps);

      await service.start(startDeps);
      expect(() =>
        register(Symbol(), createApp({ id: 'app1' }))
      ).toThrowErrorMatchingInlineSnapshot(`"Applications cannot be registered after \\"setup\\""`);
    });

    it('allows to register a statusUpdater for the application', async () => {
      const setup = service.setup(setupDeps);

      const pluginId = Symbol('plugin');
      const updater$ = new BehaviorSubject<AppUpdater>(app => ({}));
      setup.register(pluginId, createApp({ id: 'app1', updater$ }));
      setup.register(pluginId, createApp({ id: 'app2' }));
      const { applications$ } = await service.start(startDeps);

      let applications = await applications$.pipe(take(1)).toPromise();
      expect(applications.size).toEqual(2);
      expect(applications.get('app1')).toEqual(
        expect.objectContaining({
          id: 'app1',
          legacy: false,
          navLinkStatus: AppNavLinkStatus.default,
          status: AppStatus.accessible,
        })
      );
      expect(applications.get('app2')).toEqual(
        expect.objectContaining({
          id: 'app2',
          legacy: false,
          navLinkStatus: AppNavLinkStatus.default,
          status: AppStatus.accessible,
        })
      );

      updater$.next(app => ({
        status: AppStatus.inaccessible,
        tooltip: 'App inaccessible due to reason',
      }));

      applications = await applications$.pipe(take(1)).toPromise();
      expect(applications.size).toEqual(2);
      expect(applications.get('app1')).toEqual(
        expect.objectContaining({
          id: 'app1',
          legacy: false,
          navLinkStatus: AppNavLinkStatus.default,
          status: AppStatus.inaccessible,
          tooltip: 'App inaccessible due to reason',
        })
      );
      expect(applications.get('app2')).toEqual(
        expect.objectContaining({
          id: 'app2',
          legacy: false,
          navLinkStatus: AppNavLinkStatus.default,
          status: AppStatus.accessible,
        })
      );
    });

    it('throws an error if an App with the same appRoute is registered', () => {
      const { register, registerLegacyApp } = service.setup(setupDeps);

      register(Symbol(), createApp({ id: 'app1' }));

      expect(() =>
        register(Symbol(), createApp({ id: 'app2', appRoute: '/app/app1' }))
      ).toThrowErrorMatchingInlineSnapshot(
        `"An application is already registered with the appRoute \\"/app/app1\\""`
      );
      expect(() => registerLegacyApp(createLegacyApp({ id: 'app1' }))).toThrow();

      register(Symbol(), createApp({ id: 'app-next', appRoute: '/app/app3' }));

      expect(() =>
        register(Symbol(), createApp({ id: 'app2', appRoute: '/app/app3' }))
      ).toThrowErrorMatchingInlineSnapshot(
        `"An application is already registered with the appRoute \\"/app/app3\\""`
      );
      expect(() => registerLegacyApp(createLegacyApp({ id: 'app3' }))).not.toThrow();
    });

    it('throws an error if an App starts with the HTTP base path', () => {
      const { register } = service.setup(setupDeps);

      expect(() =>
        register(Symbol(), createApp({ id: 'app2', appRoute: '/base-path/app2' }))
      ).toThrowErrorMatchingInlineSnapshot(
        `"Cannot register an application route that includes HTTP base path"`
      );
    });
  });

  describe('registerLegacyApp', () => {
    it('throws an error if two apps with the same id are registered', () => {
      const { registerLegacyApp } = service.setup(setupDeps);

      registerLegacyApp(createLegacyApp({ id: 'app2' }));
      expect(() =>
        registerLegacyApp(createLegacyApp({ id: 'app2' }))
      ).toThrowErrorMatchingInlineSnapshot(
        `"An application is already registered with the id \\"app2\\""`
      );
    });

    it('throws error if additional apps are registered after setup', async () => {
      const { registerLegacyApp } = service.setup(setupDeps);

      await service.start(startDeps);
      expect(() =>
        registerLegacyApp(createLegacyApp({ id: 'app2' }))
      ).toThrowErrorMatchingInlineSnapshot(`"Applications cannot be registered after \\"setup\\""`);
    });

    it('throws an error if a LegacyApp with the same appRoute is registered', () => {
      const { register, registerLegacyApp } = service.setup(setupDeps);

      registerLegacyApp(createLegacyApp({ id: 'app1' }));

      expect(() =>
        register(Symbol(), createApp({ id: 'app2', appRoute: '/app/app1' }))
      ).toThrowErrorMatchingInlineSnapshot(
        `"An application is already registered with the appRoute \\"/app/app1\\""`
      );
      expect(() => registerLegacyApp(createLegacyApp({ id: 'app1:other' }))).not.toThrow();
    });
  });

  describe('registerAppStatusUpdater', () => {
    it('updates status fields', async () => {
      const setup = service.setup(setupDeps);

      const pluginId = Symbol('plugin');
      setup.register(pluginId, createApp({ id: 'app1' }));
      setup.register(pluginId, createApp({ id: 'app2' }));
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
      const applications = await start.applications$.pipe(take(1)).toPromise();

      expect(applications.size).toEqual(2);
      expect(applications.get('app1')).toEqual(
        expect.objectContaining({
          id: 'app1',
          legacy: false,
          navLinkStatus: AppNavLinkStatus.disabled,
          status: AppStatus.inaccessible,
          tooltip: 'App inaccessible due to reason',
        })
      );
      expect(applications.get('app2')).toEqual(
        expect.objectContaining({
          id: 'app2',
          legacy: false,
          navLinkStatus: AppNavLinkStatus.default,
          status: AppStatus.accessible,
          tooltip: 'App accessible',
        })
      );
    });

    it(`properly combine with application's updater$`, async () => {
      const setup = service.setup(setupDeps);
      const pluginId = Symbol('plugin');
      const appStatusUpdater$ = new BehaviorSubject<AppUpdater>(app => ({
        status: AppStatus.inaccessible,
        navLinkStatus: AppNavLinkStatus.disabled,
      }));
      setup.register(pluginId, createApp({ id: 'app1', updater$: appStatusUpdater$ }));
      setup.register(pluginId, createApp({ id: 'app2' }));

      setup.registerAppUpdater(
        new BehaviorSubject<AppUpdater>(app => {
          if (app.id === 'app1') {
            return {
              status: AppStatus.accessible,
              tooltip: 'App inaccessible due to reason',
            };
          }
          return {
            status: AppStatus.inaccessible,
            navLinkStatus: AppNavLinkStatus.hidden,
          };
        })
      );

      const { applications$ } = await service.start(startDeps);
      const applications = await applications$.pipe(take(1)).toPromise();

      expect(applications.size).toEqual(2);
      expect(applications.get('app1')).toEqual(
        expect.objectContaining({
          id: 'app1',
          legacy: false,
          navLinkStatus: AppNavLinkStatus.disabled,
          status: AppStatus.inaccessible,
          tooltip: 'App inaccessible due to reason',
        })
      );
      expect(applications.get('app2')).toEqual(
        expect.objectContaining({
          id: 'app2',
          legacy: false,
          status: AppStatus.inaccessible,
          navLinkStatus: AppNavLinkStatus.hidden,
        })
      );
    });

    it('applies the most restrictive status in case of multiple updaters', async () => {
      const setup = service.setup(setupDeps);

      const pluginId = Symbol('plugin');
      setup.register(pluginId, createApp({ id: 'app1' }));
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
      const applications = await start.applications$.pipe(take(1)).toPromise();

      expect(applications.size).toEqual(1);
      expect(applications.get('app1')).toEqual(
        expect.objectContaining({
          id: 'app1',
          legacy: false,
          navLinkStatus: AppNavLinkStatus.disabled,
          status: AppStatus.inaccessible,
        })
      );
    });

    it('emits on applications$ when a status updater changes', async () => {
      const setup = service.setup(setupDeps);

      const pluginId = Symbol('plugin');
      setup.register(pluginId, createApp({ id: 'app1' }));

      const statusUpdater = new BehaviorSubject<AppUpdater>(app => {
        return {
          status: AppStatus.inaccessible,
          navLinkStatus: AppNavLinkStatus.disabled,
        };
      });
      setup.registerAppUpdater(statusUpdater);

      const start = await service.start(startDeps);
      let latestValue: ReadonlyMap<string, App | LegacyApp> = new Map<string, App | LegacyApp>();
      start.applications$.subscribe(apps => {
        latestValue = apps;
      });

      expect(latestValue.get('app1')).toEqual(
        expect.objectContaining({
          id: 'app1',
          legacy: false,
          status: AppStatus.inaccessible,
          navLinkStatus: AppNavLinkStatus.disabled,
        })
      );

      statusUpdater.next(app => {
        return {
          status: AppStatus.accessible,
          navLinkStatus: AppNavLinkStatus.hidden,
        };
      });

      expect(latestValue.get('app1')).toEqual(
        expect.objectContaining({
          id: 'app1',
          legacy: false,
          status: AppStatus.accessible,
          navLinkStatus: AppNavLinkStatus.hidden,
        })
      );
    });

    it('also updates legacy apps', async () => {
      const setup = service.setup(setupDeps);

      setup.registerLegacyApp(createLegacyApp({ id: 'app1' }));

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
      const applications = await start.applications$.pipe(take(1)).toPromise();

      expect(applications.size).toEqual(1);
      expect(applications.get('app1')).toEqual(
        expect.objectContaining({
          id: 'app1',
          legacy: true,
          status: AppStatus.inaccessible,
          navLinkStatus: AppNavLinkStatus.hidden,
          tooltip: 'App inaccessible due to reason',
        })
      );
    });
  });

  it("`registerMountContext` calls context container's registerContext", () => {
    const { registerMountContext } = service.setup(setupDeps);
    const container = setupDeps.context.createContextContainer.mock.results[0].value;
    const pluginId = Symbol();

    const mount = () => () => undefined;
    registerMountContext(pluginId, 'test' as any, mount);
    expect(container.registerContext).toHaveBeenCalledWith(pluginId, 'test', mount);
  });
});

describe('#start()', () => {
  beforeEach(() => {
    MockHistory.push.mockReset();

    const http = httpServiceMock.createSetupContract({ basePath: '/base-path' });
    setupDeps = {
      http,
      context: contextServiceMock.createSetupContract(),
      injectedMetadata: injectedMetadataServiceMock.createSetupContract(),
    };
    setupDeps.injectedMetadata.getLegacyMode.mockReturnValue(false);
    startDeps = { http, overlays: overlayServiceMock.createStartContract() };
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

    register(Symbol(), createApp({ id: 'app1' }));
    registerLegacyApp(createLegacyApp({ id: 'app2' }));

    const { applications$ } = await service.start(startDeps);
    const availableApps = await applications$.pipe(take(1)).toPromise();

    expect(availableApps.size).toEqual(2);
    expect([...availableApps.keys()]).toEqual(['app1', 'app2']);
    expect(availableApps.get('app1')).toEqual(
      expect.objectContaining({
        appRoute: '/app/app1',
        id: 'app1',
        legacy: false,
        navLinkStatus: AppNavLinkStatus.default,
        status: AppStatus.accessible,
      })
    );
    expect(availableApps.get('app2')).toEqual(
      expect.objectContaining({
        appUrl: '/my-url',
        id: 'app2',
        legacy: true,
        navLinkStatus: AppNavLinkStatus.default,
        status: AppStatus.accessible,
      })
    );
  });

  it('passes appIds to capabilities', async () => {
    const { register } = service.setup(setupDeps);

    register(Symbol(), createApp({ id: 'app1' }));
    register(Symbol(), createApp({ id: 'app2' }));
    register(Symbol(), createApp({ id: 'app3' }));
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

    register(Symbol(), createApp({ id: 'app1' }));
    registerLegacyApp(createLegacyApp({ id: 'legacyApp1' }));
    register(Symbol(), createApp({ id: 'app2' }));
    registerLegacyApp(createLegacyApp({ id: 'legacyApp2' }));

    const { applications$ } = await service.start(startDeps);
    const availableApps = await applications$.pipe(take(1)).toPromise();

    expect([...availableApps.keys()]).toEqual(['app1', 'legacyApp1']);
  });

  describe('currentAppId$', () => {
    it('emits the legacy app id when in legacy mode', async () => {
      setupDeps.injectedMetadata.getLegacyMode.mockReturnValue(true);
      setupDeps.injectedMetadata.getLegacyMetadata.mockReturnValue({
        app: {
          id: 'legacy',
          title: 'Legacy App',
        },
      } as any);
      await service.setup(setupDeps);
      const { currentAppId$ } = await service.start(startDeps);

      expect(await currentAppId$.pipe(take(1)).toPromise()).toEqual('legacy');
    });
  });

  describe('getComponent', () => {
    it('returns renderable JSX tree', async () => {
      service.setup(setupDeps);

      const { getComponent } = await service.start(startDeps);

      expect(() => shallow(createElement(getComponent))).not.toThrow();
      expect(getComponent()).toMatchSnapshot();
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

      expect(getUrlForApp('app1')).toBe('/base-path/app/app1');
    });

    it('creates URL for registered appId', async () => {
      const { register, registerLegacyApp } = service.setup(setupDeps);

      register(Symbol(), createApp({ id: 'app1' }));
      registerLegacyApp(createLegacyApp({ id: 'legacyApp1' }));
      register(Symbol(), createApp({ id: 'app2', appRoute: '/custom/path' }));

      const { getUrlForApp } = await service.start(startDeps);

      expect(getUrlForApp('app1')).toBe('/base-path/app/app1');
      expect(getUrlForApp('legacyApp1')).toBe('/base-path/app/legacyApp1');
      expect(getUrlForApp('app2')).toBe('/base-path/custom/path');
    });

    it('creates URLs with path parameter', async () => {
      service.setup(setupDeps);
      const { getUrlForApp } = await service.start(startDeps);

      expect(getUrlForApp('app1', { path: 'deep/link' })).toBe('/base-path/app/app1/deep/link');
      expect(getUrlForApp('app1', { path: '/deep//link/' })).toBe('/base-path/app/app1/deep/link');
      expect(getUrlForApp('app1', { path: '//deep/link//' })).toBe('/base-path/app/app1/deep/link');
      expect(getUrlForApp('app1', { path: 'deep/link///' })).toBe('/base-path/app/app1/deep/link');
    });

    it('creates absolute URLs when `absolute` parameter is true', async () => {
      service.setup(setupDeps);
      const { getUrlForApp } = await service.start(startDeps);

      expect(getUrlForApp('app1', { absolute: true })).toBe('http://localhost/base-path/app/app1');
      expect(getUrlForApp('app2', { path: 'deep/link', absolute: true })).toBe(
        'http://localhost/base-path/app/app2/deep/link'
      );
    });
  });

  describe('navigateToApp', () => {
    it('changes the browser history to /app/:appId', async () => {
      service.setup(setupDeps);

      const { navigateToApp } = await service.start(startDeps);

      await navigateToApp('myTestApp');
      expect(MockHistory.push).toHaveBeenCalledWith('/app/myTestApp', undefined);

      await navigateToApp('myOtherApp');
      expect(MockHistory.push).toHaveBeenCalledWith('/app/myOtherApp', undefined);
    });

    it('changes the browser history for custom appRoutes', async () => {
      const { register } = service.setup(setupDeps);

      register(Symbol(), createApp({ id: 'app2', appRoute: '/custom/path' }));

      const { navigateToApp } = await service.start(startDeps);

      await navigateToApp('myTestApp');
      expect(MockHistory.push).toHaveBeenCalledWith('/app/myTestApp', undefined);

      await navigateToApp('app2');
      expect(MockHistory.push).toHaveBeenCalledWith('/custom/path', undefined);
    });

    it('appends a path if specified', async () => {
      const { register } = service.setup(setupDeps);

      register(Symbol(), createApp({ id: 'app2', appRoute: '/custom/path' }));

      const { navigateToApp } = await service.start(startDeps);

      await navigateToApp('myTestApp', { path: 'deep/link/to/location/2' });
      expect(MockHistory.push).toHaveBeenCalledWith(
        '/app/myTestApp/deep/link/to/location/2',
        undefined
      );

      await navigateToApp('app2', { path: 'deep/link/to/location/2' });
      expect(MockHistory.push).toHaveBeenCalledWith(
        '/custom/path/deep/link/to/location/2',
        undefined
      );
    });

    it('includes state if specified', async () => {
      const { register } = service.setup(setupDeps);

      register(Symbol(), createApp({ id: 'app2', appRoute: '/custom/path' }));

      const { navigateToApp } = await service.start(startDeps);

      await navigateToApp('myTestApp', { state: 'my-state' });
      expect(MockHistory.push).toHaveBeenCalledWith('/app/myTestApp', 'my-state');

      await navigateToApp('app2', { state: 'my-state' });
      expect(MockHistory.push).toHaveBeenCalledWith('/custom/path', 'my-state');
    });

    it('redirects when in legacyMode', async () => {
      setupDeps.redirectTo = jest.fn();
      setupDeps.injectedMetadata.getLegacyMode.mockReturnValue(true);
      service.setup(setupDeps);

      const { navigateToApp } = await service.start(startDeps);

      await navigateToApp('myTestApp');
      expect(setupDeps.redirectTo).toHaveBeenCalledWith('/base-path/app/myTestApp');
    });

    it('updates currentApp$ after mounting', async () => {
      service.setup(setupDeps);

      const { currentAppId$, navigateToApp } = await service.start(startDeps);
      const stop$ = new Subject();
      const promise = currentAppId$.pipe(bufferCount(4), takeUntil(stop$)).toPromise();

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

      registerLegacyApp(createLegacyApp({ id: 'baseApp:legacyApp1' }));

      const { navigateToApp } = await service.start(startDeps);

      await navigateToApp('baseApp:legacyApp1');
      expect(setupDeps.redirectTo).toHaveBeenCalledWith('/test/app/baseApp');
    });
  });
});

describe('#stop()', () => {
  let addListenerSpy: jest.SpyInstance;
  let removeListenerSpy: jest.SpyInstance;

  beforeEach(() => {
    addListenerSpy = jest.spyOn(window, 'addEventListener');
    removeListenerSpy = jest.spyOn(window, 'removeEventListener');

    MockHistory.push.mockReset();
    const http = httpServiceMock.createSetupContract({ basePath: '/test' });
    setupDeps = {
      http,
      context: contextServiceMock.createSetupContract(),
      injectedMetadata: injectedMetadataServiceMock.createSetupContract(),
    };
    setupDeps.injectedMetadata.getLegacyMode.mockReturnValue(false);
    startDeps = { http, overlays: overlayServiceMock.createStartContract() };
    service = new ApplicationService();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('removes the beforeunload listener', async () => {
    service.setup(setupDeps);
    await service.start(startDeps);
    expect(addListenerSpy).toHaveBeenCalledTimes(1);
    expect(addListenerSpy).toHaveBeenCalledWith('beforeunload', expect.any(Function));
    const handler = addListenerSpy.mock.calls[0][1];
    service.stop();
    expect(removeListenerSpy).toHaveBeenCalledTimes(1);
    expect(removeListenerSpy).toHaveBeenCalledWith('beforeunload', handler);
  });
});
