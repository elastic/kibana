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
import { CurrentRouteContextProvider } from './use_current_route';
import type { RouteMatch } from './types';
import { useMatchRoutes } from './use_match_routes';
import { InvalidRouteParamsException } from './errors/invalid_route_params_exception';

class ErrorCatcher extends React.Component<{
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

export function RouteRendererErrorBoundary({ children }: { children: React.ReactNode }) {
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
    <ErrorCatcher onError={handleError} pathname={location.pathname} search={location.search}>
      {children}
    </ErrorCatcher>
  );
}

export function RouteRenderer() {
  const matches: RouteMatch[] = useMatchRoutes();

  return matches
    .concat()
    .reverse()
    .reduce((prev, match) => {
      const { element } = match.route;
      return (
        <CurrentRouteContextProvider match={match} element={prev}>
          {element}
        </CurrentRouteContextProvider>
      );
    }, <></>);
}
