/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject } from 'rxjs';
import type { HotkeyOverride, HotkeyOverridesPersistence } from './overrides_source';

/** @internal */
export const HOTKEY_OVERRIDES_LOCAL_STORAGE_KEY = 'kibana.core.hotkeys.overrides.v1';

/** @internal */
export interface LocalStorageHotkeyOverridesPersistenceParams {
  /** Defaults to {@link HOTKEY_OVERRIDES_LOCAL_STORAGE_KEY}. */
  readonly storageKey?: string;
  /** Defaults to `window.localStorage` when available. */
  readonly storage?: Storage;
}

const safeParseRecord = (raw: string): Record<string, HotkeyOverride> | undefined => {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return undefined;
    }
    return parsed as Record<string, HotkeyOverride>;
  } catch {
    return undefined;
  }
};

const loadInitialMap = (
  storageKey: string,
  storage: Storage | undefined
): Map<string, HotkeyOverride> => {
  if (!storage) {
    return new Map();
  }
  try {
    const raw = storage.getItem(storageKey);
    if (raw === null || raw === '') {
      return new Map();
    }
    const record = safeParseRecord(raw);
    if (!record) {
      return new Map();
    }
    return new Map(Object.entries(record));
  } catch {
    return new Map();
  }
};

const persistMap = (
  storageKey: string,
  storage: Storage | undefined,
  map: ReadonlyMap<string, HotkeyOverride>
): void => {
  if (!storage) {
    return;
  }
  try {
    storage.setItem(storageKey, JSON.stringify(Object.fromEntries(map)));
  } catch {
    // Quota, private mode, or blocked storage — overrides remain in memory only.
  }
};

/**
 * localStorage-backed {@link HotkeyOverridesPersistence}. Falls back to
 * in-memory state when storage is unavailable or writes fail.
 *
 * @internal
 */
export const createLocalStorageHotkeyOverridesPersistence = (
  params?: LocalStorageHotkeyOverridesPersistenceParams
): HotkeyOverridesPersistence => {
  const storageKey = params?.storageKey ?? HOTKEY_OVERRIDES_LOCAL_STORAGE_KEY;
  let storage: Storage | undefined = params?.storage;
  if (storage === undefined && typeof window !== 'undefined') {
    try {
      storage = window.localStorage;
    } catch {
      storage = undefined;
    }
  }

  let map = loadInitialMap(storageKey, storage);
  const subject = new BehaviorSubject<ReadonlyMap<string, HotkeyOverride>>(map);

  const emitAndPersist = (next: Map<string, HotkeyOverride>): void => {
    map = next;
    subject.next(new Map(map));
    persistMap(storageKey, storage, map);
  };

  return {
    overrides$: subject.asObservable(),
    setOverride(id: string, patch: HotkeyOverride): void {
      const next = new Map(map);
      const prev = next.get(id);
      const merged: HotkeyOverride = { ...prev, ...patch };
      next.set(id, merged);
      emitAndPersist(next);
    },
    clearOverride(id: string): void {
      if (!map.has(id)) {
        return;
      }
      const next = new Map(map);
      next.delete(id);
      emitAndPersist(next);
    },
    clearAll(): void {
      if (map.size === 0) {
        return;
      }
      emitAndPersist(new Map());
    },
  };
};
