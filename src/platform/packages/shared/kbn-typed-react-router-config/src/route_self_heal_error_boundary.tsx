/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useEffect, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import qs from 'query-string';
import { InvalidRouteParamsException } from './errors';

class ErrorBoundary extends React.Component<{
  children: React.ReactNode;
  pathname: string;
  search: string;
  onError: (error: Error) => void;
}> {
  state = { hasError: false };

  componentDidUpdate(prevProps: { pathname: string; search: string }) {
    if (
      (this.props.pathname !== prevProps.pathname || this.props.search !== prevProps.search) &&
      this.state.hasError
    ) {
      this.setState({ hasError: false });
    }
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    this.props.onError(error);
  }

  render() {
    return this.state.hasError ? null : this.props.children;
  }
}

/**
 * Error boundary that intercepts {@link InvalidRouteParamsException} thrown by
 * `router.matchRoutes` (or the `useMatchRoutes` hook) and attempts to self-heal
 * the URL by replacing malformed query parameters with their route-defined defaults.
 *
 * When an `InvalidRouteParamsException` is caught, the component calls
 * `history.replace` with the corrected query string carried in the exception's
 * `patched` payload, triggering a re-render with valid params. A `retried` flag
 * prevents infinite redirect loops — if the re-render still fails, the error is
 * re-thrown so an ancestor error boundary can handle it. The flag resets whenever
 * `location.pathname` or `location.search` changes.
 *
 * Errors that are **not** `InvalidRouteParamsException` (including unrecoverable
 * decode failures) are always re-thrown upward.
 *
 * ### Placement in the React tree
 *
 * 1. **Below `RouterProvider`** — this component uses `useHistory` and
 *    `useLocation`, which require a router context to be present above it.
 *
 * 2. **Below any application-level error boundary** — this component intercepts
 *    `InvalidRouteParamsException` to attempt self-healing and re-throws all
 *    other errors (as well as unrecoverable ones) upward. Application error
 *    boundaries must be placed above so they do not intercept
 *    `InvalidRouteParamsException` prematurely and so they can catch errors
 *    re-thrown from here.
 *
 * 3. **Above any component that calls `useMatchRoutes` or `router.matchRoutes`
 *    directly** — `InvalidRouteParamsException` is thrown from within
 *    `router.matchRoutes`, so any component invoking these methods must be a
 *    descendant of this boundary for self-healing to work.
 *
 * @example
 * ```tsx
 * <RouterProvider router={router} history={history}>
 *   <AppErrorBoundary>
 *     <RouteSelfHealErrorBoundary>
 *       <RouteRenderer />
 *     </RouteSelfHealErrorBoundary>
 *   </AppErrorBoundary>
 * </RouterProvider>
 * ```
 */
export function RouteSelfHealErrorBoundary({ children }: { children: React.ReactNode }) {
  const history = useHistory();
  const location = useLocation();
  const [retried, setRetried] = useState(false);

  const handleError = useCallback(
    (error: Error) => {
      if (error instanceof InvalidRouteParamsException && !retried) {
        setRetried(true);
        history.replace({
          ...location,
          search: qs.stringify(error.patched.query),
        });
      } else {
        throw error;
      }
    },
    [history, location, retried]
  );

  useEffect(() => {
    setRetried(false);
  }, [location.pathname, location.search]);

  return (
    <ErrorBoundary onError={handleError} pathname={location.pathname} search={location.search}>
      {children}
    </ErrorBoundary>
  );
}
