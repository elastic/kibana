/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';
import type { SidebarAppConfig, SidebarAppId } from '@kbn/core-chrome-sidebar';
import { createSidebarStore } from '@kbn/core-chrome-sidebar';
import { SidebarService } from './sidebar_service';

const BASE_PATH = '/test';
const STATE_STORAGE_PREFIX = `${BASE_PATH}:core.chrome.sidebar.state`;
const APP_STORAGE_PREFIX = `${BASE_PATH}:core.chrome.sidebar.app`;

const APP_ID_A: SidebarAppId = 'sidebarExampleAppA';
const APP_ID_B: SidebarAppId = 'sidebarExampleAppB';

const stateSchema = z.object({
  count: z.number().default(0),
  name: z.string().default(''),
});

const createTestStore = () =>
  createSidebarStore({
    schema: stateSchema,
    actions: (set, get, sidebar) => ({
      setCount: (count: number) => set({ count }),
      increment: () => set((s) => ({ count: s.count + 1 })),
      setName: (name: string) => set({ name }),
      reset: () => set({ count: 0, name: '' }),
      getCountPlusOne: () => get().count + 1,
      /** Opens sidebar with a specific count */
      openWithCount: (count: number) => {
        set({ count });
        sidebar.open();
      },
      /** Closes sidebar via context */
      closeViaContext: () => sidebar.close(),
      /** Check if this app is current */
      checkIsCurrent: () => sidebar.isCurrent(),
    }),
  });

type TestState = ReturnType<typeof createTestStore>['types']['state'];
type TestActions = ReturnType<typeof createTestStore>['types']['actions'];

const createService = (): SidebarService => {
  return new SidebarService({ basePath: BASE_PATH });
};

const registerApp = <TState = undefined, TActions = undefined>(
  service: SidebarService,
  app: Partial<SidebarAppConfig<TState, TActions>> & Pick<SidebarAppConfig, 'appId'>
) => {
  return service.setup().registerApp({
    status: 'available',
    restoreOnReload: true,
    loadComponent: async () => () => null,
    ...app,
  } as SidebarAppConfig<TState, TActions>);
};

