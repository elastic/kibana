/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React, { Suspense } from 'react';
import { DashboardAPIContext } from '../dashboard_app/dashboard_app';
import { DashboardContainer } from '../dashboard_container';
import { servicesReady } from '../plugin';
import { InternalDashboardTopNavProps } from './dashboard_top_nav';

export interface DashboardTopNavProps extends InternalDashboardTopNavProps {
  dashboardContainer: DashboardContainer;
}

const LazyDashboardTopNav = React.lazy(() =>
  (async () => {
    const modulePromise = import('./dashboard_top_nav');
    const [module] = await Promise.all([modulePromise, servicesReady]);

    return {
      default: module.InternalDashboardTopNav,
    };
  })().then((module) => module)
);

export const DashboardTopNav = (props: DashboardTopNavProps) => {
  const { dashboardContainer, ...rest } = props;
  return (
    <Suspense fallback={<div />}>
      <DashboardAPIContext.Provider value={dashboardContainer}>
        <LazyDashboardTopNav {...rest} />
      </DashboardAPIContext.Provider>
    </Suspense>
  );
};
