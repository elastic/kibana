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
} => ({
  bulkResolve: jest.fn(async (uids: string[]) => profiles.filter((p) => uids.includes(p.uid))),
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
});
