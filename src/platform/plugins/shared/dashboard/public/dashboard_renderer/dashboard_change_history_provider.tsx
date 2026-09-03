/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  type ChangeHistoryHttpClient,
  ChangeHistoryModal,
  ChangeHistoryProvider,
  ChangeHistoryTrigger,
  createChangeHistoryHttpAdapter,
} from '@kbn/change-history-ui';
import { i18n } from '@kbn/i18n';
import React, { useMemo } from 'react';
import { coreServices } from '../services/kibana_services';

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
    return createChangeHistoryHttpAdapter({
      http: coreServices.http as ChangeHistoryHttpClient,
      listPath: `/internal/dashboard/change_history/{objectId}`,
      // detailPath: '/api/my_plugin/entity/{objectId}/history/{eventId}',
      // restorePath: '/api/my_plugin/entity/{objectId}/history/{eventId}/_restore',
      // pageIndexBase: 1,
      // mapListItem: mapMyEntityHistoryListItem,
      // mapDetail: mapMyEntityHistoryDetail,
      // mapHttpError: mapChangeHistoryHttpError, // default
    });
  }, []);

  // if (!isEnabled) {
  //   return <>{children}</>;
  // }

  return (
    <ChangeHistoryProvider
      objectId={dashboardId}
      adapter={adapter}
      renderPreview={() => {
        <>Here</>;
      }}
      labels={{
        previewBackLabel: i18n.translate('workflows.changeHistory.backToWorkflow', {
          defaultMessage: 'Back to workflow',
        }),
        previewTitle: dashboardId,
      }}
      // features={{ restore: true, unsavedChanges: true }}
      // permissions={{ canRestore }}
      scope={scope}
      analytics={analytics}
    >
      {children}
      <ChangeHistoryTrigger />
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
