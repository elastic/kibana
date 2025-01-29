/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { CurrentRouteContextProvider } from './use_current_route';
import { RouteMatch } from './types';
import { useMatchRoutes } from './use_match_routes';

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
