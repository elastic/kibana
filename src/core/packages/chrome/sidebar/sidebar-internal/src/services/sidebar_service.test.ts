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
import { SidebarService } from './sidebar_service';

const BASE_PATH = '/test';
const STATE_STORAGE_PREFIX = `${BASE_PATH}:core.chrome.sidebar.state`;
const APP_STORAGE_PREFIX = `${BASE_PATH}:core.chrome.sidebar.app`;

const APP_ID_A: SidebarAppId = 'sidebarExampleAppA';
const APP_ID_B: SidebarAppId = 'sidebarExampleAppB';

const getParamsSchema = () =>
  z.object({
    count: z.number().default(0),
    name: z.string().default(''),
  });

type Params = z.infer<ReturnType<typeof getParamsSchema>>;

const createService = (): SidebarService => {
  return new SidebarService({ basePath: BASE_PATH });
};

const registerApp = (
  service: SidebarService,
  app: Partial<SidebarAppDefinition> & Pick<SidebarAppDefinition, 'appId'>
) => {
  return service.setup().registerApp({
    status: 'accessible',
    restoreOnReload: true,
    getParamsSchema,
    loadComponent: async () => () => null,
    ...app,
  });
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

    it('restores current app and params after reload', () => {
      const initialService = createService();
      registerApp(initialService, { appId: APP_ID_A, getParamsSchema });

      const initialStart = initialService.start();
      const initialApp = initialStart.getApp<Params>(APP_ID_A);

      initialApp.open({ count: 3 });
      expect(initialStart.getCurrentAppId()).toBe(APP_ID_A);
      expect(initialApp.getParams()).toEqual({ count: 3, name: '' });
      expect(localStorage.getItem(`${APP_STORAGE_PREFIX}:${APP_ID_A}`)).toBe(
        JSON.stringify({ count: 3, name: '' })
      );
      expect(sessionStorage.getItem(`${STATE_STORAGE_PREFIX}:currentAppId`)).toBe(
        JSON.stringify(APP_ID_A)
      );

      const reloadedService = createService();
      registerApp(reloadedService, { appId: APP_ID_A, getParamsSchema });

      const reloadedStart = reloadedService.start();
      const reloadedApp = reloadedStart.getApp<Params>(APP_ID_A);

      expect(reloadedStart.getCurrentAppId()).toBe(APP_ID_A);
      expect(reloadedApp.getParams()).toEqual({ count: 3, name: '' });
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

  describe('app params', () => {
    it('throws when setParams is used without a schema', () => {
      const service = createService();
      registerApp(service, { appId: APP_ID_A, getParamsSchema: undefined });

      const start = service.start();
      const app = start.getApp(APP_ID_A);

      const initialParams = app.getParams();
      expect(() => app.setParams({ count: 1 })).toThrow(
        "[Sidebar] Cannot set params for app 'sidebarExampleAppA': no params schema defined."
      );
      expect(app.getParams()).toBe(initialParams);
      expect(localStorage.getItem(`${APP_STORAGE_PREFIX}:${APP_ID_A}`)).toBe(null);
    });

    it('falls back to defaults when restoring invalid params', () => {
      const service = createService();
      registerApp(service, { appId: APP_ID_A, getParamsSchema });

      localStorage.setItem(
        `${APP_STORAGE_PREFIX}:${APP_ID_A}`,
        JSON.stringify({ count: 'invalid' })
      );

      const start = service.start();
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);

      expect(start.getApp<Params>(APP_ID_A).getParams()).toEqual({ count: 0, name: '' });
      expect(warnSpy).toHaveBeenCalled();

      warnSpy.mockRestore();
    });

    it('merges params passed to open with schema defaults', () => {
      const service = createService();
      registerApp(service, { appId: APP_ID_A, getParamsSchema });

      const start = service.start();
      const app = start.getApp<Params>(APP_ID_A);

      app.open({ count: 1 });
      expect(app.getParams()).toEqual({ count: 1, name: '' });
      expect(localStorage.getItem(`${APP_STORAGE_PREFIX}:${APP_ID_A}`)).toBe(
        JSON.stringify({ count: 1, name: '' })
      );
      expect(sessionStorage.getItem(`${STATE_STORAGE_PREFIX}:currentAppId`)).toBe(
        JSON.stringify(APP_ID_A)
      );
    });
  });

  describe('app-bound API', () => {
    it('returns stable observable instances', () => {
      const service = createService();
      registerApp(service, { appId: APP_ID_A });

      const start = service.start();
      const app = start.getApp<Params>(APP_ID_A);

      expect(start.isOpen$()).toBe(start.isOpen$());
      expect(start.getWidth$()).toBe(start.getWidth$());
      expect(start.getCurrentAppId$()).toBe(start.getCurrentAppId$());
      expect(app.getParams$()).toBe(app.getParams$());
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
