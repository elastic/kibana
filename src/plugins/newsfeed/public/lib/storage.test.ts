/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { NewsfeedStorage, getStorageKey } from './storage';
import { take } from 'rxjs';

describe('NewsfeedStorage', () => {
  const storagePrefix = 'test';
  let mockStorage: Record<string, any>;
  let storage: NewsfeedStorage;

  const getKey = (key: string) => getStorageKey(storagePrefix, key);

  beforeAll(() => {
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: (key: string) => {
          return mockStorage[key] || null;
        },
        setItem: (key: string, value: string) => {
          mockStorage[key] = value;
        },
      },
      writable: true,
    });
  });

  afterAll(() => {
    delete (window as any).localStorage;
  });

  beforeEach(() => {
    mockStorage = {};
    storage = new NewsfeedStorage(storagePrefix);
  });

  describe('getLastFetchTime', () => {
    it('returns undefined if not set', () => {
      expect(storage.getLastFetchTime()).toBeUndefined();
    });

    it('returns the last value that was set', () => {
      const date = new Date();
      storage.setLastFetchTime(date);
      expect(storage.getLastFetchTime()!.getTime()).toEqual(date.getTime());
    });
  });

  describe('setFetchedItems', () => {
    it('updates the value in the storage', () => {
      storage.setFetchedItems(['a', 'b', 'c']);
      expect(JSON.parse(localStorage.getItem(getKey('readStatus'))!)).toEqual({
        a: false,
        b: false,
        c: false,
      });
    });

    it('preserves the read status if present', () => {
      const initialValue = { a: true, b: false };
      window.localStorage.setItem(getKey('readStatus'), JSON.stringify(initialValue));
      storage.setFetchedItems(['a', 'b', 'c']);
      expect(JSON.parse(localStorage.getItem(getKey('readStatus'))!)).toEqual({
        a: true,
        b: false,
        c: false,
      });
    });

    it('removes the old keys from the storage', () => {
      const initialValue = { a: true, b: false, old: false };
      window.localStorage.setItem(getKey('readStatus'), JSON.stringify(initialValue));
      storage.setFetchedItems(['a', 'b', 'c']);
      expect(JSON.parse(localStorage.getItem(getKey('readStatus'))!)).toEqual({
        a: true,
        b: false,
        c: false,
      });
    });
  });

  describe('markItemsAsRead', () => {
    it('flags the entries as read', () => {
      const initialValue = { a: true, b: false, c: false };
      window.localStorage.setItem(getKey('readStatus'), JSON.stringify(initialValue));
      storage.markItemsAsRead(['b']);
      expect(JSON.parse(localStorage.getItem(getKey('readStatus'))!)).toEqual({
        a: true,
        b: true,
        c: false,
      });
    });

    it('add the entries when not present', () => {
      const initialValue = { a: true, b: false, c: false };
      window.localStorage.setItem(getKey('readStatus'), JSON.stringify(initialValue));
      storage.markItemsAsRead(['b', 'new']);
      expect(JSON.parse(localStorage.getItem(getKey('readStatus'))!)).toEqual({
        a: true,
        b: true,
        c: false,
        new: true,
      });
    });
  });

  describe('isAnyUnread', () => {
    it('returns true if any item was not read', () => {
      storage.setFetchedItems(['a', 'b', 'c']);
      storage.markItemsAsRead(['a']);
      expect(storage.isAnyUnread()).toBe(true);
    });

    it('returns true if all item are unread', () => {
      storage.setFetchedItems(['a', 'b', 'c']);
      expect(storage.isAnyUnread()).toBe(true);
    });

    it('returns false if all item are unread', () => {
      storage.setFetchedItems(['a', 'b', 'c']);
      storage.markItemsAsRead(['a', 'b', 'c']);
      expect(storage.isAnyUnread()).toBe(false);
    });

    it('loads the value initially present in localStorage', () => {
      const initialValue = { a: true, b: false };
      window.localStorage.setItem(getKey('readStatus'), JSON.stringify(initialValue));
      storage = new NewsfeedStorage(storagePrefix);
      expect(storage.isAnyUnread()).toBe(true);
    });
  });

  describe('isAnyUnread$', () => {
    it('emits an initial value at subscription', async () => {
      const initialValue = { a: true, b: false, c: false };
      window.localStorage.setItem(getKey('readStatus'), JSON.stringify(initialValue));
      storage = new NewsfeedStorage(storagePrefix);

      expect(await storage.isAnyUnread$().pipe(take(1)).toPromise()).toBe(true);
    });

    it('emits when `setFetchedItems` is called', () => {
      const emissions: boolean[] = [];
      storage.isAnyUnread$().subscribe((unread) => emissions.push(unread));

      storage.setFetchedItems(['a', 'b', 'c']);
      expect(emissions).toEqual([false, true]);
    });

    it('emits when `markItemsAsRead` is called', () => {
      const emissions: boolean[] = [];
      storage.isAnyUnread$().subscribe((unread) => emissions.push(unread));

      storage.setFetchedItems(['a', 'b', 'c']);
      storage.markItemsAsRead(['a', 'b']);
      storage.markItemsAsRead(['c']);
      expect(emissions).toEqual([false, true, true, false]);
    });
  });
});
