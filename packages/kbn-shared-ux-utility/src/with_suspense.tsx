/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { Suspense, ComponentType, ReactElement, Ref } from 'react';
import { KibanaErrorBoundary, KibanaErrorBoundaryProvider } from '@kbn/shared-ux-error-boundary';

import { Fallback } from './fallback';

/**
 * A HOC which supplies React.Suspense with a fallback component, and a `EuiErrorBoundary` to contain errors.
 * @param Component A component deferred by `React.lazy`
 * @param fallback A fallback component to render while things load; default is `Fallback` from SharedUX.
 */
export const withSuspense = <P extends {}, R = {}>(
  Component: ComponentType<P>,
  fallback: ReactElement | null = <Fallback />
) =>
  React.forwardRef((props: P, ref: Ref<R>) => (
    <KibanaErrorBoundaryProvider>
      <KibanaErrorBoundary>
        <Suspense fallback={fallback}>
          <Component {...props} ref={ref} />
        </Suspense>
      </KibanaErrorBoundary>
    </KibanaErrorBoundaryProvider>
  ));
