/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { LocalStorageNotificationStateStore } from './local_storage_state_store';

const GLOBAL_READ_KEY = 'core.notifications.events.readIds';
const GLOBAL_PINNED_KEY = 'core.notifications.events.pinnedIds';
const SPACE_READ_KEY = 'core.notifications.events.default.readIds';

describe('LocalStorageNotificationStateStore', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  describe('preload', () => {
    it('resolves without doing anything (localStorage reads are lazy)', async () => {
      const store = new LocalStorageNotificationStateStore();
      await expect(store.preload()).resolves.toBeUndefined();
    });
  });

  describe('getReadIds / getPinnedIds', () => {
    it('returns an empty set when storage is empty', () => {
      const store = new LocalStorageNotificationStateStore();
      expect(Array.from(store.getReadIds(undefined))).toEqual([]);
      expect(Array.from(store.getPinnedIds(undefined))).toEqual([]);
    });

    it('hydrates from localStorage on first access', () => {
      window.localStorage.setItem(GLOBAL_READ_KEY, JSON.stringify(['a', 'b', 'c']));
      const store = new LocalStorageNotificationStateStore();
      expect(Array.from(store.getReadIds(undefined)).sort()).toEqual(['a', 'b', 'c']);
    });

    it('returns an empty set when stored JSON is corrupt', () => {
      window.localStorage.setItem(GLOBAL_READ_KEY, '{not json');
      const store = new LocalStorageNotificationStateStore();
      expect(Array.from(store.getReadIds(undefined))).toEqual([]);
    });

    it('returns an empty set when stored value is not a string array', () => {
      window.localStorage.setItem(GLOBAL_READ_KEY, JSON.stringify({ a: 1 }));
      const store = new LocalStorageNotificationStateStore();
      expect(Array.from(store.getReadIds(undefined))).toEqual([]);
    });
  });

  describe('mutations', () => {
    it('markRead adds and persists to localStorage', async () => {
      const store = new LocalStorageNotificationStateStore();
      await store.markRead('evt-1', undefined);
      expect(Array.from(store.getReadIds(undefined))).toEqual(['evt-1']);
      expect(JSON.parse(window.localStorage.getItem(GLOBAL_READ_KEY)!)).toEqual(['evt-1']);
    });

    it('markUnread removes and persists', async () => {
      const store = new LocalStorageNotificationStateStore();
      await store.markRead('evt-1', undefined);
      await store.markUnread('evt-1', undefined);
      expect(Array.from(store.getReadIds(undefined))).toEqual([]);
      expect(JSON.parse(window.localStorage.getItem(GLOBAL_READ_KEY)!)).toEqual([]);
    });

    it('pin and unpin maintain a separate set', async () => {
      const store = new LocalStorageNotificationStateStore();
      await store.pin('evt-1', undefined);
      await store.pin('evt-2', undefined);
      await store.unpin('evt-1', undefined);
      expect(Array.from(store.getPinnedIds(undefined))).toEqual(['evt-2']);
      expect(JSON.parse(window.localStorage.getItem(GLOBAL_PINNED_KEY)!)).toEqual(['evt-2']);
    });

    it('repeated markRead is idempotent', async () => {
      const store = new LocalStorageNotificationStateStore();
      await store.markRead('evt-1', undefined);
      await store.markRead('evt-1', undefined);
      expect(Array.from(store.getReadIds(undefined))).toEqual(['evt-1']);
    });

    it('mutations are reflected synchronously in the next getReadIds call', async () => {
      const store = new LocalStorageNotificationStateStore();
      const promise = store.markRead('evt-1', undefined);
      // The in-memory subject is updated synchronously, before the Promise resolves.
      expect(Array.from(store.getReadIds(undefined))).toEqual(['evt-1']);
      await promise;
    });
  });

  describe('observables', () => {
    it('readIds$ emits the current set immediately and on each mutation', async () => {
      const store = new LocalStorageNotificationStateStore();
      const emissions: string[][] = [];
      const sub = store.readIds$(undefined).subscribe((set) => {
        emissions.push(Array.from(set));
      });
      await store.markRead('a', undefined);
      await store.markRead('b', undefined);
      await store.markUnread('a', undefined);
      sub.unsubscribe();
      expect(emissions).toEqual([[], ['a'], ['a', 'b'], ['b']]);
    });
  });

  describe('per-scope isolation', () => {
    it('marking read in space A does not affect global or other spaces', async () => {
      const store = new LocalStorageNotificationStateStore();
      await store.markRead('evt-1', 'default');
      expect(Array.from(store.getReadIds('default'))).toEqual(['evt-1']);
      expect(Array.from(store.getReadIds(undefined))).toEqual([]);
      expect(Array.from(store.getReadIds('other-space'))).toEqual([]);
      expect(JSON.parse(window.localStorage.getItem(SPACE_READ_KEY)!)).toEqual(['evt-1']);
    });

    it('hydrates the correct bucket from localStorage on first access', () => {
      window.localStorage.setItem(SPACE_READ_KEY, JSON.stringify(['x']));
      const store = new LocalStorageNotificationStateStore();
      expect(Array.from(store.getReadIds('default'))).toEqual(['x']);
      expect(Array.from(store.getReadIds(undefined))).toEqual([]);
    });
  });

  describe('spaceId sanitization', () => {
    it.each([
      ['contains dot', 'evil.space'],
      ['contains slash', 'evil/space'],
      ['contains space', 'evil space'],
      ['empty string', ''],
    ])('rejects spaceId that %s', (_label, badId) => {
      const store = new LocalStorageNotificationStateStore();
      expect(() => store.getReadIds(badId)).toThrow(/Invalid spaceId/);
    });

    it.each(['default', 'space-1', 'space_2', 'Space3'])('accepts spaceId "%s"', (id) => {
      const store = new LocalStorageNotificationStateStore();
      expect(() => store.getReadIds(id)).not.toThrow();
    });
  });
});
