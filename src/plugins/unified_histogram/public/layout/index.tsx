/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiDelayRender, EuiFlexGroup, EuiLoadingSpinner } from '@elastic/eui';
import { withSuspense } from '@kbn/shared-ux-utility';
import React, { lazy } from 'react';

export type { UnifiedHistogramLayoutProps } from './layout';

const LazyUnifiedHistogramLayout = lazy(() => import('./layout'));

/**
 * A resizable layout component with two panels that renders a histogram with a hits
 * counter in the top panel, and a main display (data table, etc.) in the bottom panel.
 * If all context props are left undefined, the layout will render in a single panel
 * mode including only the main display.
 */
export const UnifiedHistogramLayout = withSuspense(
  LazyUnifiedHistogramLayout,
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
