/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useLocation } from 'react-router-dom';
import { Match, PathsOf, Route } from './types';
import { useRouter } from './use_router';

export function useMatchRoutes<TRoutes extends Route[], TPath extends PathsOf<TRoutes>>(
  path: TPath
): Match<TRoutes, PathsOf<TRoutes>>;
export function useMatchRoutes<TRoutes extends Route[]>(): Match<TRoutes, PathsOf<TRoutes>>;

export function useMatchRoutes(path?: string) {
  const router = useRouter();
  const location = useLocation();

  return typeof path === 'undefined'
    ? router.matchRoutes(location)
    : router.matchRoutes(path as never, location);
}
