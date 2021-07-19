/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { last } from 'lodash';
import { useMatchRoutes } from './use_match_routes';
import { useRouter } from './use_router';

export function useRoutePath() {
  const lastRouteMatch = last(useMatchRoutes());
  const router = useRouter();
  if (!lastRouteMatch) {
    throw new Error('No route was matched');
  }

  return router.getRoutePath(lastRouteMatch.route);
}
