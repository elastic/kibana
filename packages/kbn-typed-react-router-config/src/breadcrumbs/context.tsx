/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ChromeBreadcrumb } from '@kbn/core/public';
import { compact, isEqual } from 'lodash';
import React, { createContext, useMemo, useState } from 'react';
import { useBreadcrumbs } from './use_breadcrumbs';
import { Route, RouteMatch, useMatchRoutes } from '../..';

export interface Breadcrumb {
  title: string;
  href: string;
}

interface BreadcrumbApi {
  set(route: Route, breadcrumb: Breadcrumb[]): void;
  unset(route: Route): void;
  getBreadcrumbs(matches: RouteMatch[]): Breadcrumb[];
}

export const BreadcrumbsContext = createContext<BreadcrumbApi | undefined>(undefined);

export function BreadcrumbsContextProvider({ children }: { children: React.ReactNode }) {
  const [, forceUpdate] = useState({});

  const breadcrumbs = useMemo(() => {
    return new Map<Route, Breadcrumb[]>();
  }, []);

  const matches: RouteMatch[] = useMatchRoutes();

  const api = useMemo<BreadcrumbApi>(
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

  const formattedBreadcrumbs: ChromeBreadcrumb[] = api
    .getBreadcrumbs(matches)
    .map((breadcrumb, index, array) => {
      return {
        text: breadcrumb.title,
        ...(index === array.length - 1
          ? {}
          : {
              href: breadcrumb.href,
            }),
      };
    });

  useBreadcrumbs(formattedBreadcrumbs);

  return <BreadcrumbsContext.Provider value={api}>{children}</BreadcrumbsContext.Provider>;
}
