/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  MockCapabilitiesService,
  MockHistory,
  parseAppUrlMock,
} from './application_service.test.mocks';

import { createElement } from 'react';
import { BehaviorSubject, firstValueFrom, Subject } from 'rxjs';
import { bufferCount, takeUntil } from 'rxjs/operators';
import { mount, shallow } from 'enzyme';

import { httpServiceMock } from '../http/http_service.mock';
import { overlayServiceMock } from '../overlays/overlay_service.mock';
import { themeServiceMock } from '../theme/theme_service.mock';
import { MockLifecycle } from './test_types';
import { ApplicationService } from './application_service';
import { App, AppDeepLink, AppNavLinkStatus, AppStatus, AppUpdater, PublicAppInfo } from './types';
import { act } from 'react-dom/test-utils';

const createApp = (props: Partial<App>): App => {
  return {
    id: 'some-id',
    title: 'some-title',
    mount: () => () => undefined,
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
      redirectTo: jest.fn(),
    };
    startDeps = {
      http,
      overlays: overlayServiceMock.createStartContract(),
      theme: themeServiceMock.createStartContract(),
    };
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

    it('allows to register an AppUpdater for the application', async () => {
      const setup = service.setup(setupDeps);

      const pluginId = Symbol('plugin');
      const updater$ = new BehaviorSubject<AppUpdater>((app) => ({}));
      setup.register(pluginId, createApp({ id: 'app1', updater$ }));
      setup.register(
        pluginId,
        createApp({ id: 'app2', deepLinks: [{ id: 'subapp1', title: 'Subapp', path: '/subapp' }] })
      );
      const { applications$ } = await service.start(startDeps);

      let applications = await firstValueFrom(applications$);
      expect(applications.size).toEqual(2);
      expect(applications.get('app1')).toEqual(
        expect.objectContaining({
          id: 'app1',
          navLinkStatus: AppNavLinkStatus.visible,
          status: AppStatus.accessible,
        })
      );
      expect(applications.get('app2')).toEqual(
        expect.objectContaining({
          id: 'app2',
          navLinkStatus: AppNavLinkStatus.visible,
          status: AppStatus.accessible,
          deepLinks: [
            expect.objectContaining({
              navLinkStatus: AppNavLinkStatus.hidden,
            }),
          ],
        })
      );

      updater$.next((app) => ({
        status: AppStatus.inaccessible,
        tooltip: 'App inaccessible due to reason',
        defaultPath: 'foo/bar',
        deepLinks: [{ id: 'subapp2', title: 'Subapp 2', path: '/subapp2' }],
      }));

      applications = await firstValueFrom(applications$);
      expect(applications.size).toEqual(2);
      expect(applications.get('app1')).toEqual(
        expect.objectContaining({
          id: 'app1',
          navLinkStatus: AppNavLinkStatus.hidden,
          status: AppStatus.inaccessible,
          defaultPath: 'foo/bar',
          tooltip: 'App inaccessible due to reason',
          deepLinks: [
            expect.objectContaining({ id: 'subapp2', title: 'Subapp 2', path: '/subapp2' }),
          ],
        })
      );
      expect(applications.get('app2')).toEqual(
        expect.objectContaining({
          id: 'app2',
          navLinkStatus: AppNavLinkStatus.visible,
          status: AppStatus.accessible,
        })
      );
    });

    it('throws an error if an App with the same appRoute is registered', () => {
      const { register } = service.setup(setupDeps);

      register(Symbol(), createApp({ id: 'app1' }));

      expect(() =>
        register(Symbol(), createApp({ id: 'app2', appRoute: '/app/app1' }))
      ).toThrowErrorMatchingInlineSnapshot(
        `"An application is already registered with the appRoute \\"/app/app1\\""`
      );

      register(Symbol(), createApp({ id: 'app-next', appRoute: '/app/app3' }));

      expect(() =>
        register(Symbol(), createApp({ id: 'app2', appRoute: '/app/app3' }))
      ).toThrowErrorMatchingInlineSnapshot(
        `"An application is already registered with the appRoute \\"/app/app3\\""`
      );
    });

    it('throws an error if an App starts with the HTTP base path', () => {
      const { register } = service.setup(setupDeps);

      expect(() =>
        register(Symbol(), createApp({ id: 'app2', appRoute: '/base-path/app2' }))
      ).toThrowErrorMatchingInlineSnapshot(
        `"Cannot register an application route that includes HTTP base path"`
      );

      expect(() =>
        register(Symbol(), createApp({ id: 'app3', appRoute: '/base-path-i-am-not' }))
      ).not.toThrow();
    });
  });

  describe('registerAppUpdater', () => {
    it('updates status fields', async () => {
      const setup = service.setup(setupDeps);

      const pluginId = Symbol('plugin');
      setup.register(pluginId, createApp({ id: 'app1' }));
      setup.register(pluginId, createApp({ id: 'app2' }));
      setup.registerAppUpdater(
        new BehaviorSubject<AppUpdater>((app) => {
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
      const applications = await firstValueFrom(start.applications$);

      expect(applications.size).toEqual(2);
      expect(applications.get('app1')).toEqual(
        expect.objectContaining({
          id: 'app1',
          navLinkStatus: AppNavLinkStatus.disabled,
          status: AppStatus.inaccessible,
          tooltip: 'App inaccessible due to reason',
        })
      );
      expect(applications.get('app2')).toEqual(
        expect.objectContaining({
          id: 'app2',
          navLinkStatus: AppNavLinkStatus.visible,
          status: AppStatus.accessible,
          tooltip: 'App accessible',
        })
      );
    });

    it(`properly combine with application's updater$`, async () => {
      const setup = service.setup(setupDeps);
      const pluginId = Symbol('plugin');
      const appStatusUpdater$ = new BehaviorSubject<AppUpdater>((app) => ({
        status: AppStatus.inaccessible,
        navLinkStatus: AppNavLinkStatus.disabled,
      }));
      setup.register(pluginId, createApp({ id: 'app1', updater$: appStatusUpdater$ }));
      setup.register(pluginId, createApp({ id: 'app2' }));

      setup.registerAppUpdater(
        new BehaviorSubject<AppUpdater>((app) => {
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
      const applications = await firstValueFrom(applications$);

      expect(applications.size).toEqual(2);
      expect(applications.get('app1')).toEqual(
        expect.objectContaining({
          id: 'app1',
          navLinkStatus: AppNavLinkStatus.disabled,
          status: AppStatus.inaccessible,
          tooltip: 'App inaccessible due to reason',
        })
      );
      expect(applications.get('app2')).toEqual(
        expect.objectContaining({
          id: 'app2',
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
        new BehaviorSubject<AppUpdater>((app) => {
          return {
            status: AppStatus.inaccessible,
            navLinkStatus: AppNavLinkStatus.disabled,
          };
        })
      );
      setup.registerAppUpdater(
        new BehaviorSubject<AppUpdater>((app) => {
          return {
            status: AppStatus.accessible,
            navLinkStatus: AppNavLinkStatus.default,
          };
        })
      );

      const start = await service.start(startDeps);
      const applications = await firstValueFrom(start.applications$);

      expect(applications.size).toEqual(1);
      expect(applications.get('app1')).toEqual(
        expect.objectContaining({
          id: 'app1',
          navLinkStatus: AppNavLinkStatus.disabled,
          status: AppStatus.inaccessible,
        })
      );
    });

    it('emits on applications$ when a status updater changes', async () => {
      const setup = service.setup(setupDeps);

      const pluginId = Symbol('plugin');
      setup.register(pluginId, createApp({ id: 'app1' }));

      const statusUpdater = new BehaviorSubject<AppUpdater>((app) => {
        return {
          status: AppStatus.inaccessible,
          navLinkStatus: AppNavLinkStatus.disabled,
        };
      });
      setup.registerAppUpdater(statusUpdater);

      const start = await service.start(startDeps);
      let latestValue: ReadonlyMap<string, PublicAppInfo> = new Map<string, PublicAppInfo>();
      start.applications$.subscribe((apps) => {
        latestValue = apps;
      });

      expect(latestValue.get('app1')).toEqual(
        expect.objectContaining({
          id: 'app1',
          status: AppStatus.inaccessible,
          navLinkStatus: AppNavLinkStatus.disabled,
        })
      );

      statusUpdater.next((app) => {
        return {
          status: AppStatus.accessible,
          navLinkStatus: AppNavLinkStatus.hidden,
        };
      });

      expect(latestValue.get('app1')).toEqual(
        expect.objectContaining({
          id: 'app1',
          status: AppStatus.accessible,
          navLinkStatus: AppNavLinkStatus.hidden,
        })
      );
    });

    it('allows to update the basePath', async () => {
      const setup = service.setup(setupDeps);

      const pluginId = Symbol('plugin');
      setup.register(pluginId, createApp({ id: 'app1' }));

      const updater = new BehaviorSubject<AppUpdater>((app) => ({}));
      setup.registerAppUpdater(updater);

      const start = await service.start(startDeps);
      await start.navigateToApp('app1');
      expect(MockHistory.push).toHaveBeenCalledWith('/app/app1', undefined);
      MockHistory.push.mockClear();

      updater.next((app) => ({ defaultPath: 'default-path' }));
      await start.navigateToApp('app1');
      expect(MockHistory.push).toHaveBeenCalledWith('/app/app1/default-path', undefined);
      MockHistory.push.mockClear();

      updater.next((app) => ({ defaultPath: 'another-path' }));
      await start.navigateToApp('app1');
      expect(MockHistory.push).toHaveBeenCalledWith('/app/app1/another-path', undefined);
      MockHistory.push.mockClear();

      updater.next((app) => ({}));
      await start.navigateToApp('app1');
      expect(MockHistory.push).toHaveBeenCalledWith('/app/app1', undefined);
      MockHistory.push.mockClear();
    });

    it('preserves the deep links if the update does not modify them', async () => {
      const setup = service.setup(setupDeps);

      const pluginId = Symbol('plugin');
      const updater$ = new BehaviorSubject<AppUpdater>((app) => ({}));

      const deepLinks: AppDeepLink[] = [
        {
          id: 'foo',
          title: 'Foo',
          searchable: true,
          navLinkStatus: AppNavLinkStatus.visible,
          path: '/foo',
        },
        {
          id: 'bar',
          title: 'Bar',
          searchable: false,
          navLinkStatus: AppNavLinkStatus.hidden,
          path: '/bar',
        },
      ];

      setup.register(pluginId, createApp({ id: 'app1', deepLinks, updater$ }));

      const { applications$ } = await service.start(startDeps);

      updater$.next((app) => ({ defaultPath: '/foo' }));

      let appInfos = await firstValueFrom(applications$);

      expect(appInfos.get('app1')!.deepLinks).toEqual([
        {
          deepLinks: [],
          id: 'foo',
          keywords: [],
          navLinkStatus: 1,
          path: '/foo',
          searchable: true,
          title: 'Foo',
        },
        {
          deepLinks: [],
          id: 'bar',
          keywords: [],
          navLinkStatus: 3,
          path: '/bar',
          searchable: false,
          title: 'Bar',
        },
      ]);

      updater$.next((app) => ({
        deepLinks: [
          {
            id: 'bar',
            title: 'Bar',
            searchable: false,
            navLinkStatus: AppNavLinkStatus.hidden,
            path: '/bar',
          },
        ],
      }));

      appInfos = await firstValueFrom(applications$);

      expect(appInfos.get('app1')!.deepLinks).toEqual([
        {
          deepLinks: [],
          id: 'bar',
          keywords: [],
          navLinkStatus: 3,
          path: '/bar',
          searchable: false,
          title: 'Bar',
        },
      ]);
    });
  });
});

describe('#start()', () => {
  beforeEach(() => {
    const http = httpServiceMock.createSetupContract({ basePath: '/base-path' });
    setupDeps = {
      http,
      redirectTo: jest.fn(),
    };
    startDeps = {
      http,
      overlays: overlayServiceMock.createStartContract(),
      theme: themeServiceMock.createStartContract(),
    };
    service = new ApplicationService();
  });

  afterEach(() => {
    MockHistory.push.mockReset();
    MockHistory.replace.mockReset();
    parseAppUrlMock.mockReset();
  });

  it('rejects if called prior to #setup()', async () => {
    await expect(service.start(startDeps)).rejects.toThrowErrorMatchingInlineSnapshot(
      `"ApplicationService#setup() must be invoked before start."`
    );
  });

  it('exposes available apps', async () => {
    const { register } = service.setup(setupDeps);

    register(Symbol(), createApp({ id: 'app1' }));
    register(Symbol(), createApp({ id: 'app2' }));

    const { applications$ } = await service.start(startDeps);
    const availableApps = await firstValueFrom(applications$);

    expect(availableApps.size).toEqual(2);
    expect([...availableApps.keys()]).toEqual(['app1', 'app2']);
    expect(availableApps.get('app1')).toEqual(
      expect.objectContaining({
        appRoute: '/app/app1',
        id: 'app1',
        navLinkStatus: AppNavLinkStatus.visible,
        status: AppStatus.accessible,
      })
    );
    expect(availableApps.get('app2')).toEqual(
      expect.objectContaining({
        appRoute: '/app/app2',
        id: 'app2',
        navLinkStatus: AppNavLinkStatus.visible,
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
        },
      },
    } as any);

    const { register } = service.setup(setupDeps);

    register(Symbol(), createApp({ id: 'app1' }));
    register(Symbol(), createApp({ id: 'app2' }));

    const { applications$ } = await service.start(startDeps);
    const availableApps = await firstValueFrom(applications$);

    expect([...availableApps.keys()]).toEqual(['app1']);
  });

  describe('getComponent', () => {
    it('returns renderable JSX tree', async () => {
      service.setup(setupDeps);

      const { getComponent } = await service.start(startDeps);

      expect(() => shallow(createElement(getComponent))).not.toThrow();
      expect(getComponent()).toMatchSnapshot();
    });
  });

  describe('getUrlForApp', () => {
    it('creates URL for unregistered appId', async () => {
      service.setup(setupDeps);

      const { getUrlForApp } = await service.start(startDeps);

      expect(getUrlForApp('app1')).toBe('/base-path/app/app1');
    });

    it('creates URL for registered appId', async () => {
      const { register } = service.setup(setupDeps);

      register(Symbol(), createApp({ id: 'app1' }));
      register(Symbol(), createApp({ id: 'app2', appRoute: '/custom/path' }));

      const { getUrlForApp } = await service.start(startDeps);

      expect(getUrlForApp('app1')).toBe('/base-path/app/app1');
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

    describe('deepLinkId option', () => {
      it('ignores the deepLinkId parameter if it is unknown', async () => {
        service.setup(setupDeps);

        service.setup(setupDeps);
        const { getUrlForApp } = await service.start(startDeps);

        expect(getUrlForApp('app1', { deepLinkId: 'unkown-deep-link' })).toBe(
          '/base-path/app/app1'
        );
      });

      it('creates URLs with deepLinkId parameter', async () => {
        const { register } = service.setup(setupDeps);

        register(
          Symbol(),
          createApp({
            id: 'app1',
            appRoute: '/custom/app-path',
            deepLinks: [{ id: 'dl1', title: 'deep link 1', path: '/deep-link' }],
          })
        );

        const { getUrlForApp } = await service.start(startDeps);

        expect(getUrlForApp('app1', { deepLinkId: 'dl1' })).toBe(
          '/base-path/custom/app-path/deep-link'
        );
      });

      it('creates URLs with deepLinkId and path parameters', async () => {
        const { register } = service.setup(setupDeps);

        register(
          Symbol(),
          createApp({
            id: 'app1',
            appRoute: '/custom/app-path',
            deepLinks: [{ id: 'dl1', title: 'deep link 1', path: '/deep-link' }],
          })
        );

        const { getUrlForApp } = await service.start(startDeps);
        expect(getUrlForApp('app1', { deepLinkId: 'dl1', path: 'foo/bar' })).toBe(
          '/base-path/custom/app-path/deep-link/foo/bar'
        );
      });
    });

    it('does not append trailing slash if hash is provided in path parameter', async () => {
      service.setup(setupDeps);
      const { getUrlForApp } = await service.start(startDeps);

      expect(getUrlForApp('app1', { path: '#basic-hash' })).toBe('/base-path/app/app1#basic-hash');
      expect(getUrlForApp('app1', { path: '#/hash/router/path' })).toBe(
        '/base-path/app/app1#/hash/router/path'
      );
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

    it('appends a path if specified with hash', async () => {
      const { register } = service.setup(setupDeps);

      register(Symbol(), createApp({ id: 'app2', appRoute: '/custom/path' }));

      const { navigateToApp } = await service.start(startDeps);

      await navigateToApp('myTestApp', { path: '#basic-hash' });
      expect(MockHistory.push).toHaveBeenCalledWith('/app/myTestApp#basic-hash', undefined);

      await navigateToApp('myTestApp', { path: '#/hash/router/path' });
      expect(MockHistory.push).toHaveBeenCalledWith('/app/myTestApp#/hash/router/path', undefined);

      await navigateToApp('app2', { path: '#basic-hash' });
      expect(MockHistory.push).toHaveBeenCalledWith('/custom/path#basic-hash', undefined);

      await navigateToApp('app2', { path: '#/hash/router/path' });
      expect(MockHistory.push).toHaveBeenCalledWith('/custom/path#/hash/router/path', undefined);
    });

    it('preserves trailing slash when path contains a hash', async () => {
      const { register } = service.setup(setupDeps);

      register(Symbol(), createApp({ id: 'app2', appRoute: '/custom/app-path' }));

      const { navigateToApp } = await service.start(startDeps);
      await navigateToApp('app2', { path: '#/' });
      expect(MockHistory.push).toHaveBeenCalledWith('/custom/app-path#/', undefined);
      MockHistory.push.mockClear();

      await navigateToApp('app2', { path: '#/foo/bar/' });
      expect(MockHistory.push).toHaveBeenCalledWith('/custom/app-path#/foo/bar/', undefined);
      MockHistory.push.mockClear();

      await navigateToApp('app2', { path: '/path#/' });
      expect(MockHistory.push).toHaveBeenCalledWith('/custom/app-path/path#/', undefined);
      MockHistory.push.mockClear();

      await navigateToApp('app2', { path: '/path#/hash/' });
      expect(MockHistory.push).toHaveBeenCalledWith('/custom/app-path/path#/hash/', undefined);
      MockHistory.push.mockClear();

      await navigateToApp('app2', { path: '/path/' });
      expect(MockHistory.push).toHaveBeenCalledWith('/custom/app-path/path', undefined);
      MockHistory.push.mockClear();
    });

    it('appends the defaultPath when the path parameter is not specified', async () => {
      const { register } = service.setup(setupDeps);

      register(Symbol(), createApp({ id: 'app1', defaultPath: 'default/path' }));
      register(
        Symbol(),
        createApp({ id: 'app2', appRoute: '/custom-app-path', defaultPath: '/my-base' })
      );

      const { navigateToApp } = await service.start(startDeps);

      await navigateToApp('app1', { path: 'defined-path' });
      expect(MockHistory.push).toHaveBeenCalledWith('/app/app1/defined-path', undefined);

      await navigateToApp('app1', {});
      expect(MockHistory.push).toHaveBeenCalledWith('/app/app1/default/path', undefined);

      await navigateToApp('app2', { path: 'defined-path' });
      expect(MockHistory.push).toHaveBeenCalledWith('/custom-app-path/defined-path', undefined);

      await navigateToApp('app2', {});
      expect(MockHistory.push).toHaveBeenCalledWith('/custom-app-path/my-base', undefined);
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

    it('updates currentApp$ after mounting', async () => {
      service.setup(setupDeps);

      const { currentAppId$, navigateToApp } = await service.start(startDeps);
      const stop$ = new Subject<void>();
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

    it("when openInNewTab is true it doesn't update currentApp$ after mounting", async () => {
      service.setup(setupDeps);

      const { currentAppId$, navigateToApp } = await service.start(startDeps);
      const stop$ = new Subject<void>();
      const promise = currentAppId$.pipe(bufferCount(4), takeUntil(stop$)).toPromise();

      await navigateToApp('delta', { openInNewTab: true });
      stop$.next();

      const appIds = await promise;

      expect(appIds).toBeUndefined();
    });

    it('updates httpLoadingCount$ while mounting', async () => {
      // Use a memory history so that mounting the component will work
      const { createMemoryHistory } = jest.requireActual('history');
      const history = createMemoryHistory();
      setupDeps.history = history;

      const flushPromises = () => new Promise((resolve) => setImmediate(resolve));
      // Create an app and a promise that allows us to control when the app completes mounting
      const createWaitingApp = (props: Partial<App>): [App, () => void] => {
        let finishMount: () => void;
        const mountPromise = new Promise<void>((resolve) => (finishMount = resolve));
        const app = {
          id: 'some-id',
          title: 'some-title',
          mount: async () => {
            await mountPromise;
            return () => undefined;
          },
          ...props,
        };

        return [app, finishMount!];
      };

      // Create some dummy applications
      const { register } = service.setup(setupDeps);
      const [alphaApp, finishAlphaMount] = createWaitingApp({ id: 'alpha' });
      const [betaApp, finishBetaMount] = createWaitingApp({ id: 'beta' });
      register(Symbol(), alphaApp);
      register(Symbol(), betaApp);

      const { navigateToApp, getComponent } = await service.start(startDeps);
      const httpLoadingCount$ = startDeps.http.addLoadingCountSource.mock.calls[0][0];
      const stop$ = new Subject<void>();
      const currentLoadingCount$ = new BehaviorSubject(0);
      httpLoadingCount$.pipe(takeUntil(stop$)).subscribe(currentLoadingCount$);
      const loadingPromise = httpLoadingCount$.pipe(bufferCount(5), takeUntil(stop$)).toPromise();
      mount(getComponent()!);

      await act(() => navigateToApp('alpha'));
      expect(currentLoadingCount$.value).toEqual(1);
      await act(async () => {
        finishAlphaMount();
        await flushPromises();
      });
      expect(currentLoadingCount$.value).toEqual(0);

      await act(() => navigateToApp('beta'));
      expect(currentLoadingCount$.value).toEqual(1);
      await act(async () => {
        finishBetaMount();
        await flushPromises();
      });
      expect(currentLoadingCount$.value).toEqual(0);

      stop$.next();
      const loadingCounts = await loadingPromise;
      expect(loadingCounts).toMatchInlineSnapshot(`
        Array [
          0,
          1,
          0,
          1,
          0,
        ]
      `);
    });

    it('should call private function shouldNavigate with overlays and the nextAppId', async () => {
      service.setup(setupDeps);

      const shouldNavigateSpy = jest.spyOn(service as any, 'shouldNavigate');
      const { navigateToApp } = await service.start(startDeps);
      await navigateToApp('myTestApp');
      expect(shouldNavigateSpy).toHaveBeenCalledWith(startDeps.overlays, 'myTestApp');

      await navigateToApp('myOtherApp');
      expect(shouldNavigateSpy).toHaveBeenCalledWith(startDeps.overlays, 'myOtherApp');
    });

    it('should call private function shouldNavigate with overlays, nextAppId and skipAppLeave', async () => {
      service.setup(setupDeps);
      const shouldNavigateSpy = jest.spyOn(service as any, 'shouldNavigate');
      const { navigateToApp } = await service.start(startDeps);
      await navigateToApp('myTestApp', { skipAppLeave: true });
      expect(shouldNavigateSpy).not.toHaveBeenCalledWith(startDeps.overlays, 'myTestApp');
    });

    describe('when `replace` option is true', () => {
      it('use `history.replace` instead of `history.push`', async () => {
        service.setup(setupDeps);

        const { navigateToApp } = await service.start(startDeps);

        await navigateToApp('myTestApp', { replace: true });
        expect(MockHistory.replace).toHaveBeenCalledWith('/app/myTestApp', undefined);

        await navigateToApp('myOtherApp', { replace: true });
        expect(MockHistory.replace).toHaveBeenCalledWith('/app/myOtherApp', undefined);
      });

      it('includes state if specified', async () => {
        const { register } = service.setup(setupDeps);

        register(Symbol(), createApp({ id: 'app2', appRoute: '/custom/path' }));

        const { navigateToApp } = await service.start(startDeps);

        await navigateToApp('myTestApp', { state: 'my-state', replace: true });
        expect(MockHistory.replace).toHaveBeenCalledWith('/app/myTestApp', 'my-state');

        await navigateToApp('app2', { state: 'my-state', replace: true });
        expect(MockHistory.replace).toHaveBeenCalledWith('/custom/path', 'my-state');
      });
      it('appends a path if specified', async () => {
        const { register } = service.setup(setupDeps);

        register(Symbol(), createApp({ id: 'app2', appRoute: '/custom/path' }));

        const { navigateToApp } = await service.start(startDeps);

        await navigateToApp('myTestApp', { path: 'deep/link/to/location/2', replace: true });
        expect(MockHistory.replace).toHaveBeenCalledWith(
          '/app/myTestApp/deep/link/to/location/2',
          undefined
        );

        await navigateToApp('app2', { path: 'deep/link/to/location/2', replace: true });
        expect(MockHistory.replace).toHaveBeenCalledWith(
          '/custom/path/deep/link/to/location/2',
          undefined
        );
      });
    });

    describe('when `replace` option is false', () => {
      it('behave as when the option is unspecified', async () => {
        service.setup(setupDeps);

        const { navigateToApp } = await service.start(startDeps);

        await navigateToApp('myTestApp', { replace: false });
        expect(MockHistory.push).toHaveBeenCalledWith('/app/myTestApp', undefined);

        await navigateToApp('myOtherApp', { replace: false });
        expect(MockHistory.push).toHaveBeenCalledWith('/app/myOtherApp', undefined);

        expect(MockHistory.replace).not.toHaveBeenCalled();
      });
    });

    describe('deepLinkId option', () => {
      beforeEach(() => {
        MockHistory.push.mockClear();
      });

      it('preserves trailing slash when path contains a hash', async () => {
        const { register } = service.setup(setupDeps);

        register(
          Symbol(),
          createApp({
            id: 'app1',
            appRoute: '/custom/app-path',
            deepLinks: [{ id: 'dl1', title: 'deep link 1', path: '/deep-link' }],
          })
        );

        const { navigateToApp } = await service.start(startDeps);
        await navigateToApp('app1', { deepLinkId: 'dl1', path: '#/' });
        expect(MockHistory.push).toHaveBeenLastCalledWith(
          '/custom/app-path/deep-link#/',
          undefined
        );

        await navigateToApp('app1', { deepLinkId: 'dl1', path: '#/foo/bar/' });
        expect(MockHistory.push).toHaveBeenLastCalledWith(
          '/custom/app-path/deep-link#/foo/bar/',
          undefined
        );

        await navigateToApp('app1', { deepLinkId: 'dl1', path: '/path#/' });
        expect(MockHistory.push).toHaveBeenLastCalledWith(
          '/custom/app-path/deep-link/path#/',
          undefined
        );

        await navigateToApp('app1', { deepLinkId: 'dl1', path: '/path#/hash/' });
        expect(MockHistory.push).toHaveBeenLastCalledWith(
          '/custom/app-path/deep-link/path#/hash/',
          undefined
        );

        await navigateToApp('app1', { deepLinkId: 'dl1', path: '/path/' });
        expect(MockHistory.push).toHaveBeenLastCalledWith(
          '/custom/app-path/deep-link/path',
          undefined
        );
      });

      it('omits the defaultPath when the deepLinkId parameter is specified', async () => {
        const { register } = service.setup(setupDeps);

        register(
          Symbol(),
          createApp({
            id: 'app1',
            defaultPath: 'default/path',
            deepLinks: [{ id: 'dl1', title: 'deep link 1', path: '/deep-link' }],
          })
        );
        register(
          Symbol(),
          createApp({
            id: 'app2',
            appRoute: '/custom-app-path',
            defaultPath: '/my-default',
            deepLinks: [{ id: 'dl2', title: 'deep link 2', path: '/deep-link-2' }],
          })
        );

        const { navigateToApp } = await service.start(startDeps);

        await navigateToApp('app1', {});
        expect(MockHistory.push).toHaveBeenLastCalledWith('/app/app1/default/path', undefined);

        await navigateToApp('app1', { deepLinkId: 'dl1' });
        expect(MockHistory.push).toHaveBeenLastCalledWith('/app/app1/deep-link', undefined);

        await navigateToApp('app1', { deepLinkId: 'dl1', path: 'some-other-path' });
        expect(MockHistory.push).toHaveBeenLastCalledWith(
          '/app/app1/deep-link/some-other-path',
          undefined
        );

        await navigateToApp('app2', {});
        expect(MockHistory.push).toHaveBeenLastCalledWith('/custom-app-path/my-default', undefined);

        await navigateToApp('app2', { deepLinkId: 'dl2' });
        expect(MockHistory.push).toHaveBeenLastCalledWith(
          '/custom-app-path/deep-link-2',
          undefined
        );

        await navigateToApp('app2', { deepLinkId: 'dl2', path: 'some-other-path' });
        expect(MockHistory.push).toHaveBeenLastCalledWith(
          '/custom-app-path/deep-link-2/some-other-path',
          undefined
        );
      });

      it('ignores the deepLinkId parameter if it is unknown', async () => {
        const { register } = service.setup(setupDeps);

        register(
          Symbol(),
          createApp({
            id: 'app1',
            defaultPath: 'default/path',
            deepLinks: [{ id: 'dl1', title: 'deep link 1', path: '/deep-link' }],
          })
        );

        const { navigateToApp } = await service.start(startDeps);

        await navigateToApp('app1', { deepLinkId: 'dl-unknown' });
        expect(MockHistory.push).toHaveBeenLastCalledWith('/app/app1/default/path', undefined);

        await navigateToApp('app1', { deepLinkId: 'dl-unknown', path: 'some-other-path' });
        expect(MockHistory.push).toHaveBeenLastCalledWith('/app/app1/some-other-path', undefined);
      });
    });
  });

  describe('navigateToUrl', () => {
    it('calls `redirectTo` when the url is not parseable', async () => {
      parseAppUrlMock.mockReturnValue(undefined);
      service.setup(setupDeps);
      const { navigateToUrl } = await service.start(startDeps);

      await navigateToUrl('/not-an-app-path');

      expect(MockHistory.push).not.toHaveBeenCalled();
      expect(setupDeps.redirectTo).toHaveBeenCalledWith('/not-an-app-path');
    });

    it('calls `navigateToApp` when the url is an internal app link', async () => {
      parseAppUrlMock.mockReturnValue({ app: 'foo', path: '/some-path' });
      service.setup(setupDeps);
      const { navigateToUrl } = await service.start(startDeps);

      await navigateToUrl('/an-app-path');

      expect(MockHistory.push).toHaveBeenCalledWith('/app/foo/some-path', undefined);
      expect(setupDeps.redirectTo).not.toHaveBeenCalled();
    });

    describe('navigateToUrl with options', () => {
      let addListenerSpy: jest.SpyInstance;
      let removeListenerSpy: jest.SpyInstance;
      beforeEach(() => {
        addListenerSpy = jest.spyOn(window, 'addEventListener');
        removeListenerSpy = jest.spyOn(window, 'removeEventListener');
      });
      afterEach(() => {
        jest.restoreAllMocks();
      });

      it('calls `navigateToApp` with `skipAppLeave` option', async () => {
        parseAppUrlMock.mockReturnValue({ app: 'foo', path: '/some-path' });
        service.setup(setupDeps);
        const { navigateToUrl } = await service.start(startDeps);

        await navigateToUrl('/an-app-path', { skipAppLeave: true });

        expect(MockHistory.push).toHaveBeenCalledWith('/app/foo/some-path', undefined);
        expect(setupDeps.redirectTo).not.toHaveBeenCalled();
      });

      it('calls `redirectTo` when `forceRedirect` option is true', async () => {
        parseAppUrlMock.mockReturnValue({ app: 'foo', path: '/some-path' });
        service.setup(setupDeps);

        const { navigateToUrl } = await service.start(startDeps);

        await navigateToUrl('/an-app-path', { forceRedirect: true });

        expect(addListenerSpy).toHaveBeenCalledTimes(1);
        expect(addListenerSpy).toHaveBeenCalledWith('beforeunload', expect.any(Function));

        expect(setupDeps.redirectTo).toHaveBeenCalledWith('/an-app-path');
        expect(MockHistory.push).not.toHaveBeenCalled();
      });

      it('removes the beforeunload listener and calls `redirectTo` when `forceRedirect` and `skipAppLeave` option are both true', async () => {
        parseAppUrlMock.mockReturnValue({ app: 'foo', path: '/some-path' });
        service.setup(setupDeps);

        const { navigateToUrl } = await service.start(startDeps);

        await navigateToUrl('/an-app-path', { skipAppLeave: true, forceRedirect: true });

        expect(addListenerSpy).toHaveBeenCalledTimes(1);
        expect(addListenerSpy).toHaveBeenCalledWith('beforeunload', expect.any(Function));
        const handler = addListenerSpy.mock.calls[0][1];

        expect(MockHistory.push).toHaveBeenCalledTimes(0);
        expect(setupDeps.redirectTo).toHaveBeenCalledWith('/an-app-path');

        expect(removeListenerSpy).toHaveBeenCalledTimes(1);
        expect(removeListenerSpy).toHaveBeenCalledWith('beforeunload', handler);
      });
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
    };
    startDeps = {
      http,
      overlays: overlayServiceMock.createStartContract(),
      theme: themeServiceMock.createStartContract(),
    };
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
