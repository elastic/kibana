/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useMemo } from 'react';
import {
  // eslint-disable-next-line no-restricted-imports
  Route as ReactRouterRoute,
  RouteComponentProps,
  RouteProps,
  useRouteMatch,
  Redirect,
} from 'react-router-dom';
import { CompatRoute } from 'react-router-dom-v5-compat';
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
  compat,
  ...rest
}: RouteProps<string, { [K: string]: string } & T> & { compat?: boolean }) => {
  const ReactRouterRouteComponent =
    // CompatRoute doesn't support wildcard routes, so we need to use v5 Route
    compat && !rest.path?.endsWith('*') ? CompatRoute : ReactRouterRoute;
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

  /*
    CompatRoute doesn't support wildcard routes, so we need to use v5 Route
    and if we have wildcard path in Redirect we need to manually pass the matched
    dynamic path to the Redirect component
  */
  if (
    compat &&
    rest.path?.endsWith('*') &&
    children?.type === Redirect &&
    children?.props?.to.endsWith('*')
  ) {
    return (
      <ReactRouterRoute
        {...rest}
        render={(props) => (
          <Redirect to={children.props.to.split('*')[0] + props.match.params[0]} />
        )}
      />
    );
  }

  if (component) {
    return <ReactRouterRouteComponent {...rest} component={component} />;
  }

  if (render || typeof children === 'function') {
    const renderFunction = typeof children === 'function' ? children : render;
    return (
      <ReactRouterRouteComponent
        {...rest}
        render={(props: RouteProps) => (
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
    <ReactRouterRouteComponent {...rest}>
      <MatchPropagator />
      {children}
    </ReactRouterRouteComponent>
  );
};

/**
 * The match propagator that is part of the Route
 */
export const MatchPropagator = () => {
  const { executionContext } = useKibanaSharedUX().services;
  const match = useRouteMatch();

  useSharedUXExecutionContext(executionContext, {
    type: 'application',
    page: match.path,
    id: Object.keys(match.params).length > 0 ? JSON.stringify(match.params) : undefined,
  });

  return null;
};
