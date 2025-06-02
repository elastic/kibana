/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { lazy } from 'react';
import { EuiDelayRender, EuiSkeletonRectangle } from '@elastic/eui';
import { withSuspense } from '@kbn/shared-ux-utility';
import type { BreakdownFieldSelectorProps } from './breakdown_field_selector';

export type { BreakdownFieldSelectorProps } from './breakdown_field_selector';

const LazyUnifiedBreakdownFieldSelector = lazy(() => import('./breakdown_field_selector'));

/**
 * A resizable layout component with two panels that renders a histogram with a hits
 * counter in the top panel, and a main display (data table, etc.) in the bottom panel.
 */
export const UnifiedBreakdownFieldSelector = withSuspense<BreakdownFieldSelectorProps>(
  LazyUnifiedBreakdownFieldSelector,
  <EuiDelayRender delay={300}>
    <EuiSkeletonRectangle width={160} height={32} />
  </EuiDelayRender>
);
