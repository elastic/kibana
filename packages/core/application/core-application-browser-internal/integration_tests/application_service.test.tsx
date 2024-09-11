/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { BehaviorSubject, type Observable, take } from 'rxjs';
import { act } from 'react-dom/test-utils';
import { createMemoryHistory, MemoryHistory } from 'history';

import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { analyticsServiceMock } from '@kbn/core-analytics-browser-mocks';
import { themeServiceMock } from '@kbn/core-theme-browser-mocks';
import type { AppMountParameters, AppUpdater } from '@kbn/core-application-browser';
import { overlayServiceMock } from '@kbn/core-overlays-browser-mocks';
import { customBrandingServiceMock } from '@kbn/core-custom-branding-browser-mocks';
import type { MountPoint } from '@kbn/core-mount-utils-browser';
import type { MockLifecycle } from '../src/test_helpers/test_types';
import { ApplicationService } from '../src/application_service';
import { createRenderer } from './utils';

const flushPromises = () => new Promise((resolve) => setImmediate(resolve));

describe('ApplicationService', () => {
  let setupDeps: MockLifecycle<'setup'>;
  let startDeps: MockLifecycle<'start'>;
  let service: ApplicationService;
  let history: MemoryHistory<any>;
  let update: ReturnType<typeof createRenderer>;

  const navigate = (path: string) => {
    history.push(path);
    return update();
  };

  beforeEach(() => {
    history = createMemoryHistory();
    const http = httpServiceMock.createSetupContract({ basePath: '/test' });
    const analytics = analyticsServiceMock.createAnalyticsServiceSetup();

    http.post.mockResolvedValue({ navLinks: {} });

    setupDeps = {
      http,
      analytics,
      history: history as any,
    };
    startDeps = {
      http,
      overlays: overlayServiceMock.createStartContract(),
      theme: themeServiceMock.createStartContract(),
      customBranding: customBrandingServiceMock.createStartContract(),
      analytics: analyticsServiceMock.createAnalyticsServiceStart(),
    };
    service = new ApplicationService();
  });

  describe('navigating to apps', () => {
    describe('using history.push', () => {
      it('emits currentAppId$ before mounting the app', async () => {
        const { register } = service.setup(setupDeps);

        let resolveMount: () => void;
        const promise = new Promise<void>((resolve) => {
          resolveMount = resolve;
        });

        register(Symbol(), {
          id: 'app1',
          title: 'App1',
          mount: async ({}: AppMountParameters) => {
            await promise;
            return () => undefined;
          },
        });

        const { currentAppId$, getComponent } = await service.start(startDeps);
        update = createRenderer(getComponent());

        await navigate('/app/app1');

        expect(await currentAppId$.pipe(take(1)).toPromise()).toEqual('app1');

        await act(async () => {
          resolveMount!();
          await flushPromises();
        });

        expect(await currentAppId$.pipe(take(1)).toPromise()).toEqual('app1');
      });

      it('updates the page_url analytics context', async () => {
        const { register } = service.setup(setupDeps);

        const context$ = setupDeps.analytics.registerContextProvider.mock.calls[0][0]
          .context$ as Observable<{
          page_url: string;
        }>;
        const locations: string[] = [];
        context$.subscribe((context) => locations.push(context.page_url));

        register(Symbol(), {
          id: 'app1',
          title: 'App1',
          mount: async () => () => undefined,
        });
        register(Symbol(), {
          id: 'app2',
          title: 'App2',
          mount: async () => () => undefined,
        });

        const { getComponent } = await service.start(startDeps);
        update = createRenderer(getComponent());

        await navigate('/app/app1/bar?hello=dolly');
        await flushPromises();
        await navigate('/app/app2#/foo');
        await flushPromises();
        await navigate('/app/app2#/another-path');
        await flushPromises();

        expect(locations).toEqual([
          '/',
          '/app/app1/bar',
          '/app/app2#/foo',
          '/app/app2#/another-path',
        ]);
      });
    });

    describe('using navigateToApp', () => {
      it('emits currentAppId$ once before mounting the app', async () => {
        const { register } = service.setup(setupDeps);

        let resolveMount: () => void;
        const promise = new Promise<void>((resolve) => {
          resolveMount = resolve;
        });

        register(Symbol(), {
          id: 'app1',
          title: 'App1',
          mount: async ({}: AppMountParameters) => {
            await promise;
            return () => undefined;
          },
        });

        const { navigateToApp, currentAppId$, getComponent } = await service.start(startDeps);
        update = createRenderer(getComponent());

        const currentAppIds: Array<string | undefined> = [];
        currentAppId$.subscribe((currentAppId) => {
          currentAppIds.push(currentAppId);
        });

        await act(async () => {
          await navigateToApp('app1');
          await update();
        });

        expect(currentAppIds).toEqual(['app1']);

        resolveMount!();

        expect(currentAppIds).toEqual(['app1']);
      });

      it('updates the page_url analytics context', async () => {
        const { register } = service.setup(setupDeps);

        const context$ = setupDeps.analytics.registerContextProvider.mock.calls[0][0]
          .context$ as Observable<{
          page_url: string;
        }>;
        const locations: string[] = [];
        context$.subscribe((context) => locations.push(context.page_url));

        register(Symbol(), {
          id: 'app1',
          title: 'App1',
          mount: async () => () => undefined,
        });
        register(Symbol(), {
          id: 'app2',
          title: 'App2',
          mount: async () => () => undefined,
        });

        const { navigateToApp, getComponent } = await service.start(startDeps);
        update = createRenderer(getComponent());

        await act(async () => {
          await navigateToApp('app1');
          await update();
        });
        await act(async () => {
          await navigateToApp('app2', { path: '/nested' });
          await update();
        });
        await act(async () => {
          await navigateToApp('app2', { path: '/another-path' });
          await update();
        });

        expect(locations).toEqual(['/', '/app/app1', '/app/app2/nested', '/app/app2/another-path']);
      });

      it('replaces the current history entry when the `replace` option is true', async () => {
        const { register } = service.setup(setupDeps);

        register(Symbol(), {
          id: 'app1',
          title: 'App1',
          mount: async ({}: AppMountParameters) => {
            return () => undefined;
          },
        });

        const { navigateToApp } = await service.start(startDeps);

        await navigateToApp('app1', { path: '/foo' });
        await navigateToApp('app1', { path: '/bar', replace: true });

        expect(history.entries.map((entry) => entry.pathname)).toEqual(['/', '/app/app1/bar']);
      });

      it('handles updated deepLinks', async () => {
        const { register } = service.setup(setupDeps);

        const updater$ = new BehaviorSubject<AppUpdater>(() => ({}));

        register(Symbol(), {
          id: 'app1',
          title: 'App1',
          deepLinks: [],
          updater$,
          mount: async ({}: AppMountParameters) => {
            return () => undefined;
          },
        });

        const { navigateToApp } = await service.start(startDeps);

        updater$.next(() => ({
          deepLinks: [
            {
              id: 'deepLink',
              title: 'Some deep link',
              path: '/deep-link',
            },
          ],
        }));

        await navigateToApp('app1', { deepLinkId: 'deepLink' });

        expect(history.entries.map((entry) => entry.pathname)).toEqual([
          '/',
          '/app/app1/deep-link',
        ]);
      });

      it('handles `skipOnAppLeave` option', async () => {
        const { register } = service.setup(setupDeps);

        register(Symbol(), {
          id: 'app1',
          title: 'App1',
          mount: async ({}: AppMountParameters) => {
            return () => undefined;
          },
        });

        const { navigateToApp } = await service.start(startDeps);

        await navigateToApp('app1', { path: '/foo' });
        await navigateToApp('app1', { path: '/bar', skipAppLeave: true });
        expect(history.entries.map((entry) => entry.pathname)).toEqual([
          '/',
          '/app/app1/foo',
          '/app/app1/bar',
        ]);
      });
    });
  });

  describe('leaving an application that registered an app leave handler', () => {
    it('navigates to the new app if action is default', async () => {
      startDeps.overlays.openConfirm.mockResolvedValue(true);

      const { register } = service.setup(setupDeps);

      register(Symbol(), {
        id: 'app1',
        title: 'App1',
        mount: ({ onAppLeave }: AppMountParameters) => {
          onAppLeave((actions) => actions.default());
          return () => undefined;
        },
      });
      register(Symbol(), {
        id: 'app2',
        title: 'App2',
        mount: ({}: AppMountParameters) => {
          return () => undefined;
        },
      });

      const { navigateToApp, getComponent } = await service.start(startDeps);

      update = createRenderer(getComponent());

      await act(async () => {
        await navigate('/app/app1');
        await navigateToApp('app2');
      });

      expect(startDeps.overlays.openConfirm).not.toHaveBeenCalled();
      expect(history.entries.length).toEqual(3);
      expect(history.entries[2].pathname).toEqual('/app/app2');
    });

    it('navigates to the new app if action is confirm and user accepted', async () => {
      startDeps.overlays.openConfirm.mockResolvedValue(true);

      const { register } = service.setup(setupDeps);

      register(Symbol(), {
        id: 'app1',
        title: 'App1',
        mount: ({ onAppLeave }: AppMountParameters) => {
          onAppLeave((actions) => actions.confirm('confirmation-message', 'confirmation-title'));
          return () => undefined;
        },
      });
      register(Symbol(), {
        id: 'app2',
        title: 'App2',
        mount: ({}: AppMountParameters) => {
          return () => undefined;
        },
      });

      const { navigateToApp, getComponent } = await service.start(startDeps);

      update = createRenderer(getComponent());

      await act(async () => {
        await navigate('/app/app1');
        await navigateToApp('app2');
      });

      expect(startDeps.overlays.openConfirm).toHaveBeenCalledTimes(1);
      expect(startDeps.overlays.openConfirm).toHaveBeenCalledWith(
        'confirmation-message',
        expect.objectContaining({ title: 'confirmation-title' })
      );
      expect(history.entries.length).toEqual(3);
      expect(history.entries[2].pathname).toEqual('/app/app2');
    });

    it('does not trigger the action if `skipAppLeave` is true', async () => {
      const { register } = service.setup(setupDeps);

      register(Symbol(), {
        id: 'app1',
        title: 'App1',
        mount: ({ onAppLeave }: AppMountParameters) => {
          onAppLeave((actions) => actions.confirm('confirmation-message', 'confirmation-title'));
          return () => undefined;
        },
      });
      register(Symbol(), {
        id: 'app2',
        title: 'App2',
        mount: ({}: AppMountParameters) => {
          return () => undefined;
        },
      });

      const { navigateToApp, getComponent } = await service.start(startDeps);

      update = createRenderer(getComponent());

      await act(async () => {
        await navigate('/app/app1');
        await navigateToApp('app2', { skipAppLeave: true });
      });
      expect(startDeps.overlays.openConfirm).toHaveBeenCalledTimes(0);
      expect(history.entries.length).toEqual(3);
      expect(history.entries[1].pathname).toEqual('/app/app1');
    });

    it('blocks navigation to the new app if action is confirm and user declined', async () => {
      startDeps.overlays.openConfirm.mockResolvedValue(false);

      const { register } = service.setup(setupDeps);

      register(Symbol(), {
        id: 'app1',
        title: 'App1',
        mount: ({ onAppLeave }: AppMountParameters) => {
          onAppLeave((actions) => actions.confirm('confirmation-message', 'confirmation-title'));
          return () => undefined;
        },
      });
      register(Symbol(), {
        id: 'app2',
        title: 'App2',
        mount: ({}: AppMountParameters) => {
          return () => undefined;
        },
      });

      const { navigateToApp, getComponent } = await service.start(startDeps);

      update = createRenderer(getComponent());

      await act(async () => {
        await navigate('/app/app1');
        await navigateToApp('app2');
      });

      expect(startDeps.overlays.openConfirm).toHaveBeenCalledTimes(1);
      expect(startDeps.overlays.openConfirm).toHaveBeenCalledWith(
        'confirmation-message',
        expect.objectContaining({ title: 'confirmation-title' })
      );
      expect(history.entries.length).toEqual(2);
      expect(history.entries[1].pathname).toEqual('/app/app1');
    });

    it('does not trigger navigation check if navigating to the current app', async () => {
      startDeps.overlays.openConfirm.mockResolvedValue(false);

      const { register } = service.setup(setupDeps);

      register(Symbol(), {
        id: 'app1',
        title: 'App1',
        mount: ({ onAppLeave }: AppMountParameters) => {
          onAppLeave((actions) => actions.confirm('confirmation-message', 'confirmation-title'));
          return () => undefined;
        },
      });

      const { navigateToApp, getComponent } = await service.start(startDeps);

      update = createRenderer(getComponent());

      await act(async () => {
        await navigate('/app/app1');
        await navigateToApp('app1', { path: '/internal-path' });
      });

      expect(startDeps.overlays.openConfirm).not.toHaveBeenCalled();
      expect(history.entries.length).toEqual(3);
      expect(history.entries[2].pathname).toEqual('/app/app1/internal-path');
    });
  });

  describe('registering action menus', () => {
    const getValue = (obs: Observable<MountPoint | undefined>): Promise<MountPoint | undefined> => {
      return obs.pipe(take(1)).toPromise();
    };

    const mounter1: MountPoint = () => () => undefined;
    const mounter2: MountPoint = () => () => undefined;

    it('updates the observable value when an application is mounted', async () => {
      const { register } = service.setup(setupDeps);

      register(Symbol(), {
        id: 'app1',
        title: 'App1',
        mount: async ({ setHeaderActionMenu }: AppMountParameters) => {
          setHeaderActionMenu(mounter1);
          return () => undefined;
        },
      });

      const { navigateToApp, getComponent, currentActionMenu$ } = await service.start(startDeps);
      update = createRenderer(getComponent());

      expect(await getValue(currentActionMenu$)).toBeUndefined();

      await act(async () => {
        await navigateToApp('app1');
        await flushPromises();
      });

      expect(await getValue(currentActionMenu$)).toBe(mounter1);
    });

    it('updates the observable value when switching application', async () => {
      const { register } = service.setup(setupDeps);

      register(Symbol(), {
        id: 'app1',
        title: 'App1',
        mount: async ({ setHeaderActionMenu }: AppMountParameters) => {
          setHeaderActionMenu(mounter1);
          return () => undefined;
        },
      });
      register(Symbol(), {
        id: 'app2',
        title: 'App2',
        mount: async ({ setHeaderActionMenu }: AppMountParameters) => {
          setHeaderActionMenu(mounter2);
          return () => undefined;
        },
      });

      const { navigateToApp, getComponent, currentActionMenu$ } = await service.start(startDeps);
      update = createRenderer(getComponent());

      await act(async () => {
        await navigateToApp('app1');
        await flushPromises();
      });

      expect(await getValue(currentActionMenu$)).toBe(mounter1);

      await act(async () => {
        await navigateToApp('app2');
        await flushPromises();
      });

      expect(await getValue(currentActionMenu$)).toBe(mounter2);
    });

    it('does not update the observable value when navigating to the current app', async () => {
      const { register } = service.setup(setupDeps);

      let initialMount = true;
      register(Symbol(), {
        id: 'app1',
        title: 'App1',
        mount: async ({ setHeaderActionMenu }: AppMountParameters) => {
          if (initialMount) {
            setHeaderActionMenu(mounter1);
            initialMount = false;
          }
          return () => undefined;
        },
      });

      const { navigateToApp, getComponent, currentActionMenu$ } = await service.start(startDeps);
      update = createRenderer(getComponent());

      let mountedMenuCount = 0;
      currentActionMenu$.subscribe(() => {
        mountedMenuCount++;
      });

      await act(async () => {
        await navigateToApp('app1');
        await flushPromises();
      });

      expect(await getValue(currentActionMenu$)).toBe(mounter1);

      await act(async () => {
        await navigateToApp('app1');
        await flushPromises();
      });

      expect(await getValue(currentActionMenu$)).toBe(mounter1);

      // there is an initial 'undefined' emission
      expect(mountedMenuCount).toBe(2);
    });

    it('updates the observable value to undefined when switching to an application without action menu', async () => {
      const { register } = service.setup(setupDeps);

      register(Symbol(), {
        id: 'app1',
        title: 'App1',
        mount: async ({ setHeaderActionMenu }: AppMountParameters) => {
          setHeaderActionMenu(mounter1);
          return () => undefined;
        },
      });
      register(Symbol(), {
        id: 'app2',
        title: 'App2',
        mount: async ({}: AppMountParameters) => {
          return () => undefined;
        },
      });

      const { navigateToApp, getComponent, currentActionMenu$ } = await service.start(startDeps);
      update = createRenderer(getComponent());

      await act(async () => {
        await navigateToApp('app1');
        await flushPromises();
      });

      expect(await getValue(currentActionMenu$)).toBe(mounter1);

      await act(async () => {
        await navigateToApp('app2');
        await flushPromises();
      });

      expect(await getValue(currentActionMenu$)).toBeUndefined();
    });

    it('allow applications to call `setHeaderActionMenu` multiple times', async () => {
      const { register } = service.setup(setupDeps);

      let resolveMount: () => void;
      const promise = new Promise<void>((resolve) => {
        resolveMount = resolve;
      });

      register(Symbol(), {
        id: 'app1',
        title: 'App1',
        mount: async ({ setHeaderActionMenu }: AppMountParameters) => {
          setHeaderActionMenu(mounter1);
          promise
            .then(() => {
              setHeaderActionMenu(mounter2);
            })
            .catch((error) => {
              // eslint-disable-next-line no-console
              console.error('Error:', error);
            });
          return () => undefined;
        },
      });

      const { navigateToApp, getComponent, currentActionMenu$ } = await service.start(startDeps);
      update = createRenderer(getComponent());

      await act(async () => {
        await navigateToApp('app1');
        await flushPromises();
      });

      expect(await getValue(currentActionMenu$)).toBe(mounter1);

      await act(async () => {
        resolveMount();
        await flushPromises();
      });

      expect(await getValue(currentActionMenu$)).toBe(mounter2);
    });

    it('allow applications to unset the current menu', async () => {
      const { register } = service.setup(setupDeps);

      let resolveMount: () => void;
      const promise = new Promise<void>((resolve) => {
        resolveMount = resolve;
      });

      register(Symbol(), {
        id: 'app1',
        title: 'App1',
        mount: async ({ setHeaderActionMenu }: AppMountParameters) => {
          setHeaderActionMenu(mounter1);
          promise
            .then(() => {
              setHeaderActionMenu(undefined);
            })
            .catch((error) => {
              // eslint-disable-next-line no-console
              console.error('Error:', error);
            });
          return () => undefined;
        },
      });

      const { navigateToApp, getComponent, currentActionMenu$ } = await service.start(startDeps);
      update = createRenderer(getComponent());

      await act(async () => {
        await navigateToApp('app1');
        await flushPromises();
      });

      expect(await getValue(currentActionMenu$)).toBe(mounter1);

      await act(async () => {
        resolveMount();
        await flushPromises();
      });

      expect(await getValue(currentActionMenu$)).toBeUndefined();
    });
  });
});
