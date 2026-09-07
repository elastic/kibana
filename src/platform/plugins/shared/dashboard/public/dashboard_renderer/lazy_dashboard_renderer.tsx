/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { dynamic } from '@kbn/shared-ux-utility';
import type { DashboardRendererProps } from './dashboard_renderer';
import { untilPluginStartServicesReady } from '../services/kibana_services';

const Component = dynamic(async () => {
  const [{ DashboardRenderer }] = await Promise.all([
    import('./dashboard_module'),
    untilPluginStartServicesReady(),
  ]);
  return {
    default: DashboardRenderer,
  };
});

/**
 * A lazy-loaded wrapper component for the {@link DashboardRenderer}.
 * This component dynamically imports the dashboard renderer to reduce initial bundle size.
 *
 * @param props - The {@link DashboardRendererProps} to pass to the dashboard renderer.
 * @returns A React element containing the lazy-loaded dashboard renderer.
 */
export function LazyDashboardRenderer(props: DashboardRendererProps) {
  return <Component {...props} />;
}
