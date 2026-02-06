/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';
import type { SidebarAppDefinition, SidebarAppId } from '@kbn/core-chrome-sidebar';
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
  app: Partial<SidebarAppDefinition<TState, TActions>> & Pick<SidebarAppDefinition, 'appId'>
) => {
  return service.setup().registerApp({
    status: 'accessible',
    restoreOnReload: true,
    loadComponent: async () => () => null,
    ...app,
  } as SidebarAppDefinition<TState, TActions>);
};

describe('SidebarService (integration)', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  describe('state restoration', () => {
    it('restores open app after accessibility becomes true', () => {
      const service = createService();
      const updateApp = registerApp(service, { appId: APP_ID_A, status: 'inaccessible' });

      sessionStorage.setItem(`${STATE_STORAGE_PREFIX}:currentAppId`, JSON.stringify(APP_ID_A));

      const start = service.start();

      expect(start.isOpen()).toBe(false);
      updateApp({ status: 'accessible' });
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

    it('opens with schema defaults (no initial state parameter)', () => {
      const service = createService();
      registerApp<TestState, TestActions>(service, { appId: APP_ID_A, store: createTestStore() });

      const start = service.start();
      const app = start.getApp<TestState, TestActions>(APP_ID_A);

      app.open();
      expect(app.getState()).toEqual({ count: 0, name: '' });
      expect(start.getCurrentAppId()).toBe(APP_ID_A);
      expect(sessionStorage.getItem(`${STATE_STORAGE_PREFIX}:currentAppId`)).toBe(
        JSON.stringify(APP_ID_A)
      );
    });

    it('sets state through actions before opening', () => {
      const service = createService();
      registerApp<TestState, TestActions>(service, { appId: APP_ID_A, store: createTestStore() });

      const start = service.start();
      const app = start.getApp<TestState, TestActions>(APP_ID_A);

      // Use action that sets state and opens
      app.actions.openWithCount(5);
      expect(app.getState()).toEqual({ count: 5, name: '' });
      expect(start.getCurrentAppId()).toBe(APP_ID_A);
      expect(localStorage.getItem(`${APP_STORAGE_PREFIX}:${APP_ID_A}`)).toBe(
        JSON.stringify({ count: 5, name: '' })
      );
    });

    it('modifies state through actions', () => {
      const service = createService();
      registerApp<TestState, TestActions>(service, { appId: APP_ID_A, store: createTestStore() });

      const start = service.start();
      const app = start.getApp<TestState, TestActions>(APP_ID_A);

      expect(app.getState()).toEqual({ count: 0, name: '' });

      app.actions.setCount(5);
      expect(app.getState()).toEqual({ count: 5, name: '' });

      app.actions.increment();
      expect(app.getState()).toEqual({ count: 6, name: '' });

      app.actions.setName('test');
      expect(app.getState()).toEqual({ count: 6, name: 'test' });

      expect(localStorage.getItem(`${APP_STORAGE_PREFIX}:${APP_ID_A}`)).toBe(
        JSON.stringify({ count: 6, name: 'test' })
      );
    });

    it('actions can read current state with get()', () => {
      const service = createService();
      registerApp<TestState, TestActions>(service, { appId: APP_ID_A, store: createTestStore() });

      const start = service.start();
      const app = start.getApp<TestState, TestActions>(APP_ID_A);

      app.actions.setCount(10);
      expect(app.actions.getCountPlusOne()).toBe(11);
    });
  });

  describe('sidebar context in actions', () => {
    it('actions can open sidebar via context', () => {
      const service = createService();
      registerApp<TestState, TestActions>(service, { appId: APP_ID_A, store: createTestStore() });

      const start = service.start();
      const app = start.getApp<TestState, TestActions>(APP_ID_A);

      expect(start.isOpen()).toBe(false);

      app.actions.openWithCount(10);

      expect(start.isOpen()).toBe(true);
      expect(start.getCurrentAppId()).toBe(APP_ID_A);
      expect(app.getState()).toEqual({ count: 10, name: '' });
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
    it('returns stable observable instances', () => {
      const service = createService();
      registerApp<TestState, TestActions>(service, { appId: APP_ID_A, store: createTestStore() });

      const start = service.start();
      const app = start.getApp<TestState, TestActions>(APP_ID_A);

      expect(start.isOpen$()).toBe(start.isOpen$());
      expect(start.getWidth$()).toBe(start.getWidth$());
      expect(start.getCurrentAppId$()).toBe(start.getCurrentAppId$());
      expect(app.getState$()).toBe(app.getState$());
    });

    it('returns stable app-bound API instances', () => {
      const service = createService();
      registerApp(service, { appId: APP_ID_A });
      registerApp(service, { appId: APP_ID_B });

      const start = service.start();

      expect(start.getApp(APP_ID_A)).toBe(start.getApp(APP_ID_A));
      expect(start.getApp(APP_ID_B)).toBe(start.getApp(APP_ID_B));
      expect(start.getApp(APP_ID_A)).not.toBe(start.getApp(APP_ID_B));
    });

    it('throws when opening an inaccessible app', () => {
      const service = createService();
      registerApp(service, { appId: APP_ID_A, status: 'inaccessible' });

      const start = service.start();
      const app = start.getApp(APP_ID_A);

      expect(() => app.open()).toThrow(
        '[Sidebar State] Cannot open sidebar. App not accessible: sidebarExampleAppA'
      );
      expect(start.isOpen()).toBe(false);
      expect(start.getCurrentAppId()).toBe(null);
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
