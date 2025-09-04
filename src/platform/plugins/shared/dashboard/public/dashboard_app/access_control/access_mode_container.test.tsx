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
import { spacesService } from '../../services/kibana_services';
import type { SpacesApi } from '@kbn/spaces-plugin/public';
import { act, waitFor, screen } from '@testing-library/react';

jest.mock('./get_access_control_client', () => ({
  getAccessControlClient: jest.fn(),
}));

import { getAccessControlClient } from './get_access_control_client';

describe('Access Mode Container', () => {
  const mockClient = {
    canManageAccessControl: jest.fn(),
    isInEditAccessMode: jest.fn(),
    checkGlobalPrivilege: jest.fn(),
    changeAccessMode: jest.fn(),
    checkUserAccessControl: jest.fn(),
  };

  beforeAll(() => {
    (spacesService as SpacesApi).getActiveSpace = jest.fn().mockResolvedValue({
      name: 'Default Space',
    });

    // Mock the getAccessControlClient function to return our mock client
    (getAccessControlClient as jest.Mock).mockReturnValue(mockClient);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should render access mode container', async () => {
    mockClient.canManageAccessControl.mockResolvedValue(true);
    mockClient.isInEditAccessMode.mockReturnValue(true);

    const accessControl: SavedObjectAccessControl = { owner: 'user-id', accessMode: 'default' };

    await act(async () => {
      renderWithI18n(
        <AccessModeContainer onChangeAccessMode={jest.fn()} accessControl={accessControl} />
      );
    });

    const container = screen.getByTestId('dashboardAccessModeContainer');
    expect(container).toBeInTheDocument();
  });

  it('should render access mode select when current user can manage access control', async () => {
    mockClient.canManageAccessControl.mockResolvedValue(true);
    mockClient.isInEditAccessMode.mockReturnValue(true);

    const accessControl: SavedObjectAccessControl = { owner: 'user-id', accessMode: 'default' };

    await act(async () => {
      renderWithI18n(
        <AccessModeContainer onChangeAccessMode={jest.fn()} accessControl={accessControl} />
      );
    });

    const select = screen.getByTestId('dashboardAccessModeSelect');

    expect(select).toBeInTheDocument();
  });

  it('should not render access mode select when accessControl is undefined', async () => {
    mockClient.canManageAccessControl.mockResolvedValue(false);
    mockClient.isInEditAccessMode.mockReturnValue(true);

    await act(async () => {
      renderWithI18n(
        <AccessModeContainer onChangeAccessMode={jest.fn()} accessControl={undefined} />
      );
    });

    const select = screen.queryByTestId('dashboardAccessModeSelect');

    await waitFor(() => {
      expect(select).not.toBeInTheDocument();
    });
  });

  it('should not render access mode select when current user cannot manage access control', async () => {
    mockClient.canManageAccessControl.mockResolvedValue(false);
    mockClient.isInEditAccessMode.mockReturnValue(true);

    const accessControl: SavedObjectAccessControl = { owner: 'user-id2', accessMode: 'default' };

    await act(async () => {
      renderWithI18n(
        <AccessModeContainer onChangeAccessMode={jest.fn()} accessControl={accessControl} />
      );
    });

    const select = screen.queryByTestId('dashboardAccessModeSelect');

    await waitFor(() => {
      expect(select).not.toBeInTheDocument();
    });
  });

  it('should render space name', async () => {
    mockClient.canManageAccessControl.mockResolvedValue(false);
    mockClient.isInEditAccessMode.mockReturnValue(true);

    await act(async () => {
      renderWithI18n(
        <AccessModeContainer onChangeAccessMode={jest.fn()} accessControl={undefined} />
      );
    });

    const spaceName = screen.getByText(/Default Space/i);

    await waitFor(() => {
      expect(spaceName).toBeInTheDocument();
    });
  });

  it('should render description tooltip when current user cannot manage access control', async () => {
    mockClient.canManageAccessControl.mockResolvedValue(false);
    mockClient.isInEditAccessMode.mockReturnValue(true);

    const accessControl: SavedObjectAccessControl = { owner: 'user-id2', accessMode: 'default' };

    await act(async () => {
      renderWithI18n(
        <AccessModeContainer onChangeAccessMode={jest.fn()} accessControl={accessControl} />
      );
    });

    const tooltip = screen.getByTestId('dashboardAccessModeContainerDescriptionTooltip');

    await waitFor(() => {
      expect(tooltip).toBeInTheDocument();
    });
  });

  it('should not render description tooltip when current user can manage access control', async () => {
    mockClient.canManageAccessControl.mockResolvedValue(true);
    mockClient.isInEditAccessMode.mockReturnValue(true);

    const accessControl: SavedObjectAccessControl = { owner: 'user-id', accessMode: 'default' };

    await act(async () => {
      renderWithI18n(
        <AccessModeContainer onChangeAccessMode={jest.fn()} accessControl={accessControl} />
      );
    });

    const tooltip = screen.queryByTestId('dashboardAccessModeContainerDescriptionTooltip');

    await waitFor(() => {
      expect(tooltip).not.toBeInTheDocument();
    });
  });
});
