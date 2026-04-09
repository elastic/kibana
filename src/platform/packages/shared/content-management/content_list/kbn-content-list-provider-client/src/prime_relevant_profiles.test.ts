/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { UserContentCommonSchema } from '@kbn/content-management-table-list-view-common';
import type { UserProfileStore } from '@kbn/content-list-provider';
import {
  collectRealUids,
  createPrimingState,
  primeRelevantProfiles,
} from './prime_relevant_profiles';

const makeItem = (
  id: string,
  overrides?: Partial<UserContentCommonSchema>
): UserContentCommonSchema => ({
  id,
  type: 'dashboard',
  updatedAt: '2024-01-01T00:00:00.000Z',
  references: [],
  attributes: { title: `Item ${id}` },
  ...overrides,
});

const createMockStore = (): jest.Mocked<UserProfileStore> => ({
  getAll: jest.fn().mockReturnValue([]),
  resolve: jest.fn().mockReturnValue(undefined),
  ensureLoaded: jest.fn().mockResolvedValue(undefined),
  merge: jest.fn(),
});

describe('collectRealUids', () => {
  it('extracts unique UIDs from items with createdBy', () => {
    const items = [
      makeItem('1', { createdBy: 'user-a' }),
      makeItem('2', { createdBy: 'user-b' }),
      makeItem('3', { createdBy: 'user-a' }),
    ];
    expect(collectRealUids(items)).toEqual(['user-a', 'user-b']);
  });

  it('excludes managed items (sentinel __managed__)', () => {
    const items = [
      makeItem('1', { createdBy: 'user-a' }),
      makeItem('2', { managed: true, createdBy: 'user-b' }),
    ];
    expect(collectRealUids(items)).toEqual(['user-a']);
  });

  it('excludes items without a creator (sentinel __no_creator__)', () => {
    const items = [makeItem('1', { createdBy: 'user-a' }), makeItem('2')];
    expect(collectRealUids(items)).toEqual(['user-a']);
  });

  it('returns empty array when all items are sentinels', () => {
    const items = [makeItem('1', { managed: true }), makeItem('2')];
    expect(collectRealUids(items)).toEqual([]);
  });

  it('returns empty array for empty items', () => {
    expect(collectRealUids([])).toEqual([]);
  });
});

describe('primeRelevantProfiles', () => {
  it('calls ensureLoaded with real UIDs from items', async () => {
    const store = createMockStore();
    const items = [makeItem('1', { createdBy: 'user-a' }), makeItem('2', { createdBy: 'user-b' })];

    const state = createPrimingState();
    await primeRelevantProfiles(items, 1, store, state);

    expect(store.ensureLoaded).toHaveBeenCalledWith(['user-a', 'user-b']);
  });

  it('never passes sentinel values to ensureLoaded', async () => {
    const store = createMockStore();
    const items = [
      makeItem('1', { managed: true }),
      makeItem('2'), // no createdBy
      makeItem('3', { createdBy: 'user-a' }),
    ];

    const state = createPrimingState();
    await primeRelevantProfiles(items, 1, store, state);

    expect(store.ensureLoaded).toHaveBeenCalledWith(['user-a']);
  });

  describe('dataset versioning', () => {
    it('is a no-op for the same dataset version', async () => {
      const store = createMockStore();
      const items = [makeItem('1', { createdBy: 'user-a' })];
      const state = createPrimingState();

      await primeRelevantProfiles(items, 1, store, state);
      store.ensureLoaded.mockClear();

      await primeRelevantProfiles(items, 1, store, state);

      expect(store.ensureLoaded).not.toHaveBeenCalled();
    });

    it('re-primes when dataset version changes', async () => {
      const store = createMockStore();
      const items = [makeItem('1', { createdBy: 'user-a' })];
      const state = createPrimingState();

      await primeRelevantProfiles(items, 1, store, state);
      store.ensureLoaded.mockClear();

      // New version — should re-check
      await primeRelevantProfiles(items, 2, store, state);

      expect(store.ensureLoaded).toHaveBeenCalledWith(['user-a']);
    });
  });

  describe('in-flight dedup', () => {
    it('single ensureLoaded per cycle for a stable universe', async () => {
      const store = createMockStore();

      let resolveCall: (() => void) | undefined;
      store.ensureLoaded.mockImplementation(
        () =>
          new Promise<void>((resolve) => {
            resolveCall = resolve;
          })
      );

      const items = [makeItem('1', { createdBy: 'user-a' })];
      const state = createPrimingState();

      // Start first call
      const p1 = primeRelevantProfiles(items, 1, store, state);
      // Same version — returns the in-flight promise
      const p2 = primeRelevantProfiles(items, 1, store, state);

      expect(store.ensureLoaded).toHaveBeenCalledTimes(1);

      // Resolve
      resolveCall!();
      await p1;
      await p2;
    });
  });

  it('does not call ensureLoaded for empty item set', async () => {
    const store = createMockStore();
    const state = createPrimingState();

    await primeRelevantProfiles([], 1, store, state);

    expect(store.ensureLoaded).not.toHaveBeenCalled();
  });

  describe('error recovery', () => {
    it('retries after a rejected ensureLoaded for the same version', async () => {
      const store = createMockStore();
      store.ensureLoaded.mockRejectedValueOnce(new Error('network'));

      const items = [makeItem('1', { createdBy: 'user-a' })];
      const state = createPrimingState();

      // First call rejects — should reset lastVersion so retry is possible.
      await primeRelevantProfiles(items, 1, store, state);
      store.ensureLoaded.mockClear();
      store.ensureLoaded.mockResolvedValue(undefined);

      // Same version — should retry because the rejection reset the guard.
      await primeRelevantProfiles(items, 1, store, state);

      expect(store.ensureLoaded).toHaveBeenCalledWith(['user-a']);
    });
  });
});
