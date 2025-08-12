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

import {
  DASHBOARD_PANELS_UNSAVED_ID,
  getDashboardBackupService,
} from '../services/dashboard_backup_service';
import { getDashboardContentManagementService } from '../services/dashboard_content_management_service';
import { coreServices } from '../services/kibana_services';
import { DashboardUnsavedListing, DashboardUnsavedListingProps } from './dashboard_unsaved_listing';

const renderDashboardUnsavedListing = (props: Partial<DashboardUnsavedListingProps> = {}) =>
  render(
    <DashboardUnsavedListing
      goToDashboard={jest.fn()}
      unsavedDashboardIds={['dashboardUnsavedOne', 'dashboardUnsavedTwo', 'dashboardUnsavedThree']}
      refreshUnsavedDashboards={jest.fn()}
      {...props}
    />,
    { wrapper: I18nProvider }
  );

describe('Unsaved listing', () => {
  const dashboardBackupService = getDashboardBackupService();
  const dashboardContentManagementService = getDashboardContentManagementService();

  it('Gets information for each unsaved dashboard', async () => {
    renderDashboardUnsavedListing();
    await waitFor(() =>
      expect(dashboardContentManagementService.findDashboards.findByIds).toHaveBeenCalledTimes(1)
    );
  });

  it('Does not attempt to get newly created dashboard', async () => {
    renderDashboardUnsavedListing({
      unsavedDashboardIds: ['dashboardUnsavedOne', DASHBOARD_PANELS_UNSAVED_ID],
    });
    await waitFor(() =>
      expect(dashboardContentManagementService.findDashboards.findByIds).toHaveBeenCalledWith([
        'dashboardUnsavedOne',
      ])
    );
  });

  it('Redirects to the requested dashboard in edit mode when continue editing clicked', async () => {
    const goToDashboard = jest.fn();
    renderDashboardUnsavedListing({ goToDashboard });
    const editButton = await screen.findByTestId('edit-unsaved-Dashboard-Unsaved-One');
    editButton.click();
    expect(goToDashboard).toHaveBeenCalledWith('dashboardUnsavedOne', 'edit');
  });

  it('Redirects to new dashboard when continue editing clicked', async () => {
    const goToDashboard = jest.fn();
    renderDashboardUnsavedListing({
      unsavedDashboardIds: [DASHBOARD_PANELS_UNSAVED_ID],
      goToDashboard,
    });
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
    (dashboardContentManagementService.findDashboards.findByIds as jest.Mock).mockResolvedValue([
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

    renderDashboardUnsavedListing({
      unsavedDashboardIds: [
        'dashboardUnsavedOne',
        'dashboardUnsavedTwo',
        'dashboardUnsavedThree',
        'failCase1',
        'failCase2',
      ],
    });

    waitFor(() => {
      expect(dashboardBackupService.clearState).toHaveBeenCalledWith('failCase1');
      expect(dashboardBackupService.clearState).toHaveBeenCalledWith('failCase2');

      // clearing panels from dashboard with errors should cause getDashboardIdsWithUnsavedChanges to be called again.
      expect(dashboardBackupService.getDashboardIdsWithUnsavedChanges).toHaveBeenCalledTimes(2);
    });
  });
});
