/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useLocation } from 'react-router-dom';
import { PathsOf, Route, Router, UseRouteMatch } from './types';

export function createUseRouteMatch<TRoutes extends Route[]>(
  router: Router<TRoutes>
): UseRouteMatch<TRoutes> {
  return function useRouteMatch<TPath extends PathsOf<TRoutes>>(path: TPath) {
    const location = useLocation();

    return router.matchRoutes(path, location);
  };
}
