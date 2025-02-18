/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import {
  InternalDashboardTopNav,
  InternalDashboardTopNavProps,
} from './internal_dashboard_top_nav';
import { DashboardContext } from '../dashboard_api/use_dashboard_api';
import { DashboardApi } from '../dashboard_api/types';
export interface DashboardTopNavProps extends InternalDashboardTopNavProps {
  dashboardApi: DashboardApi;
}

export const DashboardTopNavWithContext = (props: DashboardTopNavProps) => (
  <DashboardContext.Provider value={props.dashboardApi}>
    <InternalDashboardTopNav {...props} />
  </DashboardContext.Provider>
);

// eslint-disable-next-line import/no-default-export
export default DashboardTopNavWithContext;
