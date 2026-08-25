/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback } from 'react';
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
 * `patched` payload, triggering a re-render with valid params.
 *
 * Errors that are **not** `InvalidRouteParamsException` (including unrecoverable
 * decode failures) are always re-thrown upward.
 */
export function RouteSelfHealErrorBoundary({ children }: { children: React.ReactNode }) {
  const history = useHistory();
  const location = useLocation();

  const handleError = useCallback(
    (error: Error) => {
      if (error instanceof InvalidRouteParamsException) {
        history.replace({
          ...location,
          search: qs.stringify(error.patched.query),
        });
      } else {
        throw error;
      }
    },
    [history, location]
  );

  return (
    <ErrorBoundary onError={handleError} pathname={location.pathname} search={location.search}>
      {children}
    </ErrorBoundary>
  );
}
