/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as t from 'io-ts';
import { ReactElement } from 'react';
import { ValuesType } from 'utility-types';
import { NormalizePath, MapProperty } from './utils';

type PathsOfRoute<
  TRoute extends Route,
  TAllowWildcards extends boolean = false,
  TPrefix extends string = ''
> =
  | (TRoute extends {
      children: Route[];
    }
      ? TAllowWildcards extends true
        ?
            | PathsOf<
                TRoute['children'],
                TAllowWildcards,
                NormalizePath<`${TPrefix}${TRoute['path']}`>
              >
            | NormalizePath<`${TPrefix}${TRoute['path']}/*`>
        : PathsOf<TRoute['children'], TAllowWildcards, NormalizePath<`${TPrefix}${TRoute['path']}`>>
      : never)
  | NormalizePath<`${TPrefix}${TRoute['path']}`>;

export type PathsOf<
  Routes extends any[],
  TAllowWildcards extends boolean = false,
  TPrefix extends string = ''
> = Routes extends [infer TRoute, ...infer TTail]
  ?
      | (TRoute extends Route ? PathsOfRoute<TRoute, TAllowWildcards, TPrefix> : never)
      | PathsOf<TTail, TAllowWildcards, TPrefix>
  : Routes extends [infer TRoute]
  ? TRoute extends Route
    ? PathsOfRoute<TRoute, TAllowWildcards, TPrefix>
    : never
  : never;

export interface RouteMatch<TRoute extends Route = Route> {
  route: Omit<TRoute, 'children'>;
  match: {
    isExact: boolean;
    path: string;
    url: string;
    params: TRoute extends {
      params: t.Type<any>;
    }
      ? t.OutputOf<TRoute['params']>
      : {};
  };
}

type ToUnion<TMatches extends any[]> = ValuesType<TMatches>;

type MatchRoute<TRoute extends Route, TPath extends string> = TPath extends '/*'
  ? [
      ToUnion<
        [
          RouteMatch<TRoute>,
          ...(TRoute extends {
            children: Route[];
          }
            ? Match<TRoute['children'], '/*'>
            : [])
        ]
      >
    ]
  : [
      ...(TPath extends TRoute['path']
        ? [
            RouteMatch<TRoute>,
            ...(TRoute['path'] extends '/'
              ? TRoute extends {
                  children: Route[];
                }
                ? Match<TRoute['children'], TPath>
                : []
              : [])
          ]
        : TPath extends `${TRoute['path']}${infer TRest}`
        ? TRoute extends {
            children: Route[];
          }
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

type ToIntersectionType<T> = T extends [t.Type<any>]
  ? T[0]
  : T extends [t.Type<any>, t.Type<any>]
  ? t.IntersectionC<[T[0], T[1]]>
  : T extends [t.Type<any>, t.Type<any>, t.Type<any>]
  ? t.IntersectionC<[T[0], T[1], T[2]]>
  : T extends [t.Type<any>, t.Type<any>, t.Type<any>, t.Type<any>]
  ? t.IntersectionC<[T[0], T[1], T[2], T[3]]>
  : t.TypeC<{
      path: t.TypeC<{}>;
      query: t.TypeC<{}>;
    }>;

interface DefaultOutput {
  path: {};
  query: {};
}

export type OutputOf<TRoutes extends Route[], TPath extends PathsOf<TRoutes>> = MapProperty<
  MapProperty<Match<TRoutes, TPath>, 'route'>,
  'params'
> extends []
  ? DefaultOutput
  : DefaultOutput &
      t.OutputOf<
        ToIntersectionType<MapProperty<MapProperty<Match<TRoutes, TPath>, 'route'>, 'params'>>
      >;

export type TypeOf<TRoutes extends Route[], TPath extends PathsOf<TRoutes>> = MapProperty<
  MapProperty<Match<TRoutes, TPath>, 'route'>,
  'params'
> extends []
  ? []
  : [
      t.TypeOf<
        ToIntersectionType<MapProperty<MapProperty<Match<TRoutes, TPath>, 'route'>, 'params'>>
      >
    ];

export interface Router<TRoutes extends Route[]> {
  matchRoutes<TPath extends PathsOf<TRoutes, true>>(path: TPath): Match<TRoutes, TPath>;
  getParams<TPath extends PathsOf<TRoutes, true>>(path: TPath): OutputOf<TRoutes, TPath>;
  link<TPath extends PathsOf<TRoutes, false>>(path: TPath, ...args: TypeOf<TRoutes, TPath>): string;
  push<TPath extends PathsOf<TRoutes, false>>(path: TPath, ...args: TypeOf<TRoutes, TPath>): void;
  replace<TPath extends PathsOf<TRoutes, false>>(
    path: TPath,
    ...args: TypeOf<TRoutes, TPath>
  ): void;
}
