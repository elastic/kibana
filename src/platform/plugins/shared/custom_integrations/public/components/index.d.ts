import type { ComponentType, ReactElement } from 'react';
import React from 'react';
/**
 * A HOC which supplies React.Suspense with a fallback component, and a `EuiErrorBoundary` to contain errors.
 * @param Component A component deferred by `React.lazy`
 * @param fallback A fallback component to render while things load; default is `EuiLoadingSpinner`
 */
export declare const withSuspense: <P extends {}, R = {}>(Component: ComponentType<P>, fallback?: ReactElement | null) => React.ForwardRefExoticComponent<React.PropsWithoutRef<P> & React.RefAttributes<R>>;
export declare const LazyReplacementCard: React.LazyExoticComponent<({ eprPackageName }: import("./replacement_card").Props) => React.JSX.Element | null>;
