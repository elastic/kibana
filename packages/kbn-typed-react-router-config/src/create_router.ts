/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { deepExactRt, mergeRt } from '@kbn/io-ts-utils';
import { isLeft } from 'fp-ts/lib/Either';
import { Location } from 'history';
import { PathReporter } from 'io-ts/lib/PathReporter';
import { compact, findLastIndex, merge, orderBy } from 'lodash';
import qs from 'query-string';
import {
  MatchedRoute,
  matchRoutes as matchRoutesConfig,
  RouteConfig as ReactRouterConfig,
} from 'react-router-config';
import { FlattenRoutesOf, Route, RouteMap, Router, RouteWithPath } from './types';

function toReactRouterPath(path: string) {
  return path.replace(/(?:{([^\/]+)})/g, ':$1');
}

export class NotFoundRouteException extends Error {
  constructor(message: string) {
    super(message);
  }
}

export function createRouter<TRoutes extends RouteMap>(routes: TRoutes): Router<TRoutes> {
  const routesByReactRouterConfig = new Map<ReactRouterConfig, Route>();
  const reactRouterConfigsByRoute = new Map<Route, ReactRouterConfig>();

  const reactRouterConfigs = Object.entries(routes).map(([path, route]) =>
    toReactRouterConfigRoute({ ...route, path })
  );

  function toReactRouterConfigRoute(route: RouteWithPath): ReactRouterConfig {
    const reactRouterConfig: ReactRouterConfig = {
      component: () => route.element,
      routes:
        Object.entries((route.children as RouteMap | undefined) ?? {})?.map(([path, child]) =>
          toReactRouterConfigRoute({ ...child, path })
        ) ?? [],
      exact: !route.children || Object.values(route.children).length === 0,
      path: toReactRouterPath(route.path),
    };

    routesByReactRouterConfig.set(reactRouterConfig, route);
    reactRouterConfigsByRoute.set(route, reactRouterConfig);

    return reactRouterConfig;
  }

  function getRoutesToMatch(path: string) {
    const matches = matchRoutesConfig(reactRouterConfigs, toReactRouterPath(path));

    if (!matches.length) {
      throw new Error(`No matching route found for ${path}`);
    }

    const matchedRoutes = matches.map((match) => {
      return routesByReactRouterConfig.get(match.route)!;
    });

    return matchedRoutes;
  }

  const matchRoutes = (...args: any[]) => {
    let optional: boolean = false;

    if (typeof args[args.length - 1] === 'boolean') {
      optional = args[args.length - 1];
      args.pop();
    }

    const location: Location = args[args.length - 1];
    args.pop();

    let paths: string[] = args;

    if (paths.length === 0) {
      paths = [location.pathname || '/'];
    }

    let matches: Array<MatchedRoute<{}, ReactRouterConfig>> = [];
    let matchIndex: number = -1;

    const pathsWithScore = paths.map((path) => {
      const greedy = path.endsWith('/*') || args.length === 0 ? 1 : 0;
      return {
        length: path.length,
        greedy,
        path,
      };
    });

    const sortedPaths = orderBy(pathsWithScore, ['greedy', 'length'], ['desc', 'desc']);

    for (const { path, greedy } of sortedPaths) {
      matches = matchRoutesConfig(reactRouterConfigs, toReactRouterPath(location.pathname));

      matchIndex = greedy
        ? matches.length - 1
        : findLastIndex(matches, (match) => match.route.path === toReactRouterPath(path));

      if (matchIndex !== -1) {
        break;
      }
      matchIndex = -1;
    }

    if (matchIndex === -1) {
      if (optional) {
        return [];
      }

      let errorMessage: string;

      if (paths.length === 1) {
        errorMessage = `${paths[0]} does not match current path ${location.pathname}`;
      } else {
        errorMessage = `None of ${paths.join(', ')} match current path ${location.pathname}`;
      }
      throw new Error(errorMessage);
    }

    const hasExactMatch = matches.some((match) => match.match.isExact);
    if (!hasExactMatch) {
      throw new NotFoundRouteException('No route was matched');
    }

    return matches.slice(0, matchIndex + 1).map((matchedRoute) => {
      const route = routesByReactRouterConfig.get(matchedRoute.route);

      if (route?.params) {
        const decoded = deepExactRt(route.params).decode(
          merge({}, route.defaults ?? {}, {
            path: matchedRoute.match.params,
            query: qs.parse(location.search, { decode: true }),
          })
        );

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

    const paramsWithBuiltInDefaults = merge({ path: {}, query: {} }, params);

    path = path
      .split('/')
      .map((part) => {
        const match = part.match(/(?:{([a-zA-Z]+)})/);
        return match ? paramsWithBuiltInDefaults.path[match[1]] : part;
      })
      .join('/');

    const matchedRoutes = getRoutesToMatch(path);

    const validationType = mergeRt(
      ...(compact(
        matchedRoutes.map((match) => {
          return match.params;
        })
      ) as [any, any])
    );

    const paramsWithRouteDefaults = merge(
      {},
      ...matchedRoutes.map((route) => route.defaults ?? {}),
      paramsWithBuiltInDefaults
    );

    const validation = validationType.decode(paramsWithRouteDefaults);

    if (isLeft(validation)) {
      throw new Error(PathReporter.report(validation).join('\n'));
    }

    return qs.stringifyUrl(
      {
        url: path,
        query: paramsWithRouteDefaults.query,
      },
      { encode: true }
    );
  };

  return {
    link: (path, ...args) => {
      return link(path, ...args);
    },
    getParams: (...args: any[]) => {
      const matches = matchRoutes(...args);
      return matches.length
        ? merge(
            { path: {}, query: {} },
            ...matches.map((match) => merge({}, match.route?.defaults ?? {}, match.match.params))
          )
        : undefined;
    },
    matchRoutes: (...args: any[]) => {
      return matchRoutes(...args) as any;
    },
    getRoutePath: (route) => {
      return route.path;
    },
    getRoutesToMatch: (path: string) => {
      return getRoutesToMatch(path) as unknown as FlattenRoutesOf<TRoutes>;
    },
  };
}
