/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';

import { I18nProvider } from '@kbn/i18n-react';
import { render, waitFor, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { DASHBOARD_PANELS_UNSAVED_ID } from '../services/dashboard_backup_service';
import { getDashboardBackupService } from '../services/dashboard_api_services';
import { coreServices } from '../services/kibana_services';
import { DashboardUnsavedListing } from './dashboard_unsaved_listing';

const renderDashboardUnsavedListing = (props: { goToDashboard?: jest.Mock } = {}) =>
  render(<DashboardUnsavedListing goToDashboard={props.goToDashboard ?? jest.fn()} />, {
    wrapper: I18nProvider,
  });

const mockFindByIds = jest.fn();
jest.mock('../dashboard_client', () => ({
  findService: {
    findByIds: (ids: string[]) => mockFindByIds(ids),
  },
}));

describe('Unsaved listing', () => {
  const dashboardBackupService = getDashboardBackupService();

  // Helper that drives the underlying source the self-subscribed hook reads.
  const setUnsavedIds = (ids: string[]) => {
    (dashboardBackupService.getDashboardIdsWithUnsavedChanges as jest.Mock).mockReturnValue(ids);
  };

  beforeEach(() => {
    mockFindByIds.mockReset();
    mockFindByIds.mockResolvedValue([
      {
        id: `dashboardUnsavedOne`,
        status: 'success',
        attributes: { title: `Dashboard Unsaved One` },
      },
      {
        id: `dashboardUnsavedTwo`,
        status: 'success',
        attributes: { title: `Dashboard Unsaved Two` },
      },
      {
        id: `dashboardUnsavedThree`,
        status: 'success',
        attributes: { title: `Dashboard Unsaved Three` },
      },
    ]);
    setUnsavedIds(['dashboardUnsavedOne', 'dashboardUnsavedTwo', 'dashboardUnsavedThree']);
  });

  it('Gets information for each unsaved dashboard', async () => {
    renderDashboardUnsavedListing();
    await waitFor(() => expect(mockFindByIds).toHaveBeenCalledTimes(1));
  });

  it('Does not attempt to get newly created dashboard', async () => {
    setUnsavedIds(['dashboardUnsavedOne', DASHBOARD_PANELS_UNSAVED_ID]);
    renderDashboardUnsavedListing();
    await waitFor(() => expect(mockFindByIds).toHaveBeenCalledWith(['dashboardUnsavedOne']));
  });

  it('Redirects to the requested dashboard in edit mode when continue editing clicked', async () => {
    const goToDashboard = jest.fn();
    renderDashboardUnsavedListing({ goToDashboard });
    const editButton = await screen.findByTestId('edit-unsaved-Dashboard-Unsaved-One');
    editButton.click();
    expect(goToDashboard).toHaveBeenCalledWith('dashboardUnsavedOne', 'edit');
  });

  it('Redirects to new dashboard when continue editing clicked', async () => {
    setUnsavedIds([DASHBOARD_PANELS_UNSAVED_ID]);
    const goToDashboard = jest.fn();
    renderDashboardUnsavedListing({ goToDashboard });
    const editButton = await screen.findByTestId('edit-unsaved-New-Dashboard');

    await userEvent.click(editButton);
    expect(goToDashboard).toHaveBeenCalledWith(undefined, 'edit');
  });

  it('Shows a warning then clears changes when delete unsaved changes is pressed', async () => {
    renderDashboardUnsavedListing();
    const discardButton = await screen.findByTestId('discard-unsaved-Dashboard-Unsaved-One');
    await userEvent.click(discardButton);
    expect(coreServices.overlays.openConfirm).toHaveBeenCalled();
    expect(dashboardBackupService.clearState).toHaveBeenCalledWith('dashboardUnsavedOne');
  });

  it('removes unsaved changes from any dashboard which errors on fetch', async () => {
    mockFindByIds.mockResolvedValue([
      {
        id: 'failCase1',
        status: 'error',
        error: { error: 'oh no', message: 'bwah', statusCode: 404 },
      },
      {
        id: 'failCase2',
        status: 'error',
        error: { error: 'oh no', message: 'bwah', statusCode: 404 },
      },
    ]);

    setUnsavedIds([
      'dashboardUnsavedOne',
      'dashboardUnsavedTwo',
      'dashboardUnsavedThree',
      'failCase1',
      'failCase2',
    ]);
    renderDashboardUnsavedListing();

    waitFor(() => {
      expect(dashboardBackupService.clearState).toHaveBeenCalledWith('failCase1');
      expect(dashboardBackupService.clearState).toHaveBeenCalledWith('failCase2');

      // Clearing panels from dashboards with errors triggers an unsaved-ids
      // refresh, which re-reads `getDashboardIdsWithUnsavedChanges`.
      expect(dashboardBackupService.getDashboardIdsWithUnsavedChanges).toHaveBeenCalledTimes(2);
    });
  });
});
