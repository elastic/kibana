/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook, waitFor } from '@testing-library/react';
import { useUserEnrichment, type UseUserEnrichmentOptions } from './use_user_enrichment';
import type { IdentityResolver } from './use_identity_resolver';

// Mock the `useUserProfiles` hook.
const mockUseUserProfiles = jest.fn();
jest.mock('@kbn/content-management-user-profiles', () => ({
  useUserProfiles: (uids: string[], options: { enabled: boolean }) =>
    mockUseUserProfiles(uids, options),
}));

describe('useUserEnrichment', () => {
  const createMockIdentityResolver = (): IdentityResolver => ({
    getCanonical: jest.fn((v) => v),
    getDisplay: jest.fn((v) => v),
    isSame: jest.fn(),
    register: jest.fn(),
    registerAll: jest.fn(),
    clear: jest.fn(),
    version: 0,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseUserProfiles.mockReturnValue({ data: undefined });
  });

  describe('with undefined data', () => {
    it('should not fetch user profiles when data is undefined', () => {
      const identityResolver = createMockIdentityResolver();

      renderHook(() =>
        useUserEnrichment({
          data: undefined,
          identityResolver,
        })
      );

      expect(mockUseUserProfiles).toHaveBeenCalledWith([], { enabled: false });
    });

    it('should not register any mappings when data is undefined', () => {
      const identityResolver = createMockIdentityResolver();

      renderHook(() =>
        useUserEnrichment({
          data: undefined,
          identityResolver,
        })
      );

      expect(identityResolver.register).not.toHaveBeenCalled();
      expect(identityResolver.registerAll).not.toHaveBeenCalled();
    });
  });

  describe('with empty items', () => {
    it('should not fetch user profiles when items array is empty', () => {
      const identityResolver = createMockIdentityResolver();

      renderHook(() =>
        useUserEnrichment({
          data: { items: [] },
          identityResolver,
        })
      );

      expect(mockUseUserProfiles).toHaveBeenCalledWith([], { enabled: false });
    });
  });

  describe('with server-side enriched items (createdByUser/updatedByUser)', () => {
    it('should not fetch user profiles when items have createdByUser', () => {
      const identityResolver = createMockIdentityResolver();

      const data = {
        items: [
          {
            id: 'item-1',
            title: 'Test',
            type: 'dashboard',
            createdBy: 'u_abc123',
            createdByUser: { username: 'john.doe', email: 'john@elastic.co' },
          },
        ],
      };

      renderHook(() =>
        useUserEnrichment({
          data: data as UseUserEnrichmentOptions['data'],
          identityResolver,
        })
      );

      expect(mockUseUserProfiles).toHaveBeenCalledWith([], { enabled: false });
    });

    it('should register createdByUser username and email with resolver', async () => {
      const identityResolver = createMockIdentityResolver();

      const data = {
        items: [
          {
            id: 'item-1',
            title: 'Test',
            type: 'dashboard',
            createdBy: 'u_abc123',
            createdByUser: { username: 'john.doe', email: 'john@elastic.co' },
          },
        ],
      };

      renderHook(() =>
        useUserEnrichment({
          data: data as UseUserEnrichmentOptions['data'],
          identityResolver,
        })
      );

      await waitFor(() => {
        expect(identityResolver.register).toHaveBeenCalledWith('john.doe', 'u_abc123');
        expect(identityResolver.register).toHaveBeenCalledWith('john@elastic.co', 'u_abc123');
      });
    });

    it('should register updatedByUser username and email with resolver', async () => {
      const identityResolver = createMockIdentityResolver();

      const data = {
        items: [
          {
            id: 'item-1',
            title: 'Test',
            type: 'dashboard',
            updatedBy: 'u_xyz789',
            updatedByUser: { username: 'jane.doe', email: 'jane@elastic.co' },
          },
        ],
      };

      renderHook(() =>
        useUserEnrichment({
          data: data as UseUserEnrichmentOptions['data'],
          identityResolver,
        })
      );

      await waitFor(() => {
        expect(identityResolver.register).toHaveBeenCalledWith('jane.doe', 'u_xyz789');
        expect(identityResolver.register).toHaveBeenCalledWith('jane@elastic.co', 'u_xyz789');
      });
    });

    it('should register resolvedFilters with registerAll', async () => {
      const identityResolver = createMockIdentityResolver();

      const data = {
        items: [
          {
            id: 'item-1',
            title: 'Test',
            type: 'dashboard',
            createdByUser: { username: 'john.doe' },
          },
        ],
        resolvedFilters: {
          createdBy: {
            'john.doe': 'u_abc123',
            'jane.doe': 'u_xyz789',
          },
        },
      };

      renderHook(() =>
        useUserEnrichment({
          data: data as UseUserEnrichmentOptions['data'],
          identityResolver,
        })
      );

      await waitFor(() => {
        expect(identityResolver.registerAll).toHaveBeenCalledWith({
          'john.doe': 'u_abc123',
          'jane.doe': 'u_xyz789',
        });
      });
    });

    it('should handle items without email in createdByUser', async () => {
      const identityResolver = createMockIdentityResolver();

      const data = {
        items: [
          {
            id: 'item-1',
            title: 'Test',
            type: 'dashboard',
            createdBy: 'u_abc123',
            createdByUser: { username: 'john.doe' }, // No email.
          },
        ],
      };

      renderHook(() =>
        useUserEnrichment({
          data: data as UseUserEnrichmentOptions['data'],
          identityResolver,
        })
      );

      await waitFor(() => {
        expect(identityResolver.register).toHaveBeenCalledWith('john.doe', 'u_abc123');
        expect(identityResolver.register).toHaveBeenCalledTimes(1); // Only username, no email.
      });
    });

    it('should skip items without createdBy UID', async () => {
      const identityResolver = createMockIdentityResolver();

      const data = {
        items: [
          {
            id: 'item-1',
            title: 'Test',
            type: 'dashboard',
            // No createdBy.
            createdByUser: { username: 'john.doe' },
          },
        ],
      };

      renderHook(() =>
        useUserEnrichment({
          data: data as UseUserEnrichmentOptions['data'],
          identityResolver,
        })
      );

      await waitFor(() => {
        // Should not register without both createdBy and createdByUser.
        expect(identityResolver.register).not.toHaveBeenCalled();
      });
    });
  });

  describe('with client-side enrichment (fetching user profiles)', () => {
    it('should collect unique UIDs from createdBy and updatedBy', () => {
      const identityResolver = createMockIdentityResolver();

      const data = {
        items: [
          {
            id: 'item-1',
            title: 'Test 1',
            type: 'dashboard',
            createdBy: 'u_abc123',
            updatedBy: 'u_xyz789',
          },
          {
            id: 'item-2',
            title: 'Test 2',
            type: 'dashboard',
            createdBy: 'u_abc123',
            updatedBy: 'u_def456',
          },
        ],
      };

      renderHook(() =>
        useUserEnrichment({
          data: data as UseUserEnrichmentOptions['data'],
          identityResolver,
        })
      );

      // Should request unique UIDs.
      expect(mockUseUserProfiles).toHaveBeenCalledWith(
        expect.arrayContaining(['u_abc123', 'u_xyz789', 'u_def456']),
        { enabled: true }
      );
    });

    it('should register fetched user profiles with resolver', async () => {
      const identityResolver = createMockIdentityResolver();

      const data = {
        items: [{ id: 'item-1', title: 'Test', type: 'dashboard', createdBy: 'u_abc123' }],
      };

      mockUseUserProfiles.mockReturnValue({
        data: [
          {
            uid: 'u_abc123',
            user: { username: 'john.doe', email: 'john@elastic.co' },
          },
        ],
      });

      renderHook(() =>
        useUserEnrichment({
          data: data as UseUserEnrichmentOptions['data'],
          identityResolver,
        })
      );

      await waitFor(() => {
        expect(identityResolver.register).toHaveBeenCalledWith('john.doe', 'u_abc123');
        expect(identityResolver.register).toHaveBeenCalledWith('john@elastic.co', 'u_abc123');
      });
    });

    it('should handle profiles without email', async () => {
      const identityResolver = createMockIdentityResolver();

      const data = {
        items: [{ id: 'item-1', title: 'Test', type: 'dashboard', createdBy: 'u_abc123' }],
      };

      mockUseUserProfiles.mockReturnValue({
        data: [
          {
            uid: 'u_abc123',
            user: { username: 'john.doe' }, // No email.
          },
        ],
      });

      renderHook(() =>
        useUserEnrichment({
          data: data as UseUserEnrichmentOptions['data'],
          identityResolver,
        })
      );

      await waitFor(() => {
        expect(identityResolver.register).toHaveBeenCalledWith('john.doe', 'u_abc123');
        expect(identityResolver.register).toHaveBeenCalledTimes(1);
      });
    });

    it('should handle profiles without username', async () => {
      const identityResolver = createMockIdentityResolver();

      const data = {
        items: [{ id: 'item-1', title: 'Test', type: 'dashboard', createdBy: 'u_abc123' }],
      };

      mockUseUserProfiles.mockReturnValue({
        data: [
          {
            uid: 'u_abc123',
            user: { email: 'john@elastic.co' }, // No username.
          },
        ],
      });

      renderHook(() =>
        useUserEnrichment({
          data: data as UseUserEnrichmentOptions['data'],
          identityResolver,
        })
      );

      await waitFor(() => {
        // Only email registered since no username.
        expect(identityResolver.register).toHaveBeenCalledWith('john@elastic.co', 'u_abc123');
        expect(identityResolver.register).toHaveBeenCalledTimes(1);
      });
    });

    it('should not register when profile has no user info', async () => {
      const identityResolver = createMockIdentityResolver();

      const data = {
        items: [{ id: 'item-1', title: 'Test', type: 'dashboard', createdBy: 'u_abc123' }],
      };

      mockUseUserProfiles.mockReturnValue({
        data: [
          {
            uid: 'u_abc123',
            // No user object.
          },
        ],
      });

      renderHook(() =>
        useUserEnrichment({
          data: data as UseUserEnrichmentOptions['data'],
          identityResolver,
        })
      );

      await waitFor(() => {
        expect(identityResolver.register).not.toHaveBeenCalled();
      });
    });
  });
});
