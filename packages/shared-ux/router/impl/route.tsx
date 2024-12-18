/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo } from 'react';
import {
  // eslint-disable-next-line no-restricted-imports
  Route as ReactRouterRoute,
  RouteComponentProps,
  RouteProps,
  useRouteMatch,
} from 'react-router-dom';
import { useSharedUXRoutesContext } from './routes_context';
import { useKibanaSharedUX } from './services';
import { useSharedUXExecutionContext } from './use_execution_context';

/**
 * This is a wrapper around the react-router-dom Route component that inserts
 * MatchPropagator in every application route. It helps track all route changes
 * and send them to the execution context, later used to enrich APM
 * 'route-change' transactions.
 */
export const Route = <T extends {}>({
  children,
  component: Component,
  render,
  ...rest
}: RouteProps<string, { [K: string]: string } & T>) => {
  const { enableExecutionContextTracking } = useSharedUXRoutesContext();
  const component = useMemo(() => {
    if (!Component) {
      return undefined;
    }
    return (props: RouteComponentProps) => (
      <>
        {enableExecutionContextTracking && <MatchPropagator />}
        <Component {...props} />
      </>
    );
  }, [Component, enableExecutionContextTracking]);

  if (component) {
    return <ReactRouterRoute {...rest} component={component} />;
  }
  if (render || typeof children === 'function') {
    const renderFunction = typeof children === 'function' ? children : render;
    return (
      <ReactRouterRoute
        {...rest}
        render={(props) => (
          <>
            {enableExecutionContextTracking && <MatchPropagator />}
            {/* @ts-ignore  else condition exists if renderFunction is undefined*/}
            {renderFunction(props)}
          </>
        )}
      />
    );
  }
  return (
    <ReactRouterRoute {...rest}>
      {enableExecutionContextTracking && <MatchPropagator />}
      {children}
    </ReactRouterRoute>
  );
};

/**
 * The match propagator that is part of the Route
 */
export const MatchPropagator = () => {
  const { executionContext } = useKibanaSharedUX().services;
  const match = useRouteMatch();

  if (!executionContext && process.env.NODE_ENV !== 'production') {
    throw new Error(
      'Default execution context tracking is enabled but the executionContext service is not available'
    );
  }

  useSharedUXExecutionContext(executionContext, {
    type: 'application',
    page: match.path,
    id: Object.keys(match.params).length > 0 ? JSON.stringify(match.params) : undefined,
  });

  return null;
};
