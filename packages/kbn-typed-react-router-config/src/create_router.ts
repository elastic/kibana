/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { isLeft } from 'fp-ts/lib/Either';
import { Location } from 'history';
import { PathReporter } from 'io-ts/lib/PathReporter';
import {
  matchRoutes as matchRoutesConfig,
  RouteConfig as ReactRouterConfig,
} from 'react-router-config';
import qs from 'query-string';
import { findLastIndex, merge } from 'lodash';
import { deepExactRt } from '@kbn/io-ts-utils/target/deep_exact_rt';
import { Route, Router } from './types';

export function createRouter<TRoutes extends Route[]>(routes: TRoutes): Router<TRoutes> {
  const routesByReactRouterConfig = new Map<ReactRouterConfig, Route>();

  const reactRouterConfigs = routes.map((route) => toReactRouterConfigRoute(route));

  function toReactRouterConfigRoute(route: Route, prefix: string = ''): ReactRouterConfig {
    const path = `${prefix}${route.path}`.replace(/\/{2,}/g, '/').replace(/\/$/, '');
    const reactRouterConfig: ReactRouterConfig = {
      component: () => route.element,
      routes: route.children?.map((child) => toReactRouterConfigRoute(child, path)) ?? [],
      exact: true,
      path,
    };

    routesByReactRouterConfig.set(reactRouterConfig, route);

    return reactRouterConfig;
  }

  const matchRoutes = (path: string, location: Location) => {
    const matches = matchRoutesConfig(reactRouterConfigs, location.pathname);

    const indexOfMatch = findLastIndex(matches, (match) => match.match.path === path);

    if (indexOfMatch === -1) {
      throw new Error(`No matching route found for ${path}`);
    }

    return matches.slice(0, indexOfMatch + 1).map((matchedRoute) => {
      const route = routesByReactRouterConfig.get(matchedRoute.route);

      if (route?.params) {
        const decoded = deepExactRt(route.params).decode({
          path: matchedRoute.match.params,
          query: qs.parse(location.search),
        });

        if (isLeft(decoded)) {
          throw new Error(PathReporter.report(decoded).join('\n'));
        }

        return {
          match: {
            params: decoded.right,
          },
          route,
        };
      }

      return {
        match: {
          params: {},
        },
        route,
      };
    });
  };

  return {
    getParams: (path, location) => {
      const matches = matchRoutes(path, location);
      return merge({ path: {}, query: {} }, ...matches.map((match) => match.match.params));
    },
    matchRoutes: (path, location) => {
      return matchRoutes(path, location) as any;
    },
  };
}
