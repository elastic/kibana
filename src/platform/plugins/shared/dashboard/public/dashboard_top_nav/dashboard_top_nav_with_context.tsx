/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';

import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';

import type { InternalDashboardTopNavProps } from './internal_dashboard_top_nav';
import { InternalDashboardTopNav } from './internal_dashboard_top_nav';
import { DashboardContext } from '../dashboard_api/use_dashboard_api';
import type { DashboardApi, DashboardInternalApi } from '../dashboard_api/types';
import { uiActionsService } from '../services/kibana_services';
import { DashboardInternalContext } from '../dashboard_api/use_dashboard_internal_api';

export interface DashboardTopNavProps extends InternalDashboardTopNavProps {
  dashboardApi: DashboardApi;
  dashboardInternalApi: DashboardInternalApi;
}

export const DashboardTopNavWithContext = (props: DashboardTopNavProps) => (
  <KibanaContextProvider services={{ uiActions: uiActionsService }}>
    <DashboardContext.Provider value={props.dashboardApi}>
      <DashboardInternalContext.Provider value={props.dashboardInternalApi}>
        <InternalDashboardTopNav {...props} />
      </DashboardInternalContext.Provider>
    </DashboardContext.Provider>
  </KibanaContextProvider>
);
