/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import {
  AnalyticsNoDataPageKibanaProvider,
  AnalyticsNoDataPage,
} from '@kbn/shared-ux-page-analytics-no-data';

import { pluginServices } from '../services/plugin_services';

export const DashboardAppNoDataPage = ({
  onDataViewCreated,
}: {
  onDataViewCreated: () => void;
}) => {
  const {
    data: { dataViews },
    noDataPageContext: {
      coreStart: { docLinks, application },
      dataViewEditor,
    },
    http: { basePath },
  } = pluginServices.getServices();

  const analyticsServices = {
    coreStart: {
      docLinks,
      application,
      http: { basePath },
    } as unknown as React.ComponentProps<typeof AnalyticsNoDataPageKibanaProvider>['coreStart'],
    dataViews,
    dataViewEditor,
  };
  return (
    <AnalyticsNoDataPageKibanaProvider {...analyticsServices}>
      <AnalyticsNoDataPage onDataViewCreated={onDataViewCreated} />;
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
