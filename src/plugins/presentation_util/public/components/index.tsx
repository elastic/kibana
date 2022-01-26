/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { Suspense, ComponentType, ReactElement, Ref } from 'react';
import { EuiLoadingSpinner, EuiErrorBoundary } from '@elastic/eui';
import { ReduxEmbeddableWrapperType } from './redux_embeddables/redux_embeddable_wrapper';

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

export const LazyDashboardPicker = React.lazy(() => import('./dashboard_picker'));

export const LazySavedObjectSaveModalDashboard = React.lazy(
  () => import('./saved_object_save_modal_dashboard')
);

export const LazyReduxEmbeddableWrapper = React.lazy(
  () => import('./redux_embeddables/redux_embeddable_wrapper')
) as ReduxEmbeddableWrapperType; // Lazy component needs to be casted due to generic type props

export const LazyDataViewPicker = React.lazy(() => import('./data_view_picker/data_view_picker'));

export const LazyFieldPicker = React.lazy(() => import('./field_picker/field_picker'));

/**
 * A lazily-loaded ExpressionInput component.
 */
export const LazyExpressionInput = React.lazy(() => import('./expression_input'));

export * from './types';
