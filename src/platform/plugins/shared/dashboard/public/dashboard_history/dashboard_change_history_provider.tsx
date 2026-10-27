/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { lazy, Suspense, useEffect, useMemo, useState } from 'react';

import { EuiLoadingSpinner } from '@elastic/eui';

import { ChangeHistoryModal, ChangeHistoryProvider } from '@kbn/change-history-ui';
import { i18n } from '@kbn/i18n';

import { coreServices } from '../services/kibana_services';
import { createDashboardChangeHistoryAdapter } from './dashboard_change_history_adapter';
import { renderDashboardChangeHistoryBadge } from './dashboard_change_history_badge';
import { useDashboardApi } from '../dashboard_api/use_dashboard_api';

// the preview embeds a second dashboard renderer, so only load it once a change is previewed
const LazyDashboardPreview = lazy(async () => {
  const { DashboardPreview } = await import('./dashboard_preview');
  return { default: DashboardPreview };
});

export interface DashboardChangeHistoryProviderProps {
  children: React.ReactNode;
}

export const DashboardChangeHistoryProvider = ({
  children,
}: DashboardChangeHistoryProviderProps): JSX.Element => {
  const dashboardApi = useDashboardApi();
  const dashboardId = dashboardApi.savedObjectId$.getValue() ?? dashboardApi.uuid;

  const { analytics } = coreServices;
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);
  const [previewTitle, setPreviewTitle] = useState<string>(
    dashboardApi?.title$.getValue() ?? dashboardId
  );

  useEffect(() => {
    const unsavedChangesSubscription = dashboardApi?.hasUnsavedChanges$.subscribe((result) => {
      setHasUnsavedChanges(result);
    });
    return () => {
      unsavedChangesSubscription?.unsubscribe();
    };
  }, [dashboardApi]);

  const scope = useMemo(
    () => ({
      module: 'dashboard',
      dataset: 'dashboards',
      objectType: 'dashboard',
    }),
    []
  );

  const adapter = useMemo(
    () => createDashboardChangeHistoryAdapter(coreServices.http, dashboardApi),
    [dashboardApi]
  );

  return (
    <ChangeHistoryProvider
      objectId={dashboardId}
      adapter={adapter}
      renderPreview={(props) => (
        <Suspense fallback={<EuiLoadingSpinner size="xl" />}>
          <LazyDashboardPreview
            {...props}
            setPreviewTitle={setPreviewTitle}
            inheritedTimeRange={dashboardApi?.timeRange$.getValue()}
          />
        </Suspense>
      )}
      renderBadge={renderDashboardChangeHistoryBadge}
      labels={{
        previewBackLabel: i18n.translate('dashboard.changeHistory.backToDashboard', {
          defaultMessage: 'Back to dashboard',
        }),
        previewTitle,
      }}
      features={{ compare: false, restore: true, unsavedChanges: hasUnsavedChanges }}
      permissions={{ canRestore: !dashboardApi.isManaged }}
      scope={scope}
      analytics={analytics}
    >
      {children}
      <ChangeHistoryModal />
    </ChangeHistoryProvider>
  );
};
