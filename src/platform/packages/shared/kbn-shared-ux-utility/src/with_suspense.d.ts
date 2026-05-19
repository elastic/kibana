import type { AnalyticsServiceStart } from '@kbn/core-analytics-browser';
import type { ComponentType, ReactElement } from 'react';
import React from 'react';
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
export declare const withSuspense: <P extends {}, R = {}>(Component: ComponentType<P>, fallback?: ReactElement | null) => React.ForwardRefExoticComponent<React.PropsWithoutRef<P & WithSuspenseExtendedDeps> & React.RefAttributes<R>>;
