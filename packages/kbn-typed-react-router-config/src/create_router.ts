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
import { findLastIndex, merge, compact } from 'lodash';
import { deepExactRt } from '@kbn/io-ts-utils/target/deep_exact_rt';
import { mergeRt } from '@kbn/io-ts-utils/target/merge_rt';
import { Route, Router } from './types';

export function createRouter<TRoutes extends Route[]>(routes: TRoutes): Router<TRoutes> {
  const routesByReactRouterConfig = new Map<ReactRouterConfig, Route>();
  const reactRouterConfigsByRoute = new Map<Route, ReactRouterConfig>();

  const reactRouterConfigs = routes.map((route) => toReactRouterConfigRoute(route));

  function toReactRouterConfigRoute(route: Route, prefix: string = ''): ReactRouterConfig {
    const path = `${prefix}${route.path}`.replace(/\/{2,}/g, '/').replace(/\/$/, '') || '/';
    const reactRouterConfig: ReactRouterConfig = {
      component: () => route.element,
      routes:
        (route.children as Route[] | undefined)?.map((child) =>
          toReactRouterConfigRoute(child, path)
        ) ?? [],
      exact: !route.children?.length,
      path,
    };

    routesByReactRouterConfig.set(reactRouterConfig, route);
    reactRouterConfigsByRoute.set(route, reactRouterConfig);

    return reactRouterConfig;
  }

  const matchRoutes = (...args: any[]) => {
    let path: string = args[0];
    let location: Location = args[1];

    if (args.length === 1) {
      location = args[0] as Location;
      path = location.pathname;
    }

    const greedy = path.endsWith('/*') || args.length === 1;

    if (!path) {
      path = '/';
    }

    const matches = matchRoutesConfig(reactRouterConfigs, location.pathname);

    const matchIndex = greedy
      ? matches.length - 1
      : findLastIndex(matches, (match) => match.route.path === path);

    if (matchIndex === -1) {
      throw new Error(`No matching route found for ${path}`);
    }

    return matches.slice(0, matchIndex + 1).map((matchedRoute) => {
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
            ...matchedRoute.match,
            params: decoded.right,
          },
          route,
        };
      }

      return {
        match: {
          ...matchedRoute.match,
          params: {
            path: {},
            query: {},
          },
        },
        route,
      };
    });
  };

  const link = (path: string, ...args: any[]) => {
    const params: { path?: Record<string, any>; query?: Record<string, any> } | undefined = args[0];

    const paramsWithDefaults = merge({ path: {}, query: {} }, params);

    path = path
      .split('/')
      .map((part) => {
        return part.startsWith(':') ? paramsWithDefaults.path[part.split(':')[1]] : part;
      })
      .join('/');

    const matches = matchRoutesConfig(reactRouterConfigs, path);

    if (!matches.length) {
      throw new Error(`No matching route found for ${path}`);
    }

    const validationType = mergeRt(
      ...(compact(
        matches.map((match) => {
          return routesByReactRouterConfig.get(match.route)?.params;
        })
      ) as [any, any])
    );

    const validation = validationType.decode(paramsWithDefaults);

    if (isLeft(validation)) {
      throw new Error(PathReporter.report(validation).join('\n'));
    }

    return qs.stringifyUrl({
      url: path,
      query: paramsWithDefaults.query,
    });
  };

  return {
    link: (path, ...args) => {
      return link(path, ...args);
    },
    getParams: (path, location) => {
      const matches = matchRoutes(path, location);
      return merge({ path: {}, query: {} }, ...matches.map((match) => match.match.params));
    },
    matchRoutes: (...args: any[]) => {
      return matchRoutes(...args) as any;
    },
    getRoutePath: (route) => {
      return reactRouterConfigsByRoute.get(route)!.path as string;
    },
  };
}
