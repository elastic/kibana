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

const Component = dynamic(async () => {
  const { DashboardRenderer } = await import('./dashboard_renderer');
  return {
    default: DashboardRenderer,
  };
});

export function LazyDashboardRenderer(props: DashboardRendererProps) {
  return <Component {...props} />;
}
