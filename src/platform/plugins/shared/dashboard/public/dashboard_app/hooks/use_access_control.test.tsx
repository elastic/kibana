/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { coreServices } from '../../services/kibana_services';
import type { AccessControl } from '../access_control';
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
      expect(result.current.isCurrentUserAuthor).toBe(true);
    });
  });

  it('returns correct values when accessControl is undefined and current user is not equal to createdBy', async () => {
    const { result } = renderHook(() =>
      useAccessControl({ accessControl: undefined, createdBy: 'user-id2' })
    );

    expect(result.current.isInEditAccessMode).toBe(true);

    await waitFor(() => {
      expect(result.current.isCurrentUserAuthor).toBe(false);
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
      expect(result.current.isCurrentUserAuthor).toBe(true);
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
      expect(result.current.isCurrentUserAuthor).toBe(false);
    });
  });

  it('returns correct values when accessMode is undefined', async () => {
    const accessControl: AccessControl = { owner: 'user-id', accessMode: undefined };

    const { result } = renderHook(() => useAccessControl({ accessControl, createdBy: 'user-id' }));

    expect(result.current.isInEditAccessMode).toBe(true);

    await waitFor(() => {
      expect(result.current.isCurrentUserAuthor).toBe(true);
    });
  });

  it('returns correct values when accessMode is "default"', async () => {
    const accessControl: AccessControl = { owner: 'user-id', accessMode: 'default' };

    const { result } = renderHook(() => useAccessControl({ accessControl, createdBy: 'user-id' }));

    expect(result.current.isInEditAccessMode).toBe(true);

    await waitFor(() => {
      expect(result.current.isCurrentUserAuthor).toBe(true);
    });
  });

  it('returns correct values when accessMode is "read_only"', async () => {
    const accessControl: AccessControl = { owner: 'user-id', accessMode: 'read_only' };

    const { result } = renderHook(() => useAccessControl({ accessControl, createdBy: 'user-id' }));

    expect(result.current.isInEditAccessMode).toBe(false);

    await waitFor(() => {
      expect(result.current.isCurrentUserAuthor).toBe(true);
    });
  });

  it('returns correct values when current user is the author', async () => {
    const accessControl: AccessControl = { owner: 'user-id', accessMode: undefined };

    const { result } = renderHook(() => useAccessControl({ accessControl, createdBy: 'user-id' }));

    expect(result.current.isInEditAccessMode).toBe(true);

    await waitFor(() => {
      expect(result.current.isCurrentUserAuthor).toBe(true);
    });
  });

  it('returns correct values when current user is not the author', async () => {
    const accessControl: AccessControl = { owner: 'user-id2', accessMode: undefined };

    const { result } = renderHook(() => useAccessControl({ accessControl, createdBy: 'user-id3' }));

    expect(result.current.isInEditAccessMode).toBe(true);

    await waitFor(() => {
      expect(result.current.isCurrentUserAuthor).toBe(false);
    });
  });
});
