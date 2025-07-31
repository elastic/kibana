/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback } from 'react';
import { ViewMode } from '@kbn/presentation-publishing';
import { EuiButtonGroup, useEuiTheme } from '@elastic/eui';
import useMountedState from 'react-use/lib/useMountedState';
import { DashboardApi } from '../dashboard_api/types';
import { getDashboardBackupService } from '../services/dashboard_backup_service';
import {
  confirmDiscardOrSaveUnsavedChanges,
  confirmDiscardUnsavedChanges,
} from '../dashboard_listing/confirm_overlays';

export const ViewModeToggle = ({
  viewMode,
  dashboardApi,
  hasUnsavedChanges,
  isResetting,
  setIsResetting,
}: {
  viewMode: ViewMode;
  dashboardApi: DashboardApi;
  hasUnsavedChanges: boolean;
  isResetting: boolean;
  setIsResetting: (isResetting: boolean) => void;
}) => {
  const { euiTheme } = useEuiTheme();
  const isMounted = useMountedState();

  const viewModeOptions: Array<{ id: ViewMode; label: string }> = [
    { id: 'view', label: 'View' },
    { id: 'edit', label: 'Edit' },
  ];

  const switchToEditMode = useCallback(() => {
    getDashboardBackupService().storeViewMode('edit');
    dashboardApi.setViewMode('edit');
    dashboardApi.clearOverlays();
  }, [dashboardApi]);

  const switchToViewMode = useCallback(() => {
    dashboardApi.clearOverlays();
    if (!hasUnsavedChanges) {
      dashboardApi.setViewMode('view');
      getDashboardBackupService().storeViewMode('view');
      return;
    }
    confirmDiscardOrSaveUnsavedChanges({
      discardCallback: async () => {
        setIsResetting(true);
        await dashboardApi.asyncResetToLastSavedState();
        if (isMounted()) {
          dashboardApi.setViewMode('view');
          getDashboardBackupService().storeViewMode('view');
        }
        setIsResetting(false);
      },
      saveCallback: async () => {
        await dashboardApi.runQuickSave();
        dashboardApi.clearOverlays();

        if (isMounted()) {
          dashboardApi.setViewMode('view');
          getDashboardBackupService().storeViewMode('view');
        }
      },
      cancelCallback: () => {
        setIsResetting(false);
        dashboardApi.clearOverlays();
      },
    });
  }, [dashboardApi, hasUnsavedChanges, isMounted, setIsResetting]);

  return (
    <EuiButtonGroup
      buttonSize="compressed"
      legend="This is the toggle for dashboard view mode"
      type="single"
      options={viewModeOptions}
      idSelected={viewMode}
      onChange={viewMode === 'view' ? switchToEditMode : switchToViewMode}
      css={{
        marginLeft: euiTheme.size.s,
      }}
    />
  );
};
