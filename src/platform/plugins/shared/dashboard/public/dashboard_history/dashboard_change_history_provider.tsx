/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';

import type { DashboardState } from '@kbn/as-code-dashboard-schema';
import type { ChangeHistoryPreviewRenderFn } from '@kbn/change-history-ui';
import { ChangeHistoryModal, ChangeHistoryProvider } from '@kbn/change-history-ui';
import type { Filter } from '@kbn/es-query';
import { i18n } from '@kbn/i18n';

import type { DashboardApi, DashboardInitializationState } from '..';
import { DASHBOARD_APP_ID, DashboardRenderer } from '..';
import { coreServices, unifiedSearchService } from '../services/kibana_services';
import { createDashboardChangeHistoryAdapter } from './dashboard_change_history_adapter';
import { renderDashboardChangeHistoryBadge } from './dashboard_change_history_badge';
import { toStoredFilters } from '@kbn/as-code-filters-transforms';
import { css } from '@emotion/react';

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

  const adapter = useMemo(() => {
    return createDashboardChangeHistoryAdapter(coreServices.http, dashboardApi);
  }, [dashboardApi]);

  return (
    <ChangeHistoryProvider
      objectId={dashboardId}
      adapter={adapter}
      renderPreview={(props) => <DashboardPreview {...props} setPreviewTitle={setPreviewTitle} />}
      renderBadge={renderDashboardChangeHistoryBadge}
      labels={{
        previewBackLabel: i18n.translate('workflows.changeHistory.backToWorkflow', {
          defaultMessage: 'Back to dashboard',
        }),
        previewTitle,
      }}
      features={{ compare: false, restore: true }}
      permissions={{ canRestore: true }}
      scope={scope}
      analytics={analytics}
    >
      {children}
      <ChangeHistoryModal />
    </ChangeHistoryProvider>
  );
};

// export const WorkflowChangeHistoryListItem = (): JSX.Element | null => {
//   const isEnabled = useWorkflowChangeHistoryEnabled();

//   if (!isEnabled) {
//     return null;
//   }

//   return <ChangeHistoryListGroupItem />;
// };

const DashboardPreview: ChangeHistoryPreviewRenderFn<{
  setPreviewTitle: (title: string) => void;
}> = ({ objectId, change, compareSpec, diffTelemetry, setPreviewTitle }) => {
  const initialState = useRef<DashboardInitializationState>({
    ...change,
    viewMode: 'view' as const,
  });
  const [dashboardApi, setDashboardApi] = useState<DashboardApi | undefined>();

  useEffect(() => {
    if (!dashboardApi) return;
    setPreviewTitle((change.snapshot as DashboardState).title);
    dashboardApi.setState({
      ...(change.snapshot as DashboardState),
    });
  }, [change, dashboardApi, setPreviewTitle]);

  const memoized = useMemo(() => {
    /** Prevent dashboard renderer from remounting with every history item selection; instead, we will call `setState` on the API */
    return (
      <DashboardRenderer
        getCreationOptions={() =>
          Promise.resolve({
            getInitialInput: () => initialState.current,
          })
        }
        onApiAvailable={setDashboardApi}
        // getCreationOptions={async () => ({
        //   useSessionStorageIntegration: false,
        //   getInitialInput: () => ({
        //     ...(compareSpec ? compareSpec.target.snapshot : change.snapshot),
        //     viewMode: 'view',
        //   }),
        // })}
      />
    );
  }, []);

  return (
    <div
      css={css`
        overflow: scroll;
      `}
    >
      <unifiedSearchService.ui.SearchBar
        appName={DASHBOARD_APP_ID}
        filters={toStoredFilters((change.snapshot as DashboardState).filters)}
      />
      {memoized}
    </div>
  );
};
