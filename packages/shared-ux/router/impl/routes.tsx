/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { replace } from 'lodash';
import React, { Children } from 'react';
// eslint-disable-next-line no-restricted-imports
import { Switch, useRouteMatch } from 'react-router-dom';
import { Routes as ReactRouterRoutes, Route } from 'react-router-dom-v5-compat';
import { Route as LegacyRoute, MatchPropagator } from './route';

type RouterElementChildren = Array<
  React.ReactElement<
    {
      path: string;
      render: Function;
      children: RouterElementChildren;
      component: React.ComponentType;
    },
    string | React.JSXElementConstructor<unknown>
  >
>;

export const Routes = ({
  legacySwitch = true,
  children,
}: {
  legacySwitch?: boolean;
  children: React.ReactNode;
}) => {
  const match = useRouteMatch();

  return legacySwitch ? (
    <Switch>{children}</Switch>
  ) : (
    <ReactRouterRoutes>
      {Children.map(children as RouterElementChildren, (child) => {
        if (React.isValidElement(child) && child.type === LegacyRoute) {
          const path = replace(child?.props.path, match.url + '/', '');
          const renderFunction =
            typeof child?.props.children === 'function'
              ? child?.props.children
              : child?.props.render;

          return (
            <Route
              path={path}
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
