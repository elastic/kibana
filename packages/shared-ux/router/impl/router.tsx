/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useMemo } from 'react';
import {
  Route as ReactRouterRoute,
  RouteComponentProps,
  RouteProps,
  useRouteMatch,
} from 'react-router-dom';
import { useKibanaSharedUX } from './services';
import { useSharedUXExecutionContext } from './use_execution_context';

/**
 * This is a wrapper around the react-router-dom Route component that inserts
 * MatchPropagator in every application route. It helps track all route changes
 * and send them to the execution context, later used to enrich APM
 * 'route-change' transactions.
 */
export const Route = ({ children, component: Component, render, ...rest }: RouteProps) => {
  const component = useMemo(() => {
    if (!Component) {
      return undefined;
    }
    return (props: RouteComponentProps) => (
      <>
        <MatchPropagator />
        <Component {...props} />
      </>
    );
  }, [Component]);

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
            <MatchPropagator />
            {/* @ts-ignore  else condition exists if renderFunction is undefined*/}
            {renderFunction(props)}
          </>
        )}
      />
    );
  }
  return (
    <ReactRouterRoute {...rest}>
      <MatchPropagator />
      {children}
    </ReactRouterRoute>
  );
};

/**
 * The match propogator that is part of the Route
 */
const MatchPropagator = () => {
  const { executionContext } = useKibanaSharedUX().services;
  const match = useRouteMatch();

  useSharedUXExecutionContext(executionContext, {
    type: 'application',
    page: match.path,
    id: Object.keys(match.params).length > 0 ? JSON.stringify(match.params) : undefined,
  });

  return null;
};
