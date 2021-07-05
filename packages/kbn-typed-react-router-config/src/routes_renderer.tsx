/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React, { ReactElement, createContext, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { PathsOf, Route, RouteMatch, Router } from './types';

export const RouteMatchContext = createContext<
  { match: RouteMatch; element: ReactElement } | undefined
>(undefined);

export function RoutesRenderer<TRoutes extends Route[]>({ router }: { router: Router<TRoutes> }) {
  const location = useLocation();

  const matches: RouteMatch[] = useMemo(() => {
    return router.matchRoutes(location.pathname as PathsOf<TRoutes>, location);
  }, [location, router]);

  return matches
    .concat()
    .reverse()
    .reduce((prev, match) => {
      const { element } = match.route;
      return (
        <RouteMatchContext.Provider value={{ match, element: prev }}>
          {element}
        </RouteMatchContext.Provider>
      );
    }, <></>);
}
