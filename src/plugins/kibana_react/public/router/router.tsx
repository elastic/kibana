/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useMemo } from 'react';
import {
  PathRouteProps,
  Route as ReactRouterRoute,
  useLocation,
  useParams,
} from 'react-router-dom';
import { useKibana } from '../context';
import { useExecutionContext } from '../use_execution_context';

/**
 * It's a wrapper around the react-router-dom Route component that inserts
 * MatchPropagator in every application route. It helps track all route changes
 * and send them to the execution context, later used to enrich APM
 * 'route-change' transactions.
 */
export const Route = ({
  children,
  component: Component,
  render,
  ...rest
}: PathRouteProps & {
  component?: React.ComponentType<any> | undefined;
  render?: (args: any) => JSX.Element;
}) => {
  const component = useMemo(() => {
    if (!Component) {
      return undefined;
    }

    return (props: any) => (
      <>
        <MatchPropagator />
        <Component {...props} />
      </>
    );
  }, [Component]);

  if (component) {
    return <ReactRouterRoute {...rest} children={component} />;
  }
  if (render) {
    return (
      <ReactRouterRoute
        {...rest}
        children={(props: any) => (
          <>
            <MatchPropagator />
            {render(props)}
          </>
        )}
      />
    );
  }
  if (typeof children === 'function') {
    return (
      <ReactRouterRoute
        {...rest}
        children={(props: any) => (
          <>
            <MatchPropagator />
            {children(props)}
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

const MatchPropagator = () => {
  const { executionContext } = useKibana().services;
  const match = useLocation();
  const params = useParams();

  useExecutionContext(executionContext, {
    type: 'application',
    page: match.pathname,
    id: Object.keys(params).length > 0 ? JSON.stringify(params) : undefined,
  });

  return null;
};
