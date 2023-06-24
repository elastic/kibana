/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { replace } from 'lodash';
import React, { Children } from 'react';
import {
  // eslint-disable-next-line no-restricted-imports
  Switch,
  useRouteMatch,
  Redirect as LegacyRedirect,
  RedirectProps as LegacyRedirectProps,
} from 'react-router-dom';
import {
  Routes as ReactRouterRoutes,
  CompatRoute,
  Route,
  Navigate,
} from 'react-router-dom-v5-compat';
import { Route as LegacyRoute, MatchPropagator } from './route';

export const Routes = ({
  legacySwitch = true,
  compat = false,
  children,
}: {
  legacySwitch?: boolean;
  compat?: boolean;
  children: React.ReactNode;
}) => {
  const match = useRouteMatch();

  return legacySwitch ? (
    <Switch>
      {compat
        ? Children.map(children, (child) => {
            if (React.isValidElement(child) && child.type === LegacyRoute) {
              return <CompatRoute {...child.props} />;
            }
            return child;
          })
        : children}
    </Switch>
  ) : (
    <ReactRouterRoutes>
      {Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          if (child.type === LegacyRoute && child.props.element) {
            return (
              <Route
                {...child.props}
                element={
                  <>
                    <MatchPropagator />
                    {child.props.element}
                  </>
                }
              />
            );
          }

          if (child.type === LegacyRoute && !child.props.element) {
            const path = replace(child?.props.path, match.url, '');
            const renderFunction =
              typeof child?.props.children === 'function'
                ? child?.props.children
                : child?.props.render;

            return (
              <Route
                path={path}
                {...(child?.props.path === match.url
                  ? { index: child?.props.path === match.url }
                  : { path })}
                element={
                  <>
                    {(child?.props?.component && <child.props.component />) ||
                      (renderFunction && renderFunction()) ||
                      children}
                  </>
                }
              />
            );
          }
          if (child.type === LegacyRedirect) {
            const childProps = child.props as LegacyRedirectProps;
            return (
              <Route path={childProps?.path} element={<Navigate to={childProps?.to} replace />} />
            );
          }
        }

        return child;
      })}
    </ReactRouterRoutes>
  );
};