describe('SidebarService (integration)', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  describe('state restoration', () => {
    it('restores open app immediately even when pending', () => {
      const service = createService();
      const updateApp = registerApp(service, { appId: APP_ID_A, status: 'pending' });

      sessionStorage.setItem(`${STATE_STORAGE_PREFIX}:currentAppId`, JSON.stringify(APP_ID_A));

      const start = service.start();

      expect(start.isOpen()).toBe(true);
      expect(start.getCurrentAppId()).toBe(APP_ID_A);

      updateApp({ status: 'available' });
      expect(start.isOpen()).toBe(true);
      expect(start.getCurrentAppId()).toBe(APP_ID_A);
      expect(sessionStorage.getItem(`${STATE_STORAGE_PREFIX}:currentAppId`)).toBe(
        JSON.stringify(APP_ID_A)
      );
    });

    it('does not restore when restoreOnReload is false', () => {
      const service = createService();
      registerApp(service, { appId: APP_ID_A, restoreOnReload: false });

      sessionStorage.setItem(`${STATE_STORAGE_PREFIX}:currentAppId`, JSON.stringify(APP_ID_A));

      const start = service.start();

      expect(start.isOpen()).toBe(false);
      expect(start.getCurrentAppId()).toBe(null);
    });

    it('restores current app and state after reload', () => {
      const initialService = createService();
      registerApp<TestState, TestActions>(initialService, {
        appId: APP_ID_A,
        store: createTestStore(),
      });

      const initialStart = initialService.start();
      const initialApp = initialStart.getApp<TestState, TestActions>(APP_ID_A);

      initialApp.actions.openWithCount(3);
      expect(initialStart.getCurrentAppId()).toBe(APP_ID_A);
      expect(initialApp.getState()).toEqual({ count: 3, name: '' });
      expect(localStorage.getItem(`${APP_STORAGE_PREFIX}:${APP_ID_A}`)).toBe(
        JSON.stringify({ count: 3, name: '' })
      );
      expect(sessionStorage.getItem(`${STATE_STORAGE_PREFIX}:currentAppId`)).toBe(
        JSON.stringify(APP_ID_A)
      );

      const reloadedService = createService();
      registerApp<TestState, TestActions>(reloadedService, {
        appId: APP_ID_A,
        store: createTestStore(),
      });

      const reloadedStart = reloadedService.start();
      const reloadedApp = reloadedStart.getApp<TestState, TestActions>(APP_ID_A);

      expect(reloadedStart.getCurrentAppId()).toBe(APP_ID_A);
      expect(reloadedApp.getState()).toEqual({ count: 3, name: '' });
    });
  });

  describe('app status', () => {
    it('tracks status transitions via getStatus and getStatus$', () => {
      const service = createService();
      const updateApp = registerApp(service, { appId: APP_ID_A, status: 'pending' });

      const start = service.start();
      const app = start.getApp(APP_ID_A);

      expect(app.getStatus()).toBe('pending');

      const statuses: string[] = [];
      const subscription = app.getStatus$().subscribe((status) => statuses.push(status));

      expect(statuses).toEqual(['pending']);

      // Open while pending - sidebar stays open through transition
      app.open();
      expect(start.isOpen()).toBe(true);

      updateApp({ status: 'available' });
      expect(app.getStatus()).toBe('available');
      expect(statuses).toEqual(['pending', 'available']);
      expect(start.isOpen()).toBe(true);

      subscription.unsubscribe();
    });

    it('auto-closes sidebar when current app becomes unavailable', () => {
      const service = createService();
      const updateApp = registerApp(service, { appId: APP_ID_A });

      const start = service.start();
      const app = start.getApp(APP_ID_A);

      app.open();
      expect(start.isOpen()).toBe(true);
      expect(app.getStatus()).toBe('available');

      updateApp({ status: 'unavailable' });
      expect(app.getStatus()).toBe('unavailable');
      expect(start.isOpen()).toBe(false);
      expect(start.getCurrentAppId()).toBe(null);
    });

    it('auto-close clears session storage so unavailable app is not restored', () => {
      const service = createService();
      const updateApp = registerApp(service, { appId: APP_ID_A, status: 'pending' });

      const start = service.start();
      start.getApp(APP_ID_A).open();
      expect(sessionStorage.getItem(`${STATE_STORAGE_PREFIX}:currentAppId`)).toBe(
        JSON.stringify(APP_ID_A)
      );

      updateApp({ status: 'unavailable' });
      expect(start.isOpen()).toBe(false);
      expect(sessionStorage.getItem(`${STATE_STORAGE_PREFIX}:currentAppId`)).toBe('null');
    });

    it('auto-closes restored app that becomes unavailable before available', () => {
      const service = createService();
      const updateApp = registerApp(service, { appId: APP_ID_A, status: 'pending' });

      sessionStorage.setItem(`${STATE_STORAGE_PREFIX}:currentAppId`, JSON.stringify(APP_ID_A));

      const start = service.start();
      expect(start.isOpen()).toBe(true);
      expect(start.getCurrentAppId()).toBe(APP_ID_A);

      updateApp({ status: 'unavailable' });
      expect(start.isOpen()).toBe(false);
      expect(start.getCurrentAppId()).toBe(null);
    });

    it('does not close sidebar when a non-current app becomes unavailable', () => {
      const service = createService();
      registerApp(service, { appId: APP_ID_A });
      const updateAppB = registerApp(service, { appId: APP_ID_B, status: 'pending' });

      const start = service.start();
      start.getApp(APP_ID_A).open();
      expect(start.isOpen()).toBe(true);
      expect(start.getCurrentAppId()).toBe(APP_ID_A);

      updateAppB({ status: 'unavailable' });
      expect(start.isOpen()).toBe(true);
      expect(start.getCurrentAppId()).toBe(APP_ID_A);
    });

    it('throws when opening unavailable app', () => {
      const service = createService();
      registerApp(service, { appId: APP_ID_A, status: 'unavailable' });

      const start = service.start();
      const app = start.getApp(APP_ID_A);

      expect(() => app.open()).toThrow(
        '[Sidebar State] Cannot open sidebar. App is unavailable: sidebarExampleAppA'
      );
      expect(start.isOpen()).toBe(false);
    });

    it('does not restore unavailable app on reload', () => {
      const service = createService();
      registerApp(service, { appId: APP_ID_A, status: 'unavailable' });

      sessionStorage.setItem(`${STATE_STORAGE_PREFIX}:currentAppId`, JSON.stringify(APP_ID_A));

      const start = service.start();

      expect(start.isOpen()).toBe(false);
      expect(start.getCurrentAppId()).toBe(null);
    });
  });

  describe('width', () => {
    it('clamps width to min and max based on viewport', () => {
      const service = createService();
      registerApp(service, { appId: APP_ID_A });

      const WINDOW_WIDTH = 1000;
      const MIN_WIDTH = 320;
      const MAX_WIDTH = Math.floor(WINDOW_WIDTH * 0.5);
      const TOO_SMALL_WIDTH = 100;
      const TOO_LARGE_WIDTH = 999;

      Object.defineProperty(window, 'innerWidth', {
        configurable: true,
        value: WINDOW_WIDTH,
        writable: true,
      });

      const start = service.start();

      start.setWidth(TOO_SMALL_WIDTH);
      expect(start.getWidth()).toBe(MIN_WIDTH);

      start.setWidth(TOO_LARGE_WIDTH);
      expect(start.getWidth()).toBe(MAX_WIDTH);
    });
  });

  describe('app state and actions', () => {
    it('returns undefined state for apps without a store', () => {
      const service = createService();
      registerApp(service, { appId: APP_ID_A });

      const start = service.start();
      const app = start.getApp(APP_ID_A);

      // Stateless apps have all methods, but state-related ones return undefined
      expect(app.actions).toBeUndefined();
      expect(app.getState()).toBeUndefined();
      expect(typeof app.open).toBe('function');
      expect(typeof app.close).toBe('function');
    });

    it('falls back to defaults when restoring invalid state', () => {
      const service = createService();
      registerApp<TestState, TestActions>(service, { appId: APP_ID_A, store: createTestStore() });

      localStorage.setItem(
        `${APP_STORAGE_PREFIX}:${APP_ID_A}`,
        JSON.stringify({ count: 'invalid' })
      );

      const start = service.start();
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);

      expect(start.getApp<TestState, TestActions>(APP_ID_A).getState()).toEqual({
        count: 0,
        name: '',
      });
      expect(warnSpy).toHaveBeenCalled();

      warnSpy.mockRestore();
    });

    it('manages state through actions and persists to storage', () => {
      const service = createService();
      registerApp<TestState, TestActions>(service, { appId: APP_ID_A, store: createTestStore() });

      const start = service.start();
      const app = start.getApp<TestState, TestActions>(APP_ID_A);

      // Starts with schema defaults
      expect(app.getState()).toEqual({ count: 0, name: '' });

      // Accumulates state through multiple actions
      app.actions.setCount(5);
      expect(app.getState()).toEqual({ count: 5, name: '' });

      app.actions.increment();
      expect(app.getState()).toEqual({ count: 6, name: '' });

      app.actions.setName('test');
      expect(app.getState()).toEqual({ count: 6, name: 'test' });

      // Persists to localStorage
      expect(localStorage.getItem(`${APP_STORAGE_PREFIX}:${APP_ID_A}`)).toBe(
        JSON.stringify({ count: 6, name: 'test' })
      );

      // Actions can read current state via get()
      expect(app.actions.getCountPlusOne()).toBe(7);
    });
  });

  describe('sidebar context in actions', () => {
    it('actions can open sidebar and set state via context', () => {
      const service = createService();
      registerApp<TestState, TestActions>(service, { appId: APP_ID_A, store: createTestStore() });

      const start = service.start();
      const app = start.getApp<TestState, TestActions>(APP_ID_A);

      expect(start.isOpen()).toBe(false);

      // Action sets state and opens sidebar via context
      app.actions.openWithCount(5);

      expect(start.isOpen()).toBe(true);
      expect(start.getCurrentAppId()).toBe(APP_ID_A);
      expect(app.getState()).toEqual({ count: 5, name: '' });
      expect(localStorage.getItem(`${APP_STORAGE_PREFIX}:${APP_ID_A}`)).toBe(
        JSON.stringify({ count: 5, name: '' })
      );
    });

    it('actions can close sidebar via context', () => {
      const service = createService();
      registerApp<TestState, TestActions>(service, { appId: APP_ID_A, store: createTestStore() });

      const start = service.start();
      const app = start.getApp<TestState, TestActions>(APP_ID_A);

      app.open();
      expect(start.isOpen()).toBe(true);

      app.actions.closeViaContext();
      expect(start.isOpen()).toBe(false);
      expect(start.getCurrentAppId()).toBe(null);
    });

    it('actions can check if app is current via context', () => {
      const service = createService();
      registerApp<TestState, TestActions>(service, { appId: APP_ID_A, store: createTestStore() });
      registerApp<TestState, TestActions>(service, { appId: APP_ID_B, store: createTestStore() });

      const start = service.start();
      const appA = start.getApp<TestState, TestActions>(APP_ID_A);
      const appB = start.getApp<TestState, TestActions>(APP_ID_B);

      expect(appA.actions.checkIsCurrent()).toBe(false);
      expect(appB.actions.checkIsCurrent()).toBe(false);

      appA.open();
      expect(appA.actions.checkIsCurrent()).toBe(true);
      expect(appB.actions.checkIsCurrent()).toBe(false);

      appB.open();
      expect(appA.actions.checkIsCurrent()).toBe(false);
      expect(appB.actions.checkIsCurrent()).toBe(true);

      start.close();
      expect(appA.actions.checkIsCurrent()).toBe(false);
      expect(appB.actions.checkIsCurrent()).toBe(false);
    });
  });

  describe('app-bound API', () => {
    it('returns memoized app instances and stable observables', () => {
      const service = createService();
      registerApp<TestState, TestActions>(service, { appId: APP_ID_A, store: createTestStore() });
      registerApp(service, { appId: APP_ID_B });

      const start = service.start();

      // getApp returns the same instance per appId (memoized)
      expect(start.getApp(APP_ID_A)).toBe(start.getApp(APP_ID_A));
      expect(start.getApp(APP_ID_B)).toBe(start.getApp(APP_ID_B));
      expect(start.getApp(APP_ID_A)).not.toBe(start.getApp(APP_ID_B));

      // Observable getters return stable references (bound + memoized)
      expect(start.isOpen$()).toBe(start.isOpen$());
      expect(start.getWidth$()).toBe(start.getWidth$());
      expect(start.getCurrentAppId$()).toBe(start.getCurrentAppId$());
      expect(start.getApp<TestState, TestActions>(APP_ID_A).getState$()).toBe(
        start.getApp<TestState, TestActions>(APP_ID_A).getState$()
      );
    });

    it('closes only when the current app is closed', () => {
      const service = createService();
      registerApp(service, { appId: APP_ID_A });
      registerApp(service, { appId: APP_ID_B });

      const start = service.start();
      const appA = start.getApp(APP_ID_A);
      const appB = start.getApp(APP_ID_B);

      expect(appA).not.toBe(appB);

      appA.open();
      expect(start.getCurrentAppId()).toBe(APP_ID_A);

      appB.close();
      expect(start.isOpen()).toBe(true);
      expect(start.getCurrentAppId()).toBe(APP_ID_A);

      appA.close();
      expect(start.isOpen()).toBe(false);
    });
  });
});
