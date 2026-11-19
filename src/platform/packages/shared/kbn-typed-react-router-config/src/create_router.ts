/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { deepExactRt, mergeRt } from '@kbn/io-ts-utils';
import { isLeft, isRight } from 'fp-ts/Either';
import type { Location } from 'history';
import type { Errors } from 'io-ts';
import { PathReporter } from 'io-ts/lib/PathReporter';
import { isZod } from '@kbn/zod/v4';
import type { z } from '@kbn/zod/v4';
import { compact, findLastIndex, mapValues, merge, orderBy } from 'lodash';
import qs from 'query-string';
import type { MatchedRoute, RouteConfig as ReactRouterConfig } from 'react-router-config';
import { matchRoutes as matchRoutesConfig } from 'react-router-config';
import type {
  FlattenRoutesOf,
  Route,
  RouteMap,
  RouteParamsRT,
  Router,
  RouteWithPath,
} from './types';
import { encodePath } from './encode_path';
import { InvalidRouteParamsException } from './errors/invalid_route_params_exception';
import { NotFoundRouteException } from './errors';

export const MAX_PATH_LENGTH = 100_000;

export function toReactRouterPath(path: string) {
  if (path?.length > MAX_PATH_LENGTH) {
    throw new Error('Path is too long to process');
  }

  return path.replace(/(?:{([^\/{}]+)})/g, ':$1');
}

function extractFailingQueryKeys(errors: Errors): Set<string> {
  const keys = new Set<string>();
  for (const error of errors) {
    const { context } = error;
    let foundQuery = false;
    for (let i = 0; i < context.length; i++) {
      if (!foundQuery) {
        if (context[i].key === 'query') {
          foundQuery = true;
        }
      } else {
        // Skip numeric keys from intersection/union wrappers
        if (context[i].key && !Number.isInteger(Number(context[i].key))) {
          keys.add(context[i].key);
          break;
        }
      }
    }
  }
  return keys;
}

// zod counterpart of extractFailingQueryKeys: an issue path looks like
// ['query', <key>, ...], so take the first non-numeric segment after 'query'.
function extractFailingQueryKeysZod(error: z.ZodError): Set<string> {
  const keys = new Set<string>();
  for (const issue of error.issues) {
    const queryIndex = issue.path.indexOf('query');
    if (queryIndex === -1) {
      continue;
    }
    for (let i = queryIndex + 1; i < issue.path.length; i++) {
      const segment = issue.path[i];
      if (typeof segment === 'string' && !Number.isInteger(Number(segment))) {
        keys.add(segment);
        break;
      }
    }
  }
  return keys;
}

interface DecodeSuccess {
  ok: true;
  value: any;
}
interface DecodeFailure {
  ok: false;
  failingQueryKeys: Set<string>;
  report: string;
}
type DecodeResult = DecodeSuccess | DecodeFailure;

// Validates {path, query} against a route's params codec, branching on whether
// it's io-ts (default) or zod (io-ts -> zod migration). io-ts routes keep the
// exact-decode behavior; zod routes use safeParse. On failure both surface the
// query keys that failed, so matchRoutes can retry with defaults identically.
function decodeRouteParams(params: RouteParamsRT, input: unknown): DecodeResult {
  if (isZod(params)) {
    const result = params.safeParse(input);
    if (result.success) {
      return { ok: true, value: result.data };
    }
    return {
      ok: false,
      failingQueryKeys: extractFailingQueryKeysZod(result.error),
      report: result.error.issues
        .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
        .join('\n'),
    };
  }

  const decoded = deepExactRt(params).decode(input);
  if (isRight(decoded)) {
    return { ok: true, value: decoded.right };
  }
  return {
    ok: false,
    failingQueryKeys: extractFailingQueryKeys(decoded.left),
    report: PathReporter.report(decoded).join('\n'),
  };
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

    const parsedQuery = qs.parse(location.search, { decode: true });
    const results: Array<{ match: any; route: Route | undefined }> = [];
    const allPatchedKeys = new Map<string, any>();
    const errorMessages: string[] = [];
    let hasUnrecoverableError = false;

    for (const matchedRoute of matches.slice(0, matchIndex + 1)) {
      const route = routesByReactRouterConfig.get(matchedRoute.route);

      if (!route?.params) {
        results.push({
          match: { ...matchedRoute.match, params: { path: {}, query: {} } },
          route,
        });
        continue;
      }

      const pathParams = mapValues(matchedRoute.match.params, (value) => {
        return decodeURIComponent(value);
      });

      const decoded = decodeRouteParams(
        route.params,
        merge({}, route.defaults ?? {}, {
          path: pathParams,
          query: parsedQuery,
        })
      );

      if (decoded.ok) {
        results.push({
          match: { ...matchedRoute.match, params: decoded.value },
          route,
        });
        continue;
      }

      const failingKeys = decoded.failingQueryKeys;
      const defaultQuery = (route.defaults?.query as Record<string, string>) ?? {};
      const patchedQuery: Record<string, any> = { ...parsedQuery };

      for (const key of failingKeys) {
        if (key in defaultQuery) {
          patchedQuery[key] = defaultQuery[key];
        } else {
          delete patchedQuery[key];
        }
      }

      const retryDecoded = decodeRouteParams(
        route.params,
        merge({}, route.defaults ?? {}, {
          path: pathParams,
          query: patchedQuery,
        })
      );

      if (retryDecoded.ok) {
        errorMessages.push(decoded.report);
        for (const key of failingKeys) {
          allPatchedKeys.set(key, patchedQuery[key]);
        }
        results.push({
          match: { ...matchedRoute.match, params: retryDecoded.value },
          route,
        });
      } else {
        hasUnrecoverableError = true;
        errorMessages.push(decoded.report);
      }
    }

    if (hasUnrecoverableError) {
      throw new Error(errorMessages.join('\n'));
    }

    if (allPatchedKeys.size > 0) {
      const mergedQuery: Record<string, any> = { ...parsedQuery };
      for (const [key, value] of allPatchedKeys) {
        if (value === undefined) {
          delete mergedQuery[key];
        } else {
          mergedQuery[key] = value;
        }
      }
      throw new InvalidRouteParamsException(errorMessages.join('\n'), {
        path: results[results.length - 1]?.match.params.path ?? {},
        query: mergedQuery,
      });
    }

    return results;
  };

  const link = (path: string, ...args: any[]) => {
    const params: { path?: Record<string, any>; query?: Record<string, any> } | undefined = args[0];

    const paramsWithBuiltInDefaults = merge({ path: {}, query: {} }, params);

    path = encodePath(path, paramsWithBuiltInDefaults?.path);

    const matchedRoutes = getRoutesToMatch(path);

    const matchedParams = compact(matchedRoutes.map((route) => route.params));

    const paramsWithRouteDefaults = merge(
      {},
      ...matchedRoutes.map((route) => route.defaults ?? {}),
      paramsWithBuiltInDefaults
    );

    if (matchedParams.some((matchedParam) => isZod(matchedParam))) {
      // Mixed or all-zod chain: validate each route's params independently
      // (non-strict, so sibling routes' keys are ignored) instead of merging
      // io-ts and zod codecs, which cannot be combined.
      for (const matchedParam of matchedParams) {
        const decoded = decodeRouteParams(matchedParam, paramsWithRouteDefaults);
        if (!decoded.ok) {
          throw new Error(decoded.report);
        }
      }
    } else {
      const validationType = mergeRt(...(matchedParams as [any, any]));
      const validation = validationType.decode(paramsWithRouteDefaults);

      if (isLeft(validation)) {
        throw new Error(PathReporter.report(validation).join('\n'));
      }
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
