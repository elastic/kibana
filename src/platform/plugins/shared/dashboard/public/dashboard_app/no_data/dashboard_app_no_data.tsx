/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback } from 'react';
import { withSuspense } from '@kbn/shared-ux-utility';
import {
  coreServices,
  dataService,
  dataViewEditorService,
  embeddableService,
  noDataPageService,
  shareService,
} from '../../services/kibana_services';
import { getDashboardBackupService } from '../../services/dashboard_backup_service';
import { dashboardClient } from '../../dashboard_client';

export const DashboardAppNoDataPage = ({
  onDataViewCreated,
}: {
  onDataViewCreated: () => void;
}) => {
  const analyticsServices = {
    coreStart: coreServices,
    dataViews: dataService.dataViews,
    dataViewEditor: dataViewEditorService,
    noDataPage: noDataPageService,
    share: shareService,
  };
  const importPromise = import('@kbn/shared-ux-page-analytics-no-data');
  const AnalyticsNoDataPageKibanaProvider = withSuspense(
    React.lazy(() =>
      importPromise.then(({ AnalyticsNoDataPageKibanaProvider: NoDataProvider }) => {
        return { default: NoDataProvider };
      })
    )
  );

  const onTryESQL = useCallback(async () => {
    await embeddableService.getStateTransfer().navigateToWithEmbeddablePackages('dashboards', {
      state: [
        {
          type: 'lens',
          serializedState: {
            rawState: {
              id: '1',
              isNewPanel: true,
              attributes: { references: [] },
            },
          },
        },
      ],
      path: '#/create',
    });
  }, []);

  const AnalyticsNoDataPage = withSuspense(
    React.lazy(() =>
      importPromise.then(({ AnalyticsNoDataPage: NoDataPage }) => {
        return { default: NoDataPage };
      })
    )
  );

  return (
    <AnalyticsNoDataPageKibanaProvider {...analyticsServices}>
      <AnalyticsNoDataPage onDataViewCreated={onDataViewCreated} onTryESQL={onTryESQL} />
    </AnalyticsNoDataPageKibanaProvider>
  );
};

export const isDashboardAppInNoDataState = async () => {
  const hasUserDataView = await dataService.dataViews.hasData.hasUserDataView().catch(() => false);
  if (hasUserDataView) return false;

  // consider has data if there is unsaved dashboard with edits
  if (getDashboardBackupService().dashboardHasUnsavedEdits()) return false;

  // consider has data if there is at least one dashboard
  const { total } = await dashboardClient
    .search({ search: '', size: 1 })
    .catch(() => ({ total: 0 }));
  if (total > 0) return false;

  return true;
};
