/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback } from 'react';
import { EuiButton, useEuiTheme } from '@elastic/eui';
import useMountedState from 'react-use/lib/useMountedState';
import { i18n } from '@kbn/i18n';
import type { DashboardApi } from '../dashboard_api/types';
import { getDashboardBackupService } from '../services/dashboard_backup_service';
import { confirmDiscardOrSaveUnsavedChanges } from '../dashboard_listing/confirm_overlays';

export const ExitEditButton = ({
  dashboardApi,
  hasUnsavedChanges,
  isResetting,
  setIsResetting,
}: {
  dashboardApi: DashboardApi;
  hasUnsavedChanges: boolean;
  isResetting: boolean;
  setIsResetting: (isResetting: boolean) => void;
}) => {
  const { euiTheme } = useEuiTheme();
  const isMounted = useMountedState();

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
    <EuiButton
      size="s"
      color="text"
      iconType="pencil"
      onClick={switchToViewMode}
      isDisabled={isResetting}
      css={{
        marginLeft: euiTheme.size.s,
      }}
      data-test-subj="dashboardViewOnlyMode"
    >
      {i18n.translate('dashboard.topNave.exitEditButtonLabel', {
        defaultMessage: 'Exit edit',
      })}
    </EuiButton>
  );
};
