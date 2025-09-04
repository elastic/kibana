/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { coreServices } from '../../services/kibana_services';
import type { SavedObjectAccessControl } from '@kbn/core-saved-objects-common';
import { useAccessControl } from './use_access_control';
import { renderHook, waitFor } from '@testing-library/react';

jest.mock('../access_control/check_global_manage_control_privilege', () => ({
  checkGlobalManageControlPrivilege: jest.fn(),
}));

jest.mock('../access_control/get_bulk_author_names', () => ({
  getBulkAuthorNames: jest.fn(),
}));

jest.mock('../access_control/is_dashboard_in_edit_access_mode', () => ({
  isDashboardInEditAccessMode: jest.fn(),
}));

jest.mock('../access_control/check_user_access_control', () => ({
  checkUserAccessControl: jest.fn(),
}));

import { checkGlobalManageControlPrivilege } from '../access_control/check_global_manage_control_privilege';
import { getBulkAuthorNames } from '../access_control/get_bulk_author_names';
import { isDashboardInEditAccessMode } from '../access_control/is_dashboard_in_edit_access_mode';
import { checkUserAccessControl } from '../access_control/check_user_access_control';

describe('useAccessControl', () => {
  let mockGetCurrentUser: jest.Mock;
  let mockCheckGlobalManageControlPrivilege: jest.Mock;
  let mockGetBulkAuthorNames: jest.Mock;
  let mockIsDashboardInEditAccessMode: jest.Mock;
  let mockCheckUserAccessControl: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    mockGetCurrentUser = jest.fn().mockResolvedValue({
      profile_uid: 'user-id',
      roles: [],
    });

    mockCheckGlobalManageControlPrivilege = checkGlobalManageControlPrivilege as jest.Mock;
    mockGetBulkAuthorNames = getBulkAuthorNames as jest.Mock;
    mockIsDashboardInEditAccessMode = isDashboardInEditAccessMode as jest.Mock;
    mockCheckUserAccessControl = checkUserAccessControl as jest.Mock;

    mockCheckGlobalManageControlPrivilege.mockResolvedValue(false);
    mockGetBulkAuthorNames.mockResolvedValue([{ id: 'user-id', username: 'Test User' }]);
    mockIsDashboardInEditAccessMode.mockReturnValue(true);
    mockCheckUserAccessControl.mockReturnValue(true);

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
    mockIsDashboardInEditAccessMode.mockReturnValue(true);
    mockCheckUserAccessControl.mockReturnValue(true);
    mockCheckGlobalManageControlPrivilege.mockResolvedValue(false);

    const { result } = renderHook(() =>
      useAccessControl({ accessControl: undefined, createdBy: 'user-id' })
    );

    expect(result.current.isInEditAccessMode).toBe(true);

    await waitFor(() => {
      expect(result.current.canManageAccessControl).toBe(true);
      expect(result.current.authorName).toBe('Test User');
    });

    expect(mockIsDashboardInEditAccessMode).toHaveBeenCalledWith(undefined);
    expect(mockCheckUserAccessControl).toHaveBeenCalledWith({
      accessControl: undefined,
      createdBy: 'user-id',
      userId: 'user-id',
    });
  });

  it('returns correct values when accessControl is undefined and current user is not equal to createdBy', async () => {
    mockIsDashboardInEditAccessMode.mockReturnValue(true);
    mockCheckUserAccessControl.mockReturnValue(false);
    mockCheckGlobalManageControlPrivilege.mockResolvedValue(false);

    const { result } = renderHook(() =>
      useAccessControl({ accessControl: undefined, createdBy: 'user-id2' })
    );

    expect(result.current.isInEditAccessMode).toBe(true);

    await waitFor(() => {
      expect(result.current.canManageAccessControl).toBe(false);
    });

    expect(mockCheckUserAccessControl).toHaveBeenCalledWith({
      accessControl: undefined,
      createdBy: 'user-id2',
      userId: 'user-id',
    });
  });

  it('returns correct values when current user has global privileges', async () => {
    mockIsDashboardInEditAccessMode.mockReturnValue(true);
    mockCheckUserAccessControl.mockReturnValue(false);
    mockCheckGlobalManageControlPrivilege.mockResolvedValue(true);

    const { result } = renderHook(() =>
      useAccessControl({ accessControl: undefined, createdBy: 'user-id2' })
    );

    expect(result.current.isInEditAccessMode).toBe(true);

    await waitFor(() => {
      expect(result.current.canManageAccessControl).toBe(true);
    });

    expect(mockCheckGlobalManageControlPrivilege).toHaveBeenCalled();
  });

  it('returns authorName when available', async () => {
    mockGetBulkAuthorNames.mockResolvedValue([{ id: 'author-id', username: 'Author Name' }]);

    const accessControl: SavedObjectAccessControl = { owner: 'author-id', accessMode: 'default' };

    const { result } = renderHook(() => useAccessControl({ accessControl, createdBy: 'user-id' }));

    await waitFor(() => {
      expect(result.current.authorName).toBe('Author Name');
    });

    expect(mockGetBulkAuthorNames).toHaveBeenCalledWith(['author-id']);
  });

  it('falls back to createdBy when no accessControl owner is available', async () => {
    mockGetBulkAuthorNames.mockResolvedValue([{ id: 'creator-id', username: 'Creator Name' }]);

    const { result } = renderHook(() =>
      useAccessControl({ accessControl: undefined, createdBy: 'creator-id' })
    );

    await waitFor(() => {
      expect(result.current.authorName).toBe('Creator Name');
    });

    expect(mockGetBulkAuthorNames).toHaveBeenCalledWith(['creator-id']);
  });

  it('returns correct values when accessMode is "default"', async () => {
    const accessControl: SavedObjectAccessControl = { owner: 'user-id', accessMode: 'default' };

    mockIsDashboardInEditAccessMode.mockReturnValue(true);
    mockCheckUserAccessControl.mockReturnValue(true);
    mockCheckGlobalManageControlPrivilege.mockResolvedValue(false);

    const { result } = renderHook(() => useAccessControl({ accessControl, createdBy: 'user-id' }));

    expect(result.current.isInEditAccessMode).toBe(true);

    await waitFor(() => {
      expect(result.current.canManageAccessControl).toBe(true);
    });

    expect(mockIsDashboardInEditAccessMode).toHaveBeenCalledWith(accessControl);
  });

  it('returns correct values when accessMode is "read_only"', async () => {
    const accessControl: SavedObjectAccessControl = { owner: 'user-id', accessMode: 'read_only' };

    mockIsDashboardInEditAccessMode.mockReturnValue(false);
    mockCheckUserAccessControl.mockReturnValue(true);
    mockCheckGlobalManageControlPrivilege.mockResolvedValue(false);

    const { result } = renderHook(() => useAccessControl({ accessControl, createdBy: 'user-id' }));

    expect(result.current.isInEditAccessMode).toBe(false);

    await waitFor(() => {
      expect(result.current.canManageAccessControl).toBe(true);
    });

    expect(mockIsDashboardInEditAccessMode).toHaveBeenCalledWith(accessControl);
  });

  it('handles getBulkAuthorNames failure gracefully', async () => {
    mockGetBulkAuthorNames.mockResolvedValue([]);

    const accessControl: SavedObjectAccessControl = { owner: 'user-id', accessMode: 'default' };

    const { result } = renderHook(() => useAccessControl({ accessControl, createdBy: 'user-id' }));

    await waitFor(() => {
      expect(result.current.authorName).toBe(undefined);
    });
  });
});
