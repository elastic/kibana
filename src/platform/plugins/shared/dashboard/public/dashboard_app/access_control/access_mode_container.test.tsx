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
import type { SavedObjectAccessControl } from '@kbn/core/server';
import { spacesService } from '../../services/kibana_services';
import type { SpacesApi } from '@kbn/spaces-plugin/public';
import { act, waitFor, screen } from '@testing-library/react';
import { useAccessControl } from '../hooks/use_access_control';

jest.mock('../hooks/use_access_control', () => ({
  useAccessControl: jest.fn(),
}));

describe('Access Mode Container', () => {
  beforeAll(() => {
    (spacesService as SpacesApi).getActiveSpace = jest.fn().mockResolvedValue({
      name: 'Default Space',
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should render access mode container', async () => {
    (useAccessControl as jest.Mock).mockReturnValue({
      canManageAccessControl: true,
      isInEditAccessMode: true,
      authorName: 'Test User',
    });

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
    (useAccessControl as jest.Mock).mockReturnValue({
      canManageAccessControl: true,
      isInEditAccessMode: true,
      authorName: 'Test User',
    });

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
    (useAccessControl as jest.Mock).mockReturnValue({
      canManageAccessControl: false,
      isInEditAccessMode: true,
      authorName: null,
    });

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
    (useAccessControl as jest.Mock).mockReturnValue({
      canManageAccessControl: false,
      isInEditAccessMode: true,
      authorName: 'Other User',
    });

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
    (useAccessControl as jest.Mock).mockReturnValue({
      canManageAccessControl: false,
      isInEditAccessMode: true,
      authorName: null,
    });

    await act(async () => {
      renderWithI18n(
        <AccessModeContainer onChangeAccessMode={jest.fn()} accessControl={undefined} />
      );
    });

    const spaceName = screen.getByText(/Default Space/i);

    waitFor(() => {
      expect(spaceName).toBeInTheDocument();
    });
  });

  it('should render description tooltip when current user cannot manage access control', async () => {
    (useAccessControl as jest.Mock).mockReturnValue({
      canManageAccessControl: false,
      isInEditAccessMode: true,
      authorName: 'Other User',
    });

    const accessControl: SavedObjectAccessControl = { owner: 'user-id2', accessMode: 'default' };

    await act(async () => {
      renderWithI18n(
        <AccessModeContainer onChangeAccessMode={jest.fn()} accessControl={accessControl} />
      );
    });

    const tooltip = screen.getByTestId('dashboardAccessModeContainerDescriptionTooltip');

    waitFor(() => {
      expect(tooltip).toBeInTheDocument();
    });
  });

  it('should not render description tooltip when current user can manage access control', async () => {
    (useAccessControl as jest.Mock).mockReturnValue({
      canManageAccessControl: true,
      isInEditAccessMode: true,
      authorName: 'Test User',
    });

    const accessControl: SavedObjectAccessControl = { owner: 'user-id', accessMode: 'default' };

    await act(async () => {
      renderWithI18n(
        <AccessModeContainer onChangeAccessMode={jest.fn()} accessControl={accessControl} />
      );
    });

    const tooltip = screen.queryByTestId('dashboardAccessModeContainerDescriptionTooltip');

    waitFor(() => {
      expect(tooltip).not.toBeInTheDocument();
    });
  });
});
