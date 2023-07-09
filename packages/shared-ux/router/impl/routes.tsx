/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { Children } from 'react';
// eslint-disable-next-line no-restricted-imports
import { Switch } from 'react-router-dom';
import { Routes as ReactRouterRoutes, Route } from 'react-router-dom-v5-compat';
import { Route as LegacyRoute, MatchPropagator } from './route';

export const Routes = ({
  legacySwitch = true,
  compat = true,
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
        if (React.isValidElement(child) && child.type === LegacyRoute) {
          const renderFunction =
            typeof child?.props.children === 'function'
              ? child?.props.children
              : child?.props.render;

          return (
            <Route
              path={child?.props.path}
              element={
                <>
                  <MatchPropagator />
                  {(child?.props?.component && <child.props.component />) ||
                    (renderFunction && renderFunction()) ||
                    children}
                </>
              }
            />
          );
        } else {
          return child;
        }
      })}
    </ReactRouterRoutes>
  );
};
