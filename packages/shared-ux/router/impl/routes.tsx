/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { replace } from 'lodash';
import React, { Children } from 'react';
// eslint-disable-next-line no-restricted-imports
import { Switch, useRouteMatch } from 'react-router-dom';
import { Routes as ReactRouterRoutes, Route } from 'react-router-dom-v5-compat';
import { MatchPropagator } from './route';

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
      {Children.map(children, (child) => (
        <Route
          path={replace(child.props.path, match.url + '/', '')}
          element={
            <>
              <MatchPropagator />
              {child.props.children}
            </>
          }
        />
      ))}
    </ReactRouterRoutes>
  );
};
