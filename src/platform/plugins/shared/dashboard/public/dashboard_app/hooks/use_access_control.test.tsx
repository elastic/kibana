/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SavedObjectAccessControl } from '@kbn/core-saved-objects-common';
import type { AccessControlClientPublic } from '@kbn/access-control';
import { useAccessControl } from './use_access_control';
import { renderHook, waitFor } from '@testing-library/react';

jest.mock('../access_control/get_access_control_client', () => ({
  getAccessControlClient: jest.fn(),
}));

import { getAccessControlClient } from '../access_control/get_access_control_client';

describe('useAccessControl', () => {
  let mockAccessControlClient: jest.Mocked<AccessControlClientPublic>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockAccessControlClient = {
      checkGlobalPrivilege: jest.fn().mockResolvedValue({ isGloballyAuthorized: false }),
      changeAccessMode: jest.fn(),
      checkUserAccessControl: jest.fn().mockReturnValue(true),
      isInEditAccessMode: jest.fn().mockReturnValue(true),
    };

    (getAccessControlClient as jest.Mock).mockReturnValue(mockAccessControlClient);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns correct values when accessControl is undefined and current user is equal to createdBy', async () => {
    mockAccessControlClient.isInEditAccessMode.mockReturnValue(true);
    mockAccessControlClient.checkUserAccessControl.mockReturnValue(true);
    mockAccessControlClient.checkGlobalPrivilege.mockResolvedValue({ isGloballyAuthorized: false });

    const { result } = renderHook(() =>
      useAccessControl({ accessControl: undefined, createdBy: 'user-id' })
    );

    await waitFor(() => {
      expect(result.current.isInEditAccessMode).toBe(true);
      expect(result.current.canManageAccessControl).toBe(true);
    });

    expect(mockAccessControlClient.isInEditAccessMode).toHaveBeenCalledWith(undefined);
    expect(mockAccessControlClient.checkUserAccessControl).toHaveBeenCalledWith({
      accessControl: undefined,
      createdBy: 'user-id',
    });
  });

  it('returns correct values when accessControl is undefined and current user is not equal to createdBy', async () => {
    mockAccessControlClient.isInEditAccessMode.mockReturnValue(true);
    mockAccessControlClient.checkUserAccessControl.mockReturnValue(false);
    mockAccessControlClient.checkGlobalPrivilege.mockResolvedValue({ isGloballyAuthorized: false });

    const { result } = renderHook(() =>
      useAccessControl({ accessControl: undefined, createdBy: 'user-id2' })
    );

    await waitFor(() => {
      expect(result.current.isInEditAccessMode).toBe(true);
      expect(result.current.canManageAccessControl).toBe(false);
    });

    expect(mockAccessControlClient.checkUserAccessControl).toHaveBeenCalledWith({
      accessControl: undefined,
      createdBy: 'user-id2',
    });
  });

  it('returns correct values when current user has global privileges', async () => {
    mockAccessControlClient.isInEditAccessMode.mockReturnValue(true);
    mockAccessControlClient.checkUserAccessControl.mockReturnValue(false);
    mockAccessControlClient.checkGlobalPrivilege.mockResolvedValue({ isGloballyAuthorized: true });

    const { result } = renderHook(() =>
      useAccessControl({ accessControl: undefined, createdBy: 'user-id2' })
    );

    await waitFor(() => {
      expect(result.current.isInEditAccessMode).toBe(true);
      expect(result.current.canManageAccessControl).toBe(true);
    });

    expect(mockAccessControlClient.checkGlobalPrivilege).toHaveBeenCalled();
  });

  it('returns correct values when accessMode is "default"', async () => {
    const accessControl: SavedObjectAccessControl = { owner: 'user-id', accessMode: 'default' };

    mockAccessControlClient.isInEditAccessMode.mockReturnValue(true);
    mockAccessControlClient.checkUserAccessControl.mockReturnValue(true);
    mockAccessControlClient.checkGlobalPrivilege.mockResolvedValue({ isGloballyAuthorized: false });

    const { result } = renderHook(() => useAccessControl({ accessControl, createdBy: 'user-id' }));

    await waitFor(() => {
      expect(result.current.isInEditAccessMode).toBe(true);
      expect(result.current.canManageAccessControl).toBe(true);
    });

    expect(mockAccessControlClient.isInEditAccessMode).toHaveBeenCalledWith(accessControl);
  });

  it('returns correct values when accessMode is "read_only"', async () => {
    const accessControl: SavedObjectAccessControl = { owner: 'user-id', accessMode: 'read_only' };

    mockAccessControlClient.isInEditAccessMode.mockReturnValue(false);
    mockAccessControlClient.checkUserAccessControl.mockReturnValue(true);
    mockAccessControlClient.checkGlobalPrivilege.mockResolvedValue({ isGloballyAuthorized: false });

    const { result } = renderHook(() => useAccessControl({ accessControl, createdBy: 'user-id' }));

    expect(result.current.isInEditAccessMode).toBe(false);

    await waitFor(() => {
      expect(result.current.canManageAccessControl).toBe(true);
    });

    expect(mockAccessControlClient.isInEditAccessMode).toHaveBeenCalledWith(accessControl);
  });
});
