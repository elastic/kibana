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

import type { ChangeHistoryProviderProps } from '@kbn/change-history-ui';
import { ChangeHistoryModal, ChangeHistoryProvider } from '@kbn/change-history-ui';
import { i18n } from '@kbn/i18n';

import { useDashboardApi } from '../dashboard_api/use_dashboard_api';
import { coreServices } from '../services/kibana_services';
import { createDashboardChangeHistoryAdapter } from './dashboard_change_history_adapter';
import { renderDashboardChangeHistoryBadge } from './dashboard_change_history_badge';
import { DashboardChangeHistoryView } from './dashboard_change_history_view';

export interface DashboardChangeHistoryProviderProps {
  children: React.ReactNode;
}

export const DashboardChangeHistoryProvider = ({
  children,
}: DashboardChangeHistoryProviderProps): JSX.Element => {
  const dashboardApi = useDashboardApi();
  const dashboardId = dashboardApi.savedObjectId$.getValue() ?? dashboardApi.uuid;

  const { analytics } = coreServices;
  const [isComparing, setIsComparing] = useState<boolean>(false);
  const ignoreEventPropogation = useRef<boolean>(false);

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

  // selecting a row clears the comparison, except when the select was triggered by clicking that row's "changes" button
  const onSelectChange = useCallback<
    NonNullable<ChangeHistoryProviderProps['onSelectChange']>
  >(() => {
    if (!ignoreEventPropogation.current) {
      setIsComparing(false);
    }
    ignoreEventPropogation.current = false;
  }, []);

  // renders the nChanges string as a link that triggers the comparison view
  const renderChanges = useCallback<NonNullable<ChangeHistoryProviderProps['renderChanges']>>(
    ({ item, nChanges }) =>
      item.metadata?.version === 1 ? (
        nChanges // version 1 has nothing to compare to so don't make it a button, even if it has a change count
      ) : (
        <EuiButtonEmpty
          data-test-subj="changeHistoryItemChanges"
          size={'xs'}
          flush={'both'}
          onClick={() => {
            ignoreEventPropogation.current = true; // if clicking the nChanges button, ignore propogation up to `onSelectChange`
            setIsComparing(true);
          }}
        >
          {nChanges}
        </EuiButtonEmpty>
      ),
    []
  );

  // renders the dashboard preview and/or the JSON comparison mode, depending on isComparing
  const renderPreview = useCallback<NonNullable<ChangeHistoryProviderProps['renderPreview']>>(
    (props) => (
      <DashboardChangeHistoryView
        previewProps={props}
        setPreviewTitle={setPreviewTitle}
        isComparing={isComparing}
        inheritedTimeRange={dashboardApi?.timeRange$.getValue()}
      />
    ),
    [isComparing, dashboardApi]
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
