/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Match, PathsOf, Route } from './types';
import { useRouter } from './use_router';

export function useMatchRoutes<TRoutes extends Route[], TPath extends PathsOf<TRoutes>>(
  path: TPath
): Match<TRoutes, TPath> {
  const router = useRouter();
  return router.matchRoutes(path) as any;
}
