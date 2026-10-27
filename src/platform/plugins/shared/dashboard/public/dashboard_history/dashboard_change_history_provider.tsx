/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { EuiButtonEmpty } from '@elastic/eui';

import type { ChangeHistoryListItem, ChangeHistoryProviderProps } from '@kbn/change-history-ui';
import { ChangeHistoryModal, ChangeHistoryProvider } from '@kbn/change-history-ui';
import { i18n } from '@kbn/i18n';

import { useDashboardApi } from '../dashboard_api/use_dashboard_api';
import { coreServices } from '../services/kibana_services';
import { createDashboardChangeHistoryAdapter } from './dashboard_change_history_adapter';
import { renderDashboardChangeHistoryBadge } from './dashboard_change_history_badge';
import { DashboardChangeHistoryPreview } from './dashboard_change_history_preview';

export interface DashboardChangeHistoryProviderProps {
  children: React.ReactNode;
}

export const DashboardChangeHistoryProvider = ({
  children,
}: DashboardChangeHistoryProviderProps): JSX.Element => {
  const dashboardApi = useDashboardApi();
  const dashboardId = dashboardApi.savedObjectId$.getValue() ?? dashboardApi.uuid;

  const { analytics } = coreServices;
  const [comparisonChangeId, setComparisonChangeId] = useState<string | undefined>();

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

  // Clicking the "changes" button also selects its row, so keep a comparison requested for the
  // row being selected and drop it when the selection moves elsewhere.
  const onSelectChange = useCallback<NonNullable<ChangeHistoryProviderProps['onSelectChange']>>(
    ({ id }) => setComparisonChangeId((current) => (current === id ? current : undefined)),
    []
  );

  const renderChanges = useCallback<NonNullable<ChangeHistoryProviderProps['renderChanges']>>(
    ({ item, nChanges }) =>
      item.metadata?.version === 1 ? (
        nChanges // version 1 has nothing to compare to so don't make it a button, even if it has a change count
      ) : (
        <EuiButtonEmpty
          data-test-subj="changeHistoryItemChanges"
          size={'xs'}
          flush={'both'}
          onClick={(e: React.MouseEvent) => {
            console.log('CLICK N CHANGES', item);
            // e.stopPropagation(); // prevent bubbling up to `onSelectChange`
            setComparisonChangeId(item.id);
          }}
        >
          {nChanges}
        </EuiButtonEmpty>
      ),
    []
  );

  const renderPreview = useCallback<NonNullable<ChangeHistoryProviderProps['renderPreview']>>(
    (props) => (
      <DashboardChangeHistoryPreview
        previewProps={props}
        setPreviewTitle={setPreviewTitle}
        comparisonChangeId={comparisonChangeId}
        inheritedTimeRange={dashboardApi?.timeRange$.getValue()}
      />
    ),
    [comparisonChangeId, dashboardApi]
  );

  return (
    <ChangeHistoryProvider
      objectId={dashboardId}
      adapter={adapter}
      renderPreview={renderPreview}
      onSelectChange={onSelectChange}
      renderBadge={renderDashboardChangeHistoryBadge}
      renderChanges={renderChanges}
      labels={{
        previewBackLabel: i18n.translate('dashboard.changeHistory.backToDashboard', {
          defaultMessage: 'Back to dashboard',
        }),
        previewTitle,
      }}
      features={{ compare: true, restore: true, unsavedChanges: hasUnsavedChanges }}
      permissions={{ canRestore: !dashboardApi.isManaged }}
      scope={scope}
      analytics={analytics}
    >
      {children}
      <ChangeHistoryModal />
    </ChangeHistoryProvider>
  );
};
