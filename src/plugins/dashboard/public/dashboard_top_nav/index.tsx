/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React, { Suspense } from 'react';
import { servicesReady } from '../plugin';
import { DashboardTopNavProps } from './dashboard_top_nav_with_context';

const LazyDashboardTopNav = React.lazy(() =>
  (async () => {
    const modulePromise = import('./dashboard_top_nav_with_context');
    const [module] = await Promise.all([modulePromise, servicesReady]);

    return {
      default: module.DashboardTopNavWithContext,
    };
  })().then((module) => module)
);

export const DashboardTopNav = (props: DashboardTopNavProps) => {
  return (
    <Suspense fallback={<div />}>
      <LazyDashboardTopNav {...props} />
    </Suspense>
  );
};
