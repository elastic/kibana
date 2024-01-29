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
    documentationLinks: { indexPatternsDocLink, kibanaGuideDocLink },
    customBranding,
    noDataPage,
  } = pluginServices.getServices();

  const analyticsServices = {
    coreStart: {
      docLinks: {
        links: {
          kibana: { guide: kibanaGuideDocLink },
          indexPatterns: { introduction: indexPatternsDocLink },
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
  } = pluginServices.getServices();

  const hasUserDataView = await dataViews.hasData.hasUserDataView().catch(() => false);
  return !hasUserDataView;
};
