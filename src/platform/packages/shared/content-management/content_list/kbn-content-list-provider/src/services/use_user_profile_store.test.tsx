/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { UserProfileStoreProvider, useUserProfileStoreContext } from './use_user_profile_store';
import type { ContentListUserProfilesServices, UserProfileEntry } from './types';

// ─────────────────────────────────────────────────────────────────────────────
// Fixtures.
// ─────────────────────────────────────────────────────────────────────────────

const jane: UserProfileEntry = {
  uid: 'u_jane',
  user: { username: 'jane', email: 'jane@example.com', full_name: 'Jane Doe' },
  email: 'jane@example.com',
  fullName: 'Jane Doe',
};
const diego: UserProfileEntry = {
  uid: 'u_diego',
  user: {
    username: 'diego.herrera',
    email: 'diego.herrera@example.elastic.co',
    full_name: 'Diego Herrera',
  },
  email: 'diego.herrera@example.elastic.co',
  fullName: 'Diego Herrera',
};

const createMockService = (
  profiles: UserProfileEntry[] = [jane, diego]
): ContentListUserProfilesServices & {
  bulkResolve: jest.Mock;
  suggest: jest.Mock;
} => ({
  bulkResolve: jest.fn(async (uids: string[]) => profiles.filter((p) => uids.includes(p.uid))),
  suggest: jest.fn(async (query: string) =>
    profiles.filter(
      (p) =>
        p.email.toLowerCase().includes(query.toLowerCase()) ||
        p.fullName.toLowerCase().includes(query.toLowerCase())
    )
  ),
});

const createWrapper =
  (service: ContentListUserProfilesServices | undefined) =>
  ({ children }: { children: React.ReactNode }) =>
    (
      <UserProfileStoreProvider service={service} queryKeyScope="test">
        {children}
      </UserProfileStoreProvider>
    );

// ─────────────────────────────────────────────────────────────────────────────
// Tests.
// ─────────────────────────────────────────────────────────────────────────────

