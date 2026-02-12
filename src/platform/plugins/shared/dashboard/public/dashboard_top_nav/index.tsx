/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { Suspense } from 'react';
import type { DashboardTopNavProps } from './dashboard_top_nav_with_context';
import { untilPluginStartServicesReady } from '../services/kibana_services';

const LazyDashboardTopNav = React.lazy(async () => {
  const [{ DashboardTopNavWithContext }] = await Promise.all([
    import('../dashboard_renderer/dashboard_module'),
    untilPluginStartServicesReady(),
  ]);
  return {
    default: DashboardTopNavWithContext,
  };
});

/**
 * A lazy-loaded component that renders the dashboard top navigation bar.
 * This component provides controls for dashboard editing, saving, and other actions.
 *
 * @param props - The {@link DashboardTopNavProps} for configuring the top navigation.
 * @returns A React element containing the dashboard top navigation bar.
 */
export const DashboardTopNav = (props: DashboardTopNavProps) => {
  return (
    <Suspense fallback={<div />}>
      <LazyDashboardTopNav {...props} />
    </Suspense>
  );
};
