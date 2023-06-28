/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { Children } from 'react';
import {
  // eslint-disable-next-line no-restricted-imports
  Switch,
  Redirect as LegacyRedirect,
  RedirectProps as LegacyRedirectProps,
} from 'react-router-dom';
import { Routes as ReactRouterRoutes, Route, Navigate } from 'react-router-dom-v5-compat';
import { Route as LegacyRoute, MatchPropagatorV6 } from './route';

export const Routes = ({
  legacySwitch = true,
  compat = false,
  children,
}: {
  legacySwitch?: boolean;
  compat?: boolean;
  children: React.ReactNode;
}) => {
  return legacySwitch ? (
    <Switch>
      {Children.map(children, (child) => {
        if (React.isValidElement(child) && child.type === LegacyRoute) {
          return React.cloneElement(child, { compat });
        }

        return child;
      })}
    </Switch>
  ) : (
    <ReactRouterRoutes>
      {Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          // render v6 route directly
          if (child.type === LegacyRoute && child.props.element) {
            return (
              <Route
                {...child.props}
                element={
                  <>
                    <MatchPropagatorV6 />
                    {child.props.element}
                  </>
                }
              />
            );
          }

          // backwards compatibility for v5 routes
          if (child.type === LegacyRoute && !child.props.element) {
            // const path = replace(child?.props.path, match.url, '');
            const renderFunction =
              typeof child?.props.children === 'function'
                ? child?.props.children
                : child?.props.render;

            return (
              <Route
                path={child?.props.path}
                // {...(child?.props.path === match.url
                //   ? { index: child?.props.path === match.url }
                //   : { path })}
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
