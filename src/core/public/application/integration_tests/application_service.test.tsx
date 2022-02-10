/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { BehaviorSubject } from 'rxjs';
import { take } from 'rxjs/operators';
import { act } from 'react-dom/test-utils';
import { createMemoryHistory, MemoryHistory } from 'history';

import { createRenderer } from './utils';
import { ApplicationService } from '../application_service';
import { httpServiceMock } from '../../http/http_service.mock';
import { MockLifecycle } from '../test_types';
import { overlayServiceMock } from '../../overlays/overlay_service.mock';
import { themeServiceMock } from '../../theme/theme_service.mock';
import { AppMountParameters, AppUpdater } from '../types';
import { Observable } from 'rxjs';
import { MountPoint } from 'kibana/public';

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

    http.post.mockResolvedValue({ navLinks: {} });

    setupDeps = {
      http,
      history: history as any,
    };
    startDeps = {
      http,
      overlays: overlayServiceMock.createStartContract(),
      theme: themeServiceMock.createStartContract(),
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
    });

    describe('using navigateToApp', () => {
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

        const { navigateToApp, currentAppId$ } = await service.start(startDeps);

        await act(() => navigateToApp('app1'));

        expect(await currentAppId$.pipe(take(1)).toPromise()).toEqual('app1');

        resolveMount!();

        expect(await currentAppId$.pipe(take(1)).toPromise()).toEqual('app1');
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
      ////
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
          promise.then(() => {
            setHeaderActionMenu(mounter2);
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
          promise.then(() => {
            setHeaderActionMenu(undefined);
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
