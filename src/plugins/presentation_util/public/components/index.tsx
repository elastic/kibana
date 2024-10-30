/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { Suspense, ComponentType, ReactElement, Ref } from 'react';
import { EuiLoadingSpinner, EuiErrorBoundary } from '@elastic/eui';

/**
 * A HOC which supplies React.Suspense with a fallback component, and a `EuiErrorBoundary` to contain errors.
 * @param Component A component deferred by `React.lazy`
 * @param fallback A fallback component to render while things load; default is `EuiLoadingSpinner`
 */
export const withSuspense = <P extends {}, R = {}>(
  Component: ComponentType<P>,
  fallback: ReactElement | null = <EuiLoadingSpinner />
) =>
  React.forwardRef((props: P, ref: Ref<R>) => {
    return (
      <EuiErrorBoundary>
        <Suspense fallback={fallback}>
          <Component {...props} ref={ref} />
        </Suspense>
      </EuiErrorBoundary>
    );
  });

export const LazyLabsBeakerButton = React.lazy(() => import('./labs/labs_beaker_button'));

export const LazyLabsFlyout = React.lazy(() => import('./labs/labs_flyout'));

export const LazyDashboardPicker = React.lazy(() => import('./dashboard_picker/dashboard_picker'));

export const LazySavedObjectSaveModalDashboard = React.lazy(
  () => import('./saved_object_save_modal_dashboard')
);

export const LazyDataViewPicker = React.lazy(() => import('./data_view_picker/data_view_picker'));

export const LazyFieldPicker = React.lazy(() => import('./field_picker/field_picker'));

const LazyDashboardDrilldownOptionsComponent = React.lazy(() =>
  import('./dashboard_drilldown_options/dashboard_drilldown_options').then(
    ({ DashboardDrilldownOptionsComponent }) => ({
      default: DashboardDrilldownOptionsComponent,
    })
  )
);

export const DashboardDrilldownOptionsComponent = withSuspense(
  LazyDashboardDrilldownOptionsComponent,
  null
);

export {
  type DashboardDrilldownOptions,
  DEFAULT_DASHBOARD_DRILLDOWN_OPTIONS,
} from './dashboard_drilldown_options/types';

export { FloatingActions } from './floating_actions/floating_actions';

/**
 * A lazily-loaded ExpressionInput component.
 */
export const LazyExpressionInput = React.lazy(() => import('./expression_input'));

export * from './types';
