/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AnalyticsServiceStart } from '@kbn/core-analytics-browser';
import { KibanaErrorBoundary, KibanaErrorBoundaryProvider } from '@kbn/shared-ux-error-boundary';
import React, { ComponentType, ReactElement, Ref, Suspense } from 'react';

import { Fallback } from './fallback';

/**
 * Optional services that the Suspense wrapper can use
 * @public
 */
export interface WithSuspenseExtendedDeps {
  /**
   * The `AnalyticsServiceStart` object from `CoreStart`
   */
  analytics?: AnalyticsServiceStart;
}

/**
 * A HOC which supplies React.Suspense with a fallback component, and a `KibanaErrorBoundary` to contain errors.
 * @param Component A component deferred by `React.lazy`
 * @param fallback A fallback component to render while things load; default is `Fallback` from SharedUX.
 */
export const withSuspense = <P extends {}, R = {}>(
  Component: ComponentType<P>,
  fallback: ReactElement | null = <Fallback />
) =>
  React.forwardRef((props: P & WithSuspenseExtendedDeps, ref: Ref<R>) => (
    <KibanaErrorBoundaryProvider analytics={props.analytics}>
      <KibanaErrorBoundary>
        <Suspense fallback={fallback}>
          <Component {...props} ref={ref} />
        </Suspense>
      </KibanaErrorBoundary>
    </KibanaErrorBoundaryProvider>
  ));
