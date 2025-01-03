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

export const LazyReplacementCard = React.lazy(() => import('./replacement_card'));
