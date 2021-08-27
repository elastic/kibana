/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useLocation } from 'react-router-dom';
import { RouteMatch } from './types';
import { useRouter } from './use_router';

export function useMatchRoutes(path?: string): RouteMatch[] {
  const router = useRouter();
  const location = useLocation();

  return typeof path === 'undefined'
    ? router.matchRoutes(location)
    : router.matchRoutes(path as never, location);
}
