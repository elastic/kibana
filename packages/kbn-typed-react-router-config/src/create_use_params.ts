/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useLocation } from 'react-router-dom';
import { Route, Router, UseParams, PathsOf } from './types';

export function createUseParams<TRoutes extends Route[]>(
  router: Router<TRoutes>
): UseParams<TRoutes> {
  return function useParams<TPath extends PathsOf<TRoutes>>(path: TPath) {
    const location = useLocation();

    return router.getParams(path, location);
  };
}
