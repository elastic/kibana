/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useContext, useEffect, useRef } from 'react';
import { castArray } from 'lodash';
import { useCurrentRoute } from '../..';
import { Breadcrumb, BreadcrumbsContext } from './context';

export function useRouterBreadcrumb(callback: () => Breadcrumb | Breadcrumb[], fnDeps: any[]) {
  const api = useContext(BreadcrumbsContext);

  if (!api) {
    throw new Error('Missing Breadcrumb API in context');
  }

  const { match } = useCurrentRoute();

  const matchedRoute = useRef(match?.route);

  useEffect(() => {
    if (matchedRoute.current && matchedRoute.current !== match?.route) {
      api.unset(matchedRoute.current);
    }

    matchedRoute.current = match?.route;

    if (matchedRoute.current) {
      api.set(matchedRoute.current, castArray(callback()));
    }

    return () => {
      if (matchedRoute.current) {
        api.unset(matchedRoute.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchedRoute.current, match?.route, ...fnDeps]);
}
