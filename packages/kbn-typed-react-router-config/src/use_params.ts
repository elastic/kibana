/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useLocation } from 'react-router-dom';
import { useRouter } from './use_router';

export function useParams(path: string, optional: boolean = false) {
  const router = useRouter();
  const location = useLocation();

  return router.getParams(path as never, location, optional);
}
