/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useLocation } from 'react-router-dom';
import { Route } from './types';
import { useRouter } from './use_router';

export function useParams(path: string) {
  // FIXME: using TRoutes instead of Route[] causes tsc
  // to fail with "RangeError: Maximum call stack size exceeded"
  const router = useRouter<Route[]>();
  const location = useLocation();

  return router.getParams(path as never, location);
}
