/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useRouter } from './use_router';

export function useParams(...args: any[]) {
  const router = useRouter();
  const location = useLocation();

  let optional: boolean = false;

  const last: boolean | string | undefined = args[args.length - 1];

  if (typeof last === 'boolean') {
    optional = last;
    args.pop();
  }

  return useMemo(() => {
    // @ts-expect-error
    return router.getParams(...args, location, optional);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, ...args, location, optional]);
}
