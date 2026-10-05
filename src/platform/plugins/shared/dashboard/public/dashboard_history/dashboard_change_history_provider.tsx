/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ChangeHistoryPreviewRenderFn } from '@kbn/change-history-ui';
import {
  type ChangeHistoryHttpClient,
  ChangeHistoryModal,
  ChangeHistoryProvider,
  createChangeHistoryHttpAdapter,
} from '@kbn/change-history-ui';
import { i18n } from '@kbn/i18n';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { DashboardApi, DashboardInitializationState } from '..';
import { DashboardRenderer } from '..';
import { coreServices } from '../services/kibana_services';
import { createDashboardChangeHistoryAdapter } from './dashboard_change_history_adapter';

export interface DashboardChangeHistoryProviderProps {
  dashboardId: string;
  children: React.ReactNode;
}

export const DashboardChangeHistoryProvider = ({
  dashboardId,
  children,
}: DashboardChangeHistoryProviderProps): JSX.Element => {
  const { analytics } = coreServices;

  const scope = useMemo(
    () => ({
      module: 'dashboard',
      dataset: 'dashboards',
      objectType: 'dashboard',
    }),
    []
  );

  const adapter = useMemo(() => {
    return createDashboardChangeHistoryAdapter(coreServices.http);
    // return createChangeHistoryHttpAdapter({
    //   http: coreServices.http as ChangeHistoryHttpClient,
    //   listPath: `/internal/dashboard/change_history/{objectId}`,
    //   detailPath: `/internal/dashboard/change_history/{objectId}/{eventId}`,
    //   restorePath: `/internal/dashboard/change_history/{objectId}/{eventId}/restore`, // TODO
    // });
  }, []);

  // if (!isEnabled) {
  //   return <>{children}</>;
  // }

  return (
    <ChangeHistoryProvider
      objectId={dashboardId}
      adapter={adapter}
      renderPreview={(props) => <DashboardPreview {...props} />}
      labels={{
        previewBackLabel: i18n.translate('workflows.changeHistory.backToWorkflow', {
          defaultMessage: 'Back to dashboard',
        }),
        previewTitle: dashboardId,
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

const DashboardPreview: ChangeHistoryPreviewRenderFn = ({ change, compareSpec, diffTelemetry }) => {
  console.log({ change, compareSpec, diffTelemetry });

  const initialState = useRef<DashboardInitializationState>({
    ...change,
    viewMode: 'view' as const,
  });

  const [dashboardApi, setDashboardApi] = useState<DashboardApi | undefined>();

  useEffect(() => {
    if (!dashboardApi) return;
    dashboardApi.setState({
      ...change.snapshot,
    });
  }, [change, dashboardApi]);

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
};
