/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import { AccessModeContainer } from './access_mode_container';
import type { SavedObjectAccessControl } from '@kbn/core-saved-objects-common';
import { act, waitFor, screen } from '@testing-library/react';

describe('Access Mode Container', () => {
  const mockAccessControlClient = {
    canManageAccessControl: jest.fn(),
    isInEditAccessMode: jest.fn(),
    checkGlobalPrivilege: jest.fn(),
    changeAccessMode: jest.fn(),
    checkUserAccessControl: jest.fn(),
    isAccessControlEnabled: jest.fn(),
  } as any;

  const mockGetActiveSpace = jest.fn();
  const mockGetCurrentUser = jest.fn();

  beforeAll(() => {
    mockGetActiveSpace.mockResolvedValue({
      name: 'Default Space',
    });

    mockGetCurrentUser.mockResolvedValue({
      uid: 'user-id',
    });

    mockAccessControlClient.isAccessControlEnabled.mockResolvedValue(true);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const getDefaultProps = (accessControl?: Partial<SavedObjectAccessControl>) => ({
    onChangeAccessMode: jest.fn(),
    accessControl,
    getCurrentUser: mockGetCurrentUser,
    accessControlClient: mockAccessControlClient,
    getActiveSpace: mockGetActiveSpace,
    contentTypeId: 'dashboard',
  });

  it('should render access mode container', async () => {
    mockAccessControlClient.canManageAccessControl.mockResolvedValue(true);
    mockAccessControlClient.isInEditAccessMode.mockReturnValue(true);

    const accessControl: SavedObjectAccessControl = { owner: 'user-id', accessMode: 'default' };

    await act(async () => {
      renderWithI18n(<AccessModeContainer {...getDefaultProps(accessControl)} />);
    });

    const container = screen.getByTestId('accessModeContainer');
    expect(container).toBeInTheDocument();
  });

  it('should render access mode select when current user can manage access control', async () => {
    mockAccessControlClient.canManageAccessControl.mockResolvedValue(true);
    mockAccessControlClient.isInEditAccessMode.mockReturnValue(true);

    const accessControl: SavedObjectAccessControl = { owner: 'user-id', accessMode: 'default' };

    await act(async () => {
      renderWithI18n(<AccessModeContainer {...getDefaultProps(accessControl)} />);
    });

    const select = screen.getByTestId('accessModeSelect');

    expect(select).toBeInTheDocument();
  });

  it('should not render access mode select when accessControl is undefined', async () => {
    mockAccessControlClient.canManageAccessControl.mockResolvedValue(false);
    mockAccessControlClient.isInEditAccessMode.mockReturnValue(true);

    await act(async () => {
      renderWithI18n(<AccessModeContainer {...getDefaultProps(undefined)} />);
    });

    const select = screen.queryByTestId('dashboardAccessModeSelect');

    await waitFor(() => {
      expect(select).not.toBeInTheDocument();
    });
  });

  it('should not render access mode select when current user cannot manage access control', async () => {
    mockAccessControlClient.canManageAccessControl.mockResolvedValue(false);
    mockAccessControlClient.isInEditAccessMode.mockReturnValue(true);

    const accessControl: SavedObjectAccessControl = { owner: 'user-id2', accessMode: 'default' };

    await act(async () => {
      renderWithI18n(<AccessModeContainer {...getDefaultProps(accessControl)} />);
    });

    const select = screen.queryByTestId('dashboardAccessModeSelect');

    await waitFor(() => {
      expect(select).not.toBeInTheDocument();
    });
  });

  it('should render space name', async () => {
    mockAccessControlClient.canManageAccessControl.mockResolvedValue(false);
    mockAccessControlClient.isInEditAccessMode.mockReturnValue(true);

    await act(async () => {
      renderWithI18n(<AccessModeContainer {...getDefaultProps(undefined)} />);
    });

    const spaceName = screen.getByText(/Default Space/i);

    await waitFor(() => {
      expect(spaceName).toBeInTheDocument();
    });
  });

  it('should render description tooltip when current user cannot manage access control', async () => {
    mockAccessControlClient.canManageAccessControl.mockResolvedValue(false);
    mockAccessControlClient.isInEditAccessMode.mockReturnValue(true);

    const accessControl: SavedObjectAccessControl = { owner: 'user-id2', accessMode: 'default' };

    await act(async () => {
      renderWithI18n(<AccessModeContainer {...getDefaultProps(accessControl)} />);
    });

    const tooltip = screen.getByTestId('accessModeContainerDescriptionTooltip');

    await waitFor(() => {
      expect(tooltip).toBeInTheDocument();
    });
  });

  it('should not render description tooltip when current user can manage access control', async () => {
    mockAccessControlClient.canManageAccessControl.mockResolvedValue(true);
    mockAccessControlClient.isInEditAccessMode.mockReturnValue(true);

    const accessControl: SavedObjectAccessControl = { owner: 'user-id', accessMode: 'default' };

    await act(async () => {
      renderWithI18n(<AccessModeContainer {...getDefaultProps(accessControl)} />);
    });

    const tooltip = screen.queryByTestId('accessModeContainerDescriptionTooltip');

    await waitFor(() => {
      expect(tooltip).not.toBeInTheDocument();
    });
  });

  it('should not render anything when access control is disabled', async () => {
    mockAccessControlClient.isAccessControlEnabled.mockResolvedValueOnce(false);
    mockAccessControlClient.canManageAccessControl.mockResolvedValue(true);
    mockAccessControlClient.isInEditAccessMode.mockReturnValue(true);

    const accessControl: SavedObjectAccessControl = { owner: 'user-id', accessMode: 'default' };

    await act(async () => {
      renderWithI18n(<AccessModeContainer {...getDefaultProps(accessControl)} />);
    });

    const container = screen.queryByTestId('accessModeContainer');

    await waitFor(() => {
      expect(container).not.toBeInTheDocument();
    });
  });
});
