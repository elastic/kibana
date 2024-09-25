/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiDelayRender, EuiFlexGroup, EuiLoadingSpinner } from '@elastic/eui';
import { withSuspense } from '@kbn/shared-ux-utility';
import React, { lazy } from 'react';
import type { UnifiedHistogramApi, UnifiedHistogramContainerProps } from './container';

export type {
  UnifiedHistogramApi,
  UnifiedHistogramContainerProps,
  UnifiedHistogramCreationOptions,
} from './container';
export type { UnifiedHistogramState, UnifiedHistogramStateOptions } from './services/state_service';
export {
  getChartHidden,
  getTopPanelHeight,
  getBreakdownField,
  setChartHidden,
  setTopPanelHeight,
  setBreakdownField,
} from './utils/local_storage_utils';

const LazyUnifiedHistogramContainer = lazy(() => import('./container'));

/**
 * A resizable layout component with two panels that renders a histogram with a hits
 * counter in the top panel, and a main display (data table, etc.) in the bottom panel.
 */
export const UnifiedHistogramContainer = withSuspense<
  UnifiedHistogramContainerProps,
  UnifiedHistogramApi
>(
  LazyUnifiedHistogramContainer,
  <EuiDelayRender delay={300}>
    <EuiFlexGroup
      className="eui-fullHeight"
      alignItems="center"
      justifyContent="center"
      gutterSize="none"
      responsive={false}
    >
      <EuiLoadingSpinner size="l" />
    </EuiFlexGroup>
  </EuiDelayRender>
);
