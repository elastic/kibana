/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useContext, useEffect, useRef } from 'react';
import { castArray } from 'lodash';
import { PathsOf, RouteMap, useCurrentRoute } from '../..';
import { Breadcrumb, BreadcrumbsContext } from './context';

type UseBreadcrumbs<TRouteMap extends RouteMap> = <TPath extends PathsOf<TRouteMap>>(
  callback: () => Breadcrumb<TRouteMap, TPath> | Array<Breadcrumb<TRouteMap, TPath>>,
  fnDeps: unknown[]
) => void;

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

export function createUseBreadcrumbs<TRouteMap extends RouteMap>(): UseBreadcrumbs<TRouteMap> {
  return useRouterBreadcrumb;
}
