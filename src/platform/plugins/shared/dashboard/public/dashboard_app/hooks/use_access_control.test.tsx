/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { coreServices } from '../../services/kibana_services';
import type { SavedObjectAccessControl } from '@kbn/core/server';
import { useAccessControl } from './use_access_control';
import { renderHook, waitFor } from '@testing-library/react';

describe('useAccessControl', () => {
  let mockGetCurrentUser: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    mockGetCurrentUser = jest.fn().mockResolvedValue({
      profile_uid: 'user-id',
      roles: [],
    });

    coreServices.security = {
      authc: {
        getCurrentUser: mockGetCurrentUser,
      },
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns correct values when accessControl is undefined and current user is equal to createdBy', async () => {
    const { result } = renderHook(() =>
      useAccessControl({ accessControl: undefined, createdBy: 'user-id' })
    );

    expect(result.current.isInEditAccessMode).toBe(true);

    await waitFor(() => {
      expect(result.current.canManageAccessControl).toBe(true);
    });
  });

  it('returns correct values when accessControl is undefined and current user is not equal to createdBy', async () => {
    const { result } = renderHook(() =>
      useAccessControl({ accessControl: undefined, createdBy: 'user-id2' })
    );

    expect(result.current.isInEditAccessMode).toBe(true);

    await waitFor(() => {
      expect(result.current.canManageAccessControl).toBe(false);
    });
  });

  it('returns correct values when accessControl is undefined and current user is not equal to createdBy but is an admin', async () => {
    mockGetCurrentUser.mockResolvedValueOnce({
      profile_uid: 'user-id',
      roles: ['superuser'],
    });
    const { result } = renderHook(() =>
      useAccessControl({ accessControl: undefined, createdBy: 'user-id2' })
    );

    expect(result.current.isInEditAccessMode).toBe(true);

    await waitFor(() => {
      expect(result.current.canManageAccessControl).toBe(true);
    });
  });

  it('returns correct values when accessControl is undefined and current user is not equal to createdBy and is not an admin', async () => {
    mockGetCurrentUser.mockResolvedValueOnce({
      profile_uid: 'user-id',
      roles: ['superuser'],
    });
    const { result } = renderHook(() =>
      useAccessControl({ accessControl: undefined, createdBy: 'user-id2' })
    );

    expect(result.current.isInEditAccessMode).toBe(true);

    await waitFor(() => {
      expect(result.current.canManageAccessControl).toBe(false);
    });
  });

  it('returns correct values when accessMode is "default"', async () => {
    const accessControl: SavedObjectAccessControl = { owner: 'user-id', accessMode: 'default' };

    const { result } = renderHook(() => useAccessControl({ accessControl, createdBy: 'user-id' }));

    expect(result.current.isInEditAccessMode).toBe(true);

    await waitFor(() => {
      expect(result.current.canManageAccessControl).toBe(true);
    });
  });

  it('returns correct values when accessMode is "read_only"', async () => {
    const accessControl: SavedObjectAccessControl = { owner: 'user-id', accessMode: 'read_only' };

    const { result } = renderHook(() => useAccessControl({ accessControl, createdBy: 'user-id' }));

    expect(result.current.isInEditAccessMode).toBe(false);

    await waitFor(() => {
      expect(result.current.canManageAccessControl).toBe(true);
    });
  });
});
