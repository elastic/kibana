/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject, firstValueFrom, take, toArray } from 'rxjs';
import { HotkeyManager } from '@tanstack/hotkeys';
import type { HotkeysStart } from '@kbn/core-hotkeys-browser';
import { HotkeysService } from './hotkeys_service';

const createApplication = (initialAppId?: string) => {
  const currentAppId$ = new BehaviorSubject<string | undefined>(initialAppId);
  return { currentAppId$ };
};

const takeRegistrations = async (start: HotkeysStart) =>
  firstValueFrom(start.getRegistrations$().pipe(take(1)));

describe('HotkeysService', () => {
  let service: HotkeysService;

  beforeEach(() => {
    HotkeyManager.resetInstance();
    service = new HotkeysService();
  });

  afterEach(() => {
    service.stop();
    HotkeyManager.resetInstance();
  });

  describe('setup()', () => {
    it('returns an empty setup contract', () => {
      expect(service.setup()).toEqual({});
    });
  });

  describe('start()', () => {
    it('exposes the public API surface', () => {
      const start = service.start({ application: createApplication() });
      expect(typeof start.register).toBe('function');
      expect(typeof start.registerMany).toBe('function');
      expect(typeof start.forApp).toBe('function');
      expect(typeof start.getRegistrations$).toBe('function');
    });
  });

  describe('register()', () => {
    it('defaults scope to "context" when not provided', async () => {
      const start = service.start({ application: createApplication() });
      start.register({ id: 'test:a', keys: 'Mod+S', label: 'Save' }, jest.fn());
      const regs = await takeRegistrations(start);
      expect(regs).toHaveLength(1);
      expect(regs[0]).toMatchObject({ id: 'test:a', scope: 'context', label: 'Save' });
    });

    it('returns a handle whose unregister removes the registration', async () => {
      const start = service.start({ application: createApplication() });
      const handle = start.register(
        { id: 'test:a', keys: 'Mod+S', label: 'Save', scope: 'global' },
        jest.fn()
      );
      expect(await takeRegistrations(start)).toHaveLength(1);
      handle.unregister();
      expect(await takeRegistrations(start)).toHaveLength(0);
    });

    it('throws when the same id is registered twice', () => {
      const start = service.start({ application: createApplication() });
      start.register({ id: 'dup:a', keys: 'Mod+S', label: 'Save' }, jest.fn());
      expect(() =>
        start.register({ id: 'dup:a', keys: 'Mod+S', label: 'Save' }, jest.fn())
      ).toThrow(/already registered/);
    });

    it('updates label/description/enabled via handle.update()', async () => {
      const start = service.start({ application: createApplication() });
      const handle = start.register(
        { id: 'upd:a', keys: 'Mod+S', label: 'Save', scope: 'global' },
        jest.fn()
      );
      handle.update({ label: 'Save all', description: 'Saves all tabs' });
      const regs = await takeRegistrations(start);
      expect(regs[0]).toMatchObject({
        id: 'upd:a',
        label: 'Save all',
        description: 'Saves all tabs',
      });
    });

    it('emits on getRegistrations$ when registrations are added or removed', async () => {
      const start = service.start({ application: createApplication() });
      const emissions = start.getRegistrations$().pipe(take(3), toArray()).toPromise();
      const handle = start.register({ id: 'emit:a', keys: 'Mod+S', label: 'Save' }, jest.fn());
      handle.unregister();
      const result = await emissions;
      expect(result?.map((r) => r.length)).toEqual([0, 1, 0]);
    });

    it('invokes the handler when the hotkey fires', () => {
      const start = service.start({ application: createApplication() });
      const handler = jest.fn();
      start.register({ id: 'fire:a', keys: 'Mod+K', label: 'Go', scope: 'global' }, handler);
      const event = new KeyboardEvent('keydown', {
        key: 'K',
        ctrlKey: true,
        bubbles: true,
      });
      document.dispatchEvent(event);
      expect(handler).toHaveBeenCalledTimes(1);
    });
  });

  describe('registerMany()', () => {
    it('registers all definitions and returns a combined disposer', async () => {
      const start = service.start({ application: createApplication() });
      const dispose = start.registerMany([
        { def: { id: 'many:a', keys: 'Mod+1', label: 'One' }, handler: jest.fn() },
        { def: { id: 'many:b', keys: 'Mod+2', label: 'Two' }, handler: jest.fn() },
      ]);
      expect(await takeRegistrations(start)).toHaveLength(2);
      dispose();
      expect(await takeRegistrations(start)).toHaveLength(0);
    });
  });

  describe('forApp()', () => {
    it('injects the resolved appId and scope onto registered hotkeys', async () => {
      const start = service.start({ application: createApplication('discover') });
      const scope = start.forApp();
      scope.register({ id: 'app:a', keys: 'Mod+Shift+F', label: 'Filter' }, jest.fn());
      const regs = await takeRegistrations(start);
      expect(regs[0]).toMatchObject({
        id: 'app:a',
        scope: 'app',
        appId: 'discover',
      });
    });

    it('honors an explicit appId over the current one', async () => {
      const start = service.start({ application: createApplication('discover') });
      const scope = start.forApp('dashboard');
      scope.register({ id: 'app:b', keys: 'Mod+Shift+G', label: 'Go' }, jest.fn());
      const regs = await takeRegistrations(start);
      expect(regs[0]).toMatchObject({ appId: 'dashboard', scope: 'app' });
    });

    it('dispose() unregisters every handle created through the scope', async () => {
      const start = service.start({ application: createApplication('discover') });
      const scope = start.forApp();
      scope.register({ id: 'app:c', keys: 'Mod+1', label: 'One' }, jest.fn());
      scope.register({ id: 'app:d', keys: 'Mod+2', label: 'Two' }, jest.fn());
      expect(await takeRegistrations(start)).toHaveLength(2);
      scope.dispose();
      expect(await takeRegistrations(start)).toHaveLength(0);
    });

    it('buffers registrations until currentAppId$ emits a defined value', async () => {
      const app = createApplication(undefined);
      const start = service.start({ application: app });
      const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
      const scope = start.forApp();
      scope.register({ id: 'buf:a', keys: 'Mod+Shift+K', label: 'Buffered' }, jest.fn());
      expect(await takeRegistrations(start)).toHaveLength(0);
      app.currentAppId$.next('discover');
      const regs = await takeRegistrations(start);
      expect(regs[0]).toMatchObject({ id: 'buf:a', appId: 'discover', scope: 'app' });
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('forApp() called before'));
      warn.mockRestore();
    });

    it('unregister called on a buffered handle is honored once flushed', async () => {
      const app = createApplication(undefined);
      const start = service.start({ application: app });
      jest.spyOn(console, 'warn').mockImplementation(() => {});
      const scope = start.forApp();
      const handle = scope.register(
        { id: 'buf:b', keys: 'Mod+Shift+L', label: 'Buffered' },
        jest.fn()
      );
      handle.unregister();
      app.currentAppId$.next('discover');
      expect(await takeRegistrations(start)).toHaveLength(0);
    });

    it('ignores `undefined` emissions from currentAppId$ while buffered', async () => {
      const app = createApplication();
      const start = service.start({ application: app });
      jest.spyOn(console, 'warn').mockImplementation(() => {});
      const scope = start.forApp();
      scope.register({ id: 'buf:c', keys: 'Mod+Shift+M', label: 'Buffered' }, jest.fn());
      app.currentAppId$.next(undefined);
      expect(await takeRegistrations(start)).toHaveLength(0);
      app.currentAppId$.next('dashboard');
      const regs = await takeRegistrations(start);
      expect(regs[0]).toMatchObject({ appId: 'dashboard' });
    });

    it('throws when register() is called after dispose()', () => {
      const start = service.start({ application: createApplication('discover') });
      const scope = start.forApp();
      scope.dispose();
      expect(() =>
        scope.register({ id: 'after:a', keys: 'Mod+1', label: 'nope' }, jest.fn())
      ).toThrow(/after the app scope has been disposed/);
    });
  });

  describe('stop()', () => {
    it('is idempotent and safe to call without a prior start', () => {
      expect(() => service.stop()).not.toThrow();
    });

    it('completes the registrations observable after stop()', () => {
      const app = createApplication('discover');
      const start = service.start({ application: app });
      start.register({ id: 'stop:a', keys: 'Mod+S', label: 'Save' }, jest.fn());
      service.stop();
      const complete = jest.fn();
      const sub = start.getRegistrations$().subscribe({ complete });
      expect(complete).toHaveBeenCalledTimes(1);
      sub.unsubscribe();
    });
  });
});
