/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { lazy, Suspense, useMemo, useState } from 'react';

import { EuiLoadingSpinner } from '@elastic/eui';

import { ChangeHistoryModal, ChangeHistoryProvider } from '@kbn/change-history-ui';
import { i18n } from '@kbn/i18n';

import type { DashboardApi } from '..';
import { coreServices } from '../services/kibana_services';
import { createDashboardChangeHistoryAdapter } from './dashboard_change_history_adapter';
import { renderDashboardChangeHistoryBadge } from './dashboard_change_history_badge';

// the preview embeds a second dashboard renderer, so only load it once a change is previewed
const LazyDashboardPreview = lazy(async () => {
  const { DashboardPreview } = await import('./dashboard_preview');
  return { default: DashboardPreview };
});

export interface DashboardChangeHistoryProviderProps {
  dashboardId: string;
  dashboardApi: DashboardApi | undefined;
  children: React.ReactNode;
}

export const DashboardChangeHistoryProvider = ({
  dashboardId,
  dashboardApi,
  children,
}: DashboardChangeHistoryProviderProps): JSX.Element => {
  const { analytics } = coreServices;
  const [previewTitle, setPreviewTitle] = useState<string>(
    dashboardApi?.title$.getValue() ?? dashboardId
  );

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
      features={{ compare: false, restore: true, unsavedChanges: true }}
      permissions={{ canRestore: true }}
      scope={scope}
      analytics={analytics}
    >
      {children}
      <ChangeHistoryModal />
    </ChangeHistoryProvider>
  );
};
