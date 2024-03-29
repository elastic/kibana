/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';

import { withSuspense } from '@kbn/shared-ux-utility';
import { pluginServices } from '../../services/plugin_services';
import { DASHBOARD_APP_ID } from '../../dashboard_constants';

export const DashboardAppNoDataPage = ({
  onDataViewCreated,
}: {
  onDataViewCreated: () => void;
}) => {
  const {
    application,
    data: { dataViews },
    dataViewEditor,
    http: { basePath, get },
    documentationLinks: { indexPatternsDocLink, kibanaGuideDocLink, esqlDocLink },
    customBranding,
    noDataPage,
    share,
  } = pluginServices.getServices();

  const analyticsServices = {
    coreStart: {
      docLinks: {
        links: {
          kibana: { guide: kibanaGuideDocLink },
          indexPatterns: { introduction: indexPatternsDocLink },
          query: { queryESQL: esqlDocLink },
        },
      },
      application,
      http: { basePath, get },
      customBranding: {
        hasCustomBranding$: customBranding.hasCustomBranding$,
      },
    },
    dataViews,
    dataViewEditor,
    noDataPage,
    share: share.url ? { url: share.url } : undefined,
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
  const {
    data: { dataViews },
    embeddable,
    dashboardContentManagement,
    dashboardBackup,
  } = pluginServices.getServices();

  const hasUserDataView = await dataViews.hasData.hasUserDataView().catch(() => false);

  if (hasUserDataView) return false;

  // consider has data if there is an incoming embeddable
  const hasIncomingEmbeddable = embeddable
    .getStateTransfer()
    .getIncomingEmbeddablePackage(DASHBOARD_APP_ID, false);
  if (hasIncomingEmbeddable) return false;

  // consider has data if there is unsaved dashboard with edits
  if (dashboardBackup.dashboardHasUnsavedEdits()) return false;

  // consider has data if there is at least one dashboard
  const { total } = await dashboardContentManagement.findDashboards
    .search({ search: '', size: 1 })
    .catch(() => ({ total: 0 }));
  if (total > 0) return false;

  return true;
};
