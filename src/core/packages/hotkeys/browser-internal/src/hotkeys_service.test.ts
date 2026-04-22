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
import type { HotkeyOverride, HotkeyOverridesSource } from './overrides_source';

const createApplication = (initialAppId?: string) => {
  const currentAppId$ = new BehaviorSubject<string | undefined>(initialAppId);
  return { currentAppId$ };
};

const createOverridesSource = (
  initial: ReadonlyMap<string, HotkeyOverride> = new Map()
): HotkeyOverridesSource & {
  next: (overrides: ReadonlyMap<string, HotkeyOverride>) => void;
} => {
  const subject = new BehaviorSubject<ReadonlyMap<string, HotkeyOverride>>(initial);
  return {
    overrides$: subject.asObservable(),
    next: (overrides) => subject.next(overrides),
  };
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

    it('stamps defaultKeys from the declared keys on the projected registration', async () => {
      const start = service.start({ application: createApplication() });
      start.register({ id: 'def:a', keys: 'Mod+S', label: 'Save' }, jest.fn());
      const regs = await takeRegistrations(start);
      expect(regs[0]).toMatchObject({ keys: 'Mod+S', defaultKeys: 'Mod+S' });
    });

    it('ignores a caller-supplied defaultKeys and derives it from keys', async () => {
      const start = service.start({ application: createApplication() });
      start.register(
        {
          id: 'def:b',
          keys: 'Mod+S',
          defaultKeys: 'Mod+Shift+S',
          label: 'Save',
        },
        jest.fn()
      );
      const regs = await takeRegistrations(start);
      expect(regs[0]).toMatchObject({ keys: 'Mod+S', defaultKeys: 'Mod+S' });
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

    it('preserves defaultKeys across updates', async () => {
      const start = service.start({ application: createApplication() });
      const handle = start.register(
        { id: 'upd:b', keys: 'Mod+S', label: 'Save', scope: 'global' },
        jest.fn()
      );
      handle.update({ label: 'Save all' });
      const regs = await takeRegistrations(start);
      expect(regs[0]).toMatchObject({
        id: 'upd:b',
        keys: 'Mod+S',
        defaultKeys: 'Mod+S',
        label: 'Save all',
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

  describe('overrides', () => {
    it('honors an override that is present at registration time', () => {
      const overrides = createOverridesSource(new Map([['ov:a', { keys: 'Mod+Shift+S' }]]));
      const start = service.start({ application: createApplication(), overrides });
      const handler = jest.fn();
      start.register({ id: 'ov:a', keys: 'Mod+S', label: 'Save', scope: 'global' }, handler);

      document.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'S', ctrlKey: true, bubbles: true })
      );
      expect(handler).not.toHaveBeenCalled();

      document.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'S', ctrlKey: true, shiftKey: true, bubbles: true })
      );
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('exposes the overridden chord on the projected registration but preserves defaultKeys', async () => {
      const overrides = createOverridesSource(new Map([['ov:b', { keys: 'Mod+Shift+S' }]]));
      const start = service.start({ application: createApplication(), overrides });
      start.register({ id: 'ov:b', keys: 'Mod+S', label: 'Save', scope: 'global' }, jest.fn());
      const regs = await takeRegistrations(start);
      expect(regs[0]).toMatchObject({
        id: 'ov:b',
        keys: 'Mod+Shift+S',
        defaultKeys: 'Mod+S',
      });
    });

    it('re-binds the chord when the overrides source emits a new mapping', () => {
      const overrides = createOverridesSource();
      const start = service.start({ application: createApplication(), overrides });
      const handler = jest.fn();
      start.register({ id: 'ov:c', keys: 'Mod+S', label: 'Save', scope: 'global' }, handler);

      document.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'S', ctrlKey: true, bubbles: true })
      );
      expect(handler).toHaveBeenCalledTimes(1);

      overrides.next(new Map([['ov:c', { keys: 'Mod+Alt+S' }]]));

      document.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'S', ctrlKey: true, bubbles: true })
      );
      expect(handler).toHaveBeenCalledTimes(1);

      document.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'S', ctrlKey: true, altKey: true, bubbles: true })
      );
      expect(handler).toHaveBeenCalledTimes(2);
    });

    it('restores the declared chord when an override is cleared', () => {
      const overrides = createOverridesSource(new Map([['ov:d', { keys: 'Mod+Alt+S' }]]));
      const start = service.start({ application: createApplication(), overrides });
      const handler = jest.fn();
      start.register({ id: 'ov:d', keys: 'Mod+S', label: 'Save', scope: 'global' }, handler);

      document.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'S', ctrlKey: true, bubbles: true })
      );
      expect(handler).not.toHaveBeenCalled();

      overrides.next(new Map());

      document.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'S', ctrlKey: true, bubbles: true })
      );
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('applies an override of `enabled` without re-registering the chord', async () => {
      const overrides = createOverridesSource();
      const start = service.start({ application: createApplication(), overrides });
      const handler = jest.fn();
      start.register({ id: 'ov:e', keys: 'Mod+S', label: 'Save', scope: 'global' }, handler);

      overrides.next(new Map([['ov:e', { enabled: false }]]));

      document.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'S', ctrlKey: true, bubbles: true })
      );
      expect(handler).not.toHaveBeenCalled();

      const regs = await takeRegistrations(start);
      expect(regs[0]).toMatchObject({ id: 'ov:e', keys: 'Mod+S', enabled: false });
    });

    it('leaves untouched entries alone when only one override changes', async () => {
      const overrides = createOverridesSource();
      const start = service.start({ application: createApplication(), overrides });
      start.register({ id: 'ov:f', keys: 'Mod+S', label: 'Save', scope: 'global' }, jest.fn());
      start.register({ id: 'ov:g', keys: 'Mod+K', label: 'Palette', scope: 'global' }, jest.fn());

      overrides.next(new Map([['ov:f', { keys: 'Mod+Alt+S' }]]));

      const regs = await takeRegistrations(start);
      expect(regs.find((r) => r.id === 'ov:f')).toMatchObject({ keys: 'Mod+Alt+S' });
      expect(regs.find((r) => r.id === 'ov:g')).toMatchObject({ keys: 'Mod+K' });
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
