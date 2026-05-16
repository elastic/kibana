/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { firstValueFrom, take } from 'rxjs';
import {
  HOTKEY_OVERRIDES_LOCAL_STORAGE_KEY,
  createLocalStorageHotkeyOverridesPersistence,
} from './local_storage_hotkey_overrides_persistence';

const createMemoryStorage = (): Storage => {
  const store = new Map<string, string>();
  return {
    get length() {
      return store.size;
    },
    clear: () => store.clear(),
    getItem: (key: string) => store.get(key) ?? null,
    key: (index: number) => [...store.keys()][index] ?? null,
    removeItem: (key: string) => void store.delete(key),
    setItem: (key: string, value: string) => void store.set(key, value),
  } as Storage;
};

describe('createLocalStorageHotkeyOverridesPersistence', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('emits an empty map when storage is empty', async () => {
    const p = createLocalStorageHotkeyOverridesPersistence({
      storage: createMemoryStorage(),
      storageKey: 'kibana.test.hotkeys',
    });
    const map = await firstValueFrom(p.overrides$.pipe(take(1)));
    expect(map.size).toBe(0);
  });

  it('loads persisted overrides on construction', async () => {
    const storage = createMemoryStorage();
    storage.setItem(
      HOTKEY_OVERRIDES_LOCAL_STORAGE_KEY,
      JSON.stringify({ 'my:id': { keys: 'Mod+Shift+X' } })
    );
    const p = createLocalStorageHotkeyOverridesPersistence({ storage });
    const map = await firstValueFrom(p.overrides$.pipe(take(1)));
    expect(map.get('my:id')).toEqual({ keys: 'Mod+Shift+X' });
  });

  it('ignores malformed JSON in storage', async () => {
    const storage = createMemoryStorage();
    storage.setItem(HOTKEY_OVERRIDES_LOCAL_STORAGE_KEY, '{not json');
    const p = createLocalStorageHotkeyOverridesPersistence({ storage });
    const map = await firstValueFrom(p.overrides$.pipe(take(1)));
    expect(map.size).toBe(0);
  });

  it('setOverride merges, emits, and writes storage', async () => {
    const storage = createMemoryStorage();
    const p = createLocalStorageHotkeyOverridesPersistence({
      storage,
      storageKey: 'kibana.test.hotkeys.merge',
    });
    const emissions: number[] = [];
    const sub = p.overrides$.subscribe((m) => emissions.push(m.size));
    p.setOverride('a', { keys: 'Mod+1' });
    p.setOverride('a', { enabled: false });
    const map = await firstValueFrom(p.overrides$.pipe(take(1)));
    expect(map.get('a')).toEqual({ keys: 'Mod+1', enabled: false });
    expect(storage.getItem('kibana.test.hotkeys.merge')).toContain('Mod+1');
    sub.unsubscribe();
    expect(emissions.length).toBeGreaterThanOrEqual(2);
  });

  it('clearOverride removes one id', async () => {
    const storage = createMemoryStorage();
    const p = createLocalStorageHotkeyOverridesPersistence({
      storage,
      storageKey: 'kibana.test.hotkeys.clearOne',
    });
    p.setOverride('x', { keys: 'Mod+X' });
    p.setOverride('y', { keys: 'Mod+Y' });
    p.clearOverride('x');
    const map = await firstValueFrom(p.overrides$.pipe(take(1)));
    expect(map.has('x')).toBe(false);
    expect(map.get('y')).toEqual({ keys: 'Mod+Y' });
  });

  it('clearAll empties overrides', async () => {
    const storage = createMemoryStorage();
    const p = createLocalStorageHotkeyOverridesPersistence({
      storage,
      storageKey: 'kibana.test.hotkeys.clearAll',
    });
    p.setOverride('z', { keys: 'Mod+Z' });
    p.clearAll();
    const map = await firstValueFrom(p.overrides$.pipe(take(1)));
    expect(map.size).toBe(0);
  });
});
