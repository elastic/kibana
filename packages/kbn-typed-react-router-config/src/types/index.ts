/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { Location } from 'history';
import * as t from 'io-ts';
import { ReactElement } from 'react';
import { ValuesType, UnionToIntersection } from 'utility-types';
import { NormalizePath, MapProperty } from './utils';

type PathsOfRoute<TRoute extends Route, TPrefix extends string> =
  | (TRoute extends { children: Route[] }
      ? PathsOf<TRoute['children'], NormalizePath<`${TPrefix}${TRoute['path']}`>>
      : never)
  | NormalizePath<`${TPrefix}${TRoute['path']}`>;

export type PathsOf<Routes extends any[], TPrefix extends string = ''> = Routes extends [
  infer TRoute,
  ...infer TTail
]
  ? (TRoute extends Route ? PathsOfRoute<TRoute, TPrefix> : never) | PathsOf<TTail, TPrefix>
  : Routes extends [infer TRoute]
  ? TRoute extends Route
    ? PathsOfRoute<TRoute, TPrefix>
    : never
  : never;

interface RouteMatch<TRoute extends Route = Route> {
  route: TRoute;
  match: {
    params: TRoute extends { params: t.Type<any> } ? t.OutputOf<TRoute['params']> : {};
  };
}

type MatchRoute<TRoute extends Route, TPath extends string> = [
  ...(TPath extends TRoute['path']
    ? [
        RouteMatch<TRoute>,
        ...(TRoute['path'] extends '/'
          ? TRoute extends { children: Route[] }
            ? Match<TRoute['children'], TPath>
            : []
          : [])
      ]
    : TPath extends `${TRoute['path']}${infer TRest}`
    ? TRoute extends { children: Route[] }
      ? TRest extends string
        ? Match<TRoute['children'], NormalizePath<`/${TRest}`>> extends
            | [RouteMatch]
            | [RouteMatch, ...RouteMatch[]]
          ? [RouteMatch<TRoute>, ...Match<TRoute['children'], NormalizePath<`/${TRest}`>>]
          : []
        : []
      : []
    : [])
];

export type Match<TRoutes extends any[], TPath extends string> = [
  ...(TRoutes extends [infer TRoute, ...infer TTail]
    ? TRoute extends Route
      ? [...MatchRoute<TRoute, TPath>, ...(TTail extends Route[] ? Match<TTail, TPath> : [])]
      : []
    : TRoutes extends [infer TRoute]
    ? TRoute extends Route
      ? MatchRoute<TRoute, TPath>
      : []
    : [])
];

export interface Route {
  path: string;
  element: ReactElement;
  children?: Route[];
  params?: t.Type<any>;
}

export interface Router<TRoutes extends Route[]> {
  matchRoutes<TPath extends PathsOf<TRoutes>>(
    path: TPath,
    location: Location
  ): Match<TRoutes, TPath>;
  getParams<TPath extends PathsOf<TRoutes>>(
    path: TPath,
    location: Location
  ): UnionToIntersection<
    ValuesType<MapProperty<MapProperty<Match<TRoutes, TPath>, 'match'>, 'params'>>
  >;
}

export type UseParams<TRoutes extends Route[]> = <TPath extends PathsOf<TRoutes>>(
  path: TPath
) => UnionToIntersection<
  ValuesType<MapProperty<MapProperty<Match<TRoutes, TPath>, 'match'>, 'params'>>
>;

export type UseRouteMatch<TRoutes extends Route[]> = <TPath extends PathsOf<TRoutes>>(
  path: TPath
) => Match<TRoutes, TPath>;
