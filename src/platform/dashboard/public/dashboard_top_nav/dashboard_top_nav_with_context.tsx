/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { DashboardAPIContext } from '../dashboard_app/dashboard_app';
import { DashboardContainer } from '../dashboard_container';
import {
  InternalDashboardTopNav,
  InternalDashboardTopNavProps,
} from './internal_dashboard_top_nav';
export interface DashboardTopNavProps extends InternalDashboardTopNavProps {
  dashboardContainer: DashboardContainer;
}

export const DashboardTopNavWithContext = (props: DashboardTopNavProps) => (
  <DashboardAPIContext.Provider value={props.dashboardContainer}>
    <InternalDashboardTopNav {...props} />
  </DashboardAPIContext.Provider>
);

// eslint-disable-next-line import/no-default-export
export default DashboardTopNavWithContext;
