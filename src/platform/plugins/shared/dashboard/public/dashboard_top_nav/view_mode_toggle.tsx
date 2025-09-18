/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback } from 'react';
import type { ViewMode } from '@kbn/presentation-publishing';
import { EuiButton, useEuiTheme } from '@elastic/eui';
import useMountedState from 'react-use/lib/useMountedState';
import type { DashboardApi } from '../dashboard_api/types';
import { getDashboardBackupService } from '../services/dashboard_backup_service';
import { confirmDiscardOrSaveUnsavedChanges } from '../dashboard_listing/confirm_overlays';

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

  const buttonProps: {
    [key: string]: {
      label: string;
      iconType?: string;
      onClick: () => void;
      'data-test-subj': string;
    };
  } = {
    view: {
      label: 'Edit',
      iconType: 'pencil',
      onClick: switchToEditMode,
      'data-test-subj': 'dashboardEnterEditMode',
    },
    edit: {
      label: 'Exit edit',
      onClick: switchToViewMode,
      'data-test-subj': 'dashboardViewOnlyMode',
    },
  };

  return (
    <EuiButton
      size="s"
      color="text"
      isDisabled={isResetting}
      css={{
        marginLeft: euiTheme.size.s,
      }}
      {...buttonProps[viewMode]}
    >
      {buttonProps[viewMode].label}
    </EuiButton>
  );
};
