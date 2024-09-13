/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ChromeBreadcrumb, ScopedHistory } from '@kbn/core/public';
import { compact, isEqual } from 'lodash';
import React, { createContext, useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { useBreadcrumbs } from './use_breadcrumbs';
import {
  PathsOf,
  Route,
  RouteMap,
  RouteMatch,
  TypeAsArgs,
  TypeAsParams,
  TypeOf,
  useMatchRoutes,
  useRouter,
} from '../..';

export type Breadcrumb<TRouteMap extends RouteMap = RouteMap> = {
  title: string;
  path: PathsOf<TRouteMap>;
} & TypeAsParams<TypeOf<TRouteMap, PathsOf<TRouteMap>, false>>;

interface BreadcrumbApi<TRouteMap extends RouteMap = RouteMap> {
  set(route: Route, breadcrumb: Array<Breadcrumb<TRouteMap>>): void;
  unset(route: Route): void;
  getBreadcrumbs(matches: RouteMatch[]): Array<Breadcrumb<TRouteMap>>;
}

export const BreadcrumbsContext = createContext<BreadcrumbApi | undefined>(undefined);

export function BreadcrumbsContextProvider<TRouteMap extends RouteMap>({
  children,
}: {
  children: React.ReactNode;
}) {
  const [, forceUpdate] = useState({});

  const breadcrumbs = useMemo(() => {
    return new Map<Route, Array<Breadcrumb<TRouteMap>>>();
  }, []);

  const history = useHistory() as ScopedHistory;

  const router = useRouter<TRouteMap>();

  // const matches: RouteMatch[] = useMatchRoutes();

  const api = useMemo<BreadcrumbApi<TRouteMap>>(
    () => ({
      set(route, breadcrumb) {
        if (!isEqual(breadcrumbs.get(route), breadcrumb)) {
          breadcrumbs.set(route, breadcrumb);
          forceUpdate({});
        }
      },
      unset(route) {
        if (breadcrumbs.has(route)) {
          breadcrumbs.delete(route);
          forceUpdate({});
        }
      },
      getBreadcrumbs(currentMatches: RouteMatch[]) {
        return compact(
          currentMatches.flatMap((match) => {
            const breadcrumb = breadcrumbs.get(match.route);

            return breadcrumb;
          })
        );
      },
    }),
    [breadcrumbs]
  );

  // const formattedBreadcrumbs: ChromeBreadcrumb[] = api
  //   .getBreadcrumbs(matches)
  //   .map((breadcrumb, index, array) => {
  //     return {
  //       text: breadcrumb.title,
  //       ...(index === array.length - 1
  //         ? {}
  //         : {
  //             href: history.createHref({
  //               pathname: router.link(
  //                 breadcrumb.path,
  //                 ...(('params' in breadcrumb ? [breadcrumb.params] : []) as TypeAsArgs<
  //                   TypeOf<TRouteMap, PathsOf<TRouteMap>, false>
  //                 >)
  //               ),
  //             }),
  //           }),
  //     };
  //   });

  // useBreadcrumbs(formattedBreadcrumbs);

  return <BreadcrumbsContext.Provider value={api}>{children}</BreadcrumbsContext.Provider>;
}