describe('UserProfileStore', () => {
  describe('when no service is provided', () => {
    it('returns `undefined`', () => {
      const { result } = renderHook(useUserProfileStoreContext, {
        wrapper: createWrapper(undefined),
      });
      expect(result.current).toBeUndefined();
    });
  });

  describe('ensureLoaded', () => {
    it('fetches missing UIDs via `bulkResolve`', async () => {
      const service = createMockService();
      const { result } = renderHook(useUserProfileStoreContext, {
        wrapper: createWrapper(service),
      });

      await act(async () => {
        await result.current!.ensureLoaded(['u_jane', 'u_diego']);
      });

      expect(service.bulkResolve).toHaveBeenCalledWith(['u_jane', 'u_diego']);
      expect(result.current!.resolve('u_jane')).toEqual(jane);
      expect(result.current!.resolve('u_diego')).toEqual(diego);
    });

    it('does not re-fetch UIDs already in the cache', async () => {
      const service = createMockService();
      const { result } = renderHook(useUserProfileStoreContext, {
        wrapper: createWrapper(service),
      });

      await act(async () => {
        await result.current!.ensureLoaded(['u_jane']);
      });
      service.bulkResolve.mockClear();

      await act(async () => {
        await result.current!.ensureLoaded(['u_jane', 'u_diego']);
      });

      expect(service.bulkResolve).toHaveBeenCalledWith(['u_diego']);
    });
  });

  describe('merge', () => {
    it('adds pre-resolved entries to the cache without a network call', async () => {
      const service = createMockService();
      const { result } = renderHook(useUserProfileStoreContext, {
        wrapper: createWrapper(service),
      });

      act(() => {
        result.current!.merge([jane, diego]);
      });

      expect(service.bulkResolve).not.toHaveBeenCalled();
      expect(result.current!.resolve('u_jane')).toEqual(jane);
      expect(result.current!.resolve('u_diego')).toEqual(diego);
      expect(result.current!.getAll()).toHaveLength(2);
    });

    it('does not overwrite existing entries', async () => {
      const service = createMockService();
      const { result } = renderHook(useUserProfileStoreContext, {
        wrapper: createWrapper(service),
      });

      await act(async () => {
        await result.current!.ensureLoaded(['u_jane']);
      });
      const originalJane = result.current!.resolve('u_jane');

      const modifiedJane: UserProfileEntry = { ...jane, fullName: 'Jane Modified' };
      act(() => {
        result.current!.merge([modifiedJane]);
      });

      expect(result.current!.resolve('u_jane')).toEqual(originalJane);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // resolveDisplayValues — the critical path that caused the 404.
  //
  // These tests verify that `suggest` is only called when the display value
  // genuinely cannot be matched in the local cache. This is the "comforter"
  // test: every path that adds profiles to the cache must prevent spurious
  // suggest calls.
  // ─────────────────────────────────────────────────────────────────────────

  describe('resolveDisplayValues', () => {
    it('calls `suggest` when the email is NOT in the cache', async () => {
      const service = createMockService();
      const { result } = renderHook(useUserProfileStoreContext, {
        wrapper: createWrapper(service),
      });

      await act(async () => {
        await result.current!.resolveDisplayValues(['jane@example.com']);
      });

      expect(service.suggest).toHaveBeenCalledWith('jane@example.com');
    });

    it('skips `suggest` when the email IS in the cache (via ensureLoaded)', async () => {
      const service = createMockService();
      const { result } = renderHook(useUserProfileStoreContext, {
        wrapper: createWrapper(service),
      });

      await act(async () => {
        await result.current!.ensureLoaded(['u_jane']);
      });
      service.suggest.mockClear();

      await act(async () => {
        await result.current!.resolveDisplayValues(['jane@example.com']);
      });

      expect(service.suggest).not.toHaveBeenCalled();
    });

    it('skips `suggest` when the email IS in the cache (via merge)', async () => {
      const service = createMockService();
      const { result } = renderHook(useUserProfileStoreContext, {
        wrapper: createWrapper(service),
      });

      act(() => {
        result.current!.merge([jane]);
      });

      await act(async () => {
        await result.current!.resolveDisplayValues(['jane@example.com']);
      });

      expect(service.suggest).not.toHaveBeenCalled();
    });

    it('matches case-insensitively on email', async () => {
      const service = createMockService();
      const { result } = renderHook(useUserProfileStoreContext, {
        wrapper: createWrapper(service),
      });

      act(() => {
        result.current!.merge([jane]);
      });

      await act(async () => {
        await result.current!.resolveDisplayValues(['Jane@Example.COM']);
      });

      expect(service.suggest).not.toHaveBeenCalled();
    });

    it('matches case-insensitively on fullName', async () => {
      const service = createMockService();
      const { result } = renderHook(useUserProfileStoreContext, {
        wrapper: createWrapper(service),
      });

      act(() => {
        result.current!.merge([jane]);
      });

      await act(async () => {
        await result.current!.resolveDisplayValues(['jane doe']);
      });

      expect(service.suggest).not.toHaveBeenCalled();
    });

    it('matches on UID', async () => {
      const service = createMockService();
      const { result } = renderHook(useUserProfileStoreContext, {
        wrapper: createWrapper(service),
      });

      act(() => {
        result.current!.merge([jane]);
      });

      await act(async () => {
        await result.current!.resolveDisplayValues(['u_jane']);
      });

      expect(service.suggest).not.toHaveBeenCalled();
    });

    it('matches case-insensitively on username', async () => {
      const service = createMockService();
      const { result } = renderHook(useUserProfileStoreContext, {
        wrapper: createWrapper(service),
      });

      act(() => {
        result.current!.merge([jane]);
      });

      await act(async () => {
        await result.current!.resolveDisplayValues(['Jane']);
      });

      expect(service.suggest).not.toHaveBeenCalled();
    });

    it('is a no-op when `suggest` is not available on the service', async () => {
      const service: ContentListUserProfilesServices = {
        bulkResolve: jest.fn(async () => []),
      };
      const { result } = renderHook(useUserProfileStoreContext, {
        wrapper: createWrapper(service),
      });

      await act(async () => {
        await result.current!.resolveDisplayValues(['jane@example.com']);
      });

      expect(service.bulkResolve).not.toHaveBeenCalled();
    });

    it('only calls `suggest` for values not already cached', async () => {
      const service = createMockService();
      const { result } = renderHook(useUserProfileStoreContext, {
        wrapper: createWrapper(service),
      });

      act(() => {
        result.current!.merge([jane]);
      });

      await act(async () => {
        await result.current!.resolveDisplayValues([
          'jane@example.com',
          'diego.herrera@example.elastic.co',
        ]);
      });

      expect(service.suggest).toHaveBeenCalledTimes(1);
      expect(service.suggest).toHaveBeenCalledWith('diego.herrera@example.elastic.co');
    });

    it('merges suggest results into the cache', async () => {
      const service = createMockService();
      const { result } = renderHook(useUserProfileStoreContext, {
        wrapper: createWrapper(service),
      });

      await act(async () => {
        await result.current!.resolveDisplayValues(['jane@example.com']);
      });

      expect(result.current!.resolve('u_jane')).toEqual(jane);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Popover click scenario — the exact flow that triggered the 404.
  //
  // Simulates: getFacets resolves profiles → merge seeds cache →
  // user clicks → resolveDisplayValues checks cache → no suggest call.
  // ─────────────────────────────────────────────────────────────────────────

  describe('popover click scenario (getFacets → merge → resolveDisplayValues)', () => {
    it('does not call `suggest` when facets-resolved profiles are merged before toggle', async () => {
      const service = createMockService();
      const { result } = renderHook(useUserProfileStoreContext, {
        wrapper: createWrapper(service),
      });

      // Step 1: getFacets resolves profiles (simulated by bulkResolve).
      const facetProfiles = await service.bulkResolve(['u_diego']);
      service.bulkResolve.mockClear();
      service.suggest.mockClear();

      // Step 2: UserFieldFilterRenderer merges them into the store.
      act(() => {
        result.current!.merge(facetProfiles);
      });

      // Step 3: User clicks "Diego Herrera" → toggle writes email to query text →
      //         useResolveQueryDisplayValues calls resolveDisplayValues.
      await act(async () => {
        await result.current!.resolveDisplayValues(['diego.herrera@example.elastic.co']);
      });

      // No suggest call — the profile was already in the cache.
      expect(service.suggest).not.toHaveBeenCalled();
      // No extra bulkResolve call either.
      expect(service.bulkResolve).not.toHaveBeenCalled();
    });
  });
});
