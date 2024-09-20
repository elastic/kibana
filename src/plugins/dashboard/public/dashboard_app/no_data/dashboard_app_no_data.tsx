/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';

import { withSuspense } from '@kbn/shared-ux-utility';

import { DASHBOARD_APP_ID } from '../../dashboard_constants';
import {
  coreServices,
  dataService,
  dataViewEditorService,
  embeddableService,
  noDataPageService,
  shareService,
} from '../../services/kibana_services';
import {
  dashboardBackupService,
  dashboardContentManagementService,
} from '../../services/dashboard_services';

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
  const AnalyticsNoDataPage = withSuspense(
    React.lazy(() =>
      importPromise.then(({ AnalyticsNoDataPage: NoDataPage }) => {
        return { default: NoDataPage };
      })
    )
  );

  return (
    <AnalyticsNoDataPageKibanaProvider {...analyticsServices}>
      <AnalyticsNoDataPage onDataViewCreated={onDataViewCreated} />
    </AnalyticsNoDataPageKibanaProvider>
  );
};

export const isDashboardAppInNoDataState = async () => {
  const hasUserDataView = await dataService.dataViews.hasData.hasUserDataView().catch(() => false);

  if (hasUserDataView) return false;

  // consider has data if there is an incoming embeddable
  const hasIncomingEmbeddable = embeddableService
    .getStateTransfer()
    .getIncomingEmbeddablePackage(DASHBOARD_APP_ID, false);
  if (hasIncomingEmbeddable) return false;

  // consider has data if there is unsaved dashboard with edits
  if (dashboardBackupService.dashboardHasUnsavedEdits()) return false;

  // consider has data if there is at least one dashboard
  const { total } = await dashboardContentManagementService.findDashboards
    .search({ search: '', size: 1 })
    .catch(() => ({ total: 0 }));
  if (total > 0) return false;

  return true;
};
