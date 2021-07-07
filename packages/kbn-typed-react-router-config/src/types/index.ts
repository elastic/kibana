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
import { RequiredKeys, ValuesType } from 'utility-types';
// import { unconst } from '../unconst';
import { NormalizePath } from './utils';

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
  route: TRoute;
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

type ToRouteMatch<TRoutes extends Route[]> = TRoutes extends []
  ? []
  : TRoutes extends [Route]
  ? [RouteMatch<TRoutes[0]>]
  : TRoutes extends [Route, ...infer TTail]
  ? TTail extends Route[]
    ? [RouteMatch<TRoutes[0]>, ...ToRouteMatch<TTail>]
    : []
  : [];

type UnwrapRouteMap<TRoute extends Route & { parents?: Route[] }> = TRoute extends {
  parents: Route[];
}
  ? ToRouteMatch<[...TRoute['parents'], Omit<TRoute, 'parents'>]>
  : ToRouteMatch<[Omit<TRoute, 'parents'>]>;

export type Match<TRoutes extends Route[], TPath extends string> = MapRoutes<TRoutes> extends {
  [key in TPath]: Route;
}
  ? UnwrapRouteMap<MapRoutes<TRoutes>[TPath]>
  : [];

export interface Route {
  path: string;
  element: ReactElement;
  children?: Route[];
  params?: t.Type<any>;
}

interface DefaultOutput {
  path: {};
  query: {};
}

type OutputOfRouteMatch<TRouteMatch extends RouteMatch> = TRouteMatch extends {
  route: { params: t.Type<any> };
}
  ? t.OutputOf<TRouteMatch['route']['params']>
  : DefaultOutput;

type OutputOfMatches<TRouteMatches extends RouteMatch[]> = TRouteMatches extends [RouteMatch]
  ? OutputOfRouteMatch<TRouteMatches[0]>
  : TRouteMatches extends [RouteMatch, ...infer TNextRouteMatches]
  ? OutputOfRouteMatch<TRouteMatches[0]> &
      (TNextRouteMatches extends RouteMatch[] ? OutputOfMatches<TNextRouteMatches> : DefaultOutput)
  : DefaultOutput;

export type OutputOf<
  TRoutes extends Route[],
  TPath extends PathsOf<TRoutes, true>
> = OutputOfMatches<Match<TRoutes, TPath>>;

type TypeOfRouteMatch<TRouteMatch extends RouteMatch> = TRouteMatch extends {
  route: { params: t.Type<any> };
}
  ? t.TypeOf<TRouteMatch['route']['params']>
  : {};

type TypeOfMatches<TRouteMatches extends RouteMatch[]> = TRouteMatches extends [RouteMatch]
  ? TypeOfRouteMatch<TRouteMatches[0]>
  : TRouteMatches extends [RouteMatch, ...infer TNextRouteMatches]
  ? TypeOfRouteMatch<TRouteMatches[0]> &
      (TNextRouteMatches extends RouteMatch[] ? TypeOfMatches<TNextRouteMatches> : {})
  : {};

export type TypeOf<TRoutes extends Route[], TPath extends PathsOf<TRoutes, false>> = TypeOfMatches<
  Match<TRoutes, TPath>
>;

export type TypeAsArgs<TObject> = keyof TObject extends never
  ? []
  : RequiredKeys<TObject> extends never
  ? [TObject] | []
  : [TObject];

export interface Router<TRoutes extends Route[]> {
  matchRoutes<TPath extends PathsOf<TRoutes, true>>(
    path: TPath,
    location: Location
  ): Match<TRoutes, TPath>;
  matchRoutes(location: Location): Match<TRoutes, PathsOf<TRoutes>>;
  getParams<TPath extends PathsOf<TRoutes, true>>(
    path: TPath,
    location: Location
  ): OutputOf<TRoutes, TPath>;
  link<TPath extends PathsOf<TRoutes, false>>(
    path: TPath,
    ...args: TypeAsArgs<TypeOf<TRoutes, TPath>>
  ): string;
}

type AppendPath<
  TPrefix extends string,
  TPath extends string
> = NormalizePath<`${TPrefix}${NormalizePath<`/${TPath}`>}`>;

type MapRoute<TRoute, TPrefix extends string, TParents extends Route[] = []> = TRoute extends Route
  ? {
      [key in AppendPath<TPrefix, TRoute['path']>]: TRoute & { parents: TParents };
    } &
      (TRoute extends { children: Route[] }
        ? {
            [key in AppendPath<TPrefix, `${TRoute['path']}/*`>]: ValuesType<
              MapRoutes<
                TRoute['children'],
                AppendPath<TPrefix, TRoute['path']>,
                [...TParents, TRoute]
              >
            >;
          } &
            MapRoutes<
              TRoute['children'],
              AppendPath<TPrefix, TRoute['path']>,
              [...TParents, TRoute]
            >
        : {})
  : {};

type MapRoutes<
  TRoutes,
  TPrefix extends string = '',
  TParents extends Route[] = []
> = TRoutes extends [infer TRoute]
  ? MapRoute<TRoute, TPrefix, TParents>
  : TRoutes extends [infer TRoute, ...infer TTail]
  ? MapRoute<TRoute, TPrefix, TParents> & MapRoutes<TTail, TPrefix, TParents>
  : TRoutes extends []
  ? {}
  : {};

// const element = null as any;

// const routes = unconst([
//   {
//     path: '/',
//     element,
//     children: [
//       {
//         path: '/settings',
//         element,
//         children: [
//           {
//             path: '/agent-configuration',
//             element,
//           },
//           {
//             path: '/agent-configuration/create',
//             element,
//             params: t.partial({
//               path: t.type({
//                 serviceName: t.string,
//               }),
//             }),
//           },
//           {
//             path: '/agent-configuration/edit',
//             element,
//           },
//           {
//             path: '/apm-indices',
//             element,
//           },
//           {
//             path: '/customize-ui',
//             element,
//           },
//           {
//             path: '/schema',
//             element,
//           },
//           {
//             path: '/anomaly-detection',
//             element,
//           },
//         ],
//       },
//       {
//         path: '/',
//         element,
//         children: [
//           {
//             path: '/services',
//             element,
//           },
//           {
//             path: '/traces',
//             element,
//           },
//           {
//             path: '/service-map',
//             element,
//           },
//           {
//             path: '/',
//             element,
//           },
//         ],
//       },
//     ],
//   },
// ] as const);

// type Routes = typeof routes;

// type Mapped = MapRoutes<Routes>;

// type Bar = Match<Routes, '/settings/agent-configuration/create'>[2];

// type Foo = TypeAsArgs<TypeOf<Routes, '/settings/agent-configuration/create'>>;
