/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { Suspense, ComponentType, ReactElement } from 'react';
import { EuiLoadingSpinner, EuiErrorBoundary } from '@elastic/eui';

const withSuspense = <P extends {}>(
  Component: ComponentType<P>,
  fallback: ReactElement | null = <EuiLoadingSpinner />
) => (props: P) => (
  <EuiErrorBoundary>
    <Suspense fallback={fallback}>
      <Component {...props} />
    </Suspense>
  </EuiErrorBoundary>
);

export { SaveModalDashboardProps } from './saved_object_save_modal_dashboard';

export const DashboardPicker = withSuspense(React.lazy(() => import('./dashboard_picker')));

export const SavedObjectSaveModalDashboard = withSuspense(
  React.lazy(() => import('./saved_object_save_modal_dashboard'))
);
