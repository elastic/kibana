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

export type PathsOf<TRoutes extends Route[]> = keyof MapRoutes<TRoutes> & string;

export interface RouteMatch<TRoute extends Route = Route> {
  route: TRoute;
  match: {
    isExact: boolean;
    path: string;
    url: string;
    params: TRoute extends {
      params: t.Type<any>;
    }
      ? t.TypeOf<TRoute['params']>
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

interface PlainRoute {
  path: string;
  element: ReactElement;
  children?: PlainRoute[];
  params?: t.Type<any>;
  defaults?: Record<string, Record<string, string>>;
}

interface ReadonlyPlainRoute {
  readonly path: string;
  readonly element: ReactElement;
  readonly children?: readonly ReadonlyPlainRoute[];
  readonly params?: t.Type<any>;
  readonly defaults?: Record<string, Record<string, string>>;
}

export type Route = PlainRoute | ReadonlyPlainRoute;

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
  : TRouteMatches extends RouteMatch[]
  ? OutputOfRouteMatch<ValuesType<TRouteMatches>>
  : DefaultOutput;

export type OutputOf<TRoutes extends Route[], TPath extends PathsOf<TRoutes>> = OutputOfMatches<
  Match<TRoutes, TPath>
> &
  DefaultOutput;

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

export type TypeOf<
  TRoutes extends Route[],
  TPath extends PathsOf<TRoutes>,
  TWithDefaultOutput extends boolean = true
> = TypeOfMatches<Match<TRoutes, TPath>> & (TWithDefaultOutput extends true ? DefaultOutput : {});

export type TypeAsArgs<TObject> = keyof TObject extends never
  ? []
  : RequiredKeys<TObject> extends never
  ? [TObject] | []
  : [TObject];

export interface Router<TRoutes extends Route[]> {
  matchRoutes<TPath extends PathsOf<TRoutes>>(
    path: TPath,
    location: Location
  ): Match<TRoutes, TPath>;
  matchRoutes(location: Location): Match<TRoutes, PathsOf<TRoutes>>;
  getParams<TPath extends PathsOf<TRoutes>>(
    path: TPath,
    location: Location
  ): TypeOf<TRoutes, TPath>;
  getParams<TPath extends PathsOf<TRoutes>, TOptional extends boolean>(
    path: TPath,
    location: Location,
    optional: TOptional
  ): TOptional extends true ? TypeOf<TRoutes, TPath> | undefined : TypeOf<TRoutes, TPath>;
  getParams<T1 extends PathsOf<TRoutes>, T2 extends PathsOf<TRoutes>>(
    path1: T1,
    path2: T2,
    location: Location
  ): TypeOf<TRoutes, T1> | TypeOf<TRoutes, T2>;
  getParams<T1 extends PathsOf<TRoutes>, T2 extends PathsOf<TRoutes>, T3 extends PathsOf<TRoutes>>(
    path1: T1,
    path2: T2,
    path3: T3,
    location: Location
  ): TypeOf<TRoutes, T1> | TypeOf<TRoutes, T2> | TypeOf<TRoutes, T3>;
  getParams<TPath extends PathsOf<TRoutes>, TOptional extends boolean>(
    path: TPath,
    location: Location,
    optional: TOptional
  ): TOptional extends true ? TypeOf<TRoutes, TPath> | undefined : TypeOf<TRoutes, TPath>;
  link<TPath extends PathsOf<TRoutes>>(
    path: TPath,
    ...args: TypeAsArgs<TypeOf<TRoutes, TPath, false>>
  ): string;
  getRoutePath(route: Route): string;
}

type AppendPath<
  TPrefix extends string,
  TPath extends string
> = NormalizePath<`${TPrefix}${NormalizePath<`/${TPath}`>}`>;

type MaybeUnion<T extends Record<string, any>, U extends Record<string, any>> = Omit<T, keyof U> &
  {
    [key in keyof U]: key extends keyof T ? T[key] | U[key] : U[key];
  };

type MapRoute<
  TRoute extends Route,
  TPrefix extends string,
  TParents extends Route[] = []
> = TRoute extends Route
  ? MaybeUnion<
      {
        [key in AppendPath<TPrefix, TRoute['path']>]: TRoute & { parents: TParents };
      },
      TRoute extends { children: Route[] }
        ? MaybeUnion<
            MapRoutes<
              TRoute['children'],
              AppendPath<TPrefix, TRoute['path']>,
              [...TParents, TRoute]
            >,
            {
              [key in AppendPath<TPrefix, AppendPath<TRoute['path'], '*'>>]: ValuesType<
                MapRoutes<
                  TRoute['children'],
                  AppendPath<TPrefix, TRoute['path']>,
                  [...TParents, TRoute]
                >
              >;
            }
          >
        : {}
    >
  : {};

type MapRoutes<
  TRoutes,
  TPrefix extends string = '',
  TParents extends Route[] = []
> = TRoutes extends [Route]
  ? MapRoute<TRoutes[0], TPrefix, TParents>
  : TRoutes extends [Route, Route]
  ? MapRoute<TRoutes[0], TPrefix, TParents> & MapRoute<TRoutes[1], TPrefix, TParents>
  : TRoutes extends [Route, Route, Route]
  ? MapRoute<TRoutes[0], TPrefix, TParents> &
      MapRoute<TRoutes[1], TPrefix, TParents> &
      MapRoute<TRoutes[2], TPrefix, TParents>
  : TRoutes extends [Route, Route, Route, Route]
  ? MapRoute<TRoutes[0], TPrefix, TParents> &
      MapRoute<TRoutes[1], TPrefix, TParents> &
      MapRoute<TRoutes[2], TPrefix, TParents> &
      MapRoute<TRoutes[3], TPrefix, TParents>
  : TRoutes extends [Route, Route, Route, Route, Route]
  ? MapRoute<TRoutes[0], TPrefix, TParents> &
      MapRoute<TRoutes[1], TPrefix, TParents> &
      MapRoute<TRoutes[2], TPrefix, TParents> &
      MapRoute<TRoutes[3], TPrefix, TParents> &
      MapRoute<TRoutes[4], TPrefix, TParents>
  : TRoutes extends [Route, Route, Route, Route, Route, Route]
  ? MapRoute<TRoutes[0], TPrefix, TParents> &
      MapRoute<TRoutes[1], TPrefix, TParents> &
      MapRoute<TRoutes[2], TPrefix, TParents> &
      MapRoute<TRoutes[3], TPrefix, TParents> &
      MapRoute<TRoutes[4], TPrefix, TParents> &
      MapRoute<TRoutes[5], TPrefix, TParents>
  : TRoutes extends [Route, Route, Route, Route, Route, Route, Route]
  ? MapRoute<TRoutes[0], TPrefix, TParents> &
      MapRoute<TRoutes[1], TPrefix, TParents> &
      MapRoute<TRoutes[2], TPrefix, TParents> &
      MapRoute<TRoutes[3], TPrefix, TParents> &
      MapRoute<TRoutes[4], TPrefix, TParents> &
      MapRoute<TRoutes[5], TPrefix, TParents> &
      MapRoute<TRoutes[6], TPrefix, TParents>
  : TRoutes extends [Route, Route, Route, Route, Route, Route, Route, Route]
  ? MapRoute<TRoutes[0], TPrefix, TParents> &
      MapRoute<TRoutes[1], TPrefix, TParents> &
      MapRoute<TRoutes[2], TPrefix, TParents> &
      MapRoute<TRoutes[3], TPrefix, TParents> &
      MapRoute<TRoutes[4], TPrefix, TParents> &
      MapRoute<TRoutes[5], TPrefix, TParents> &
      MapRoute<TRoutes[6], TPrefix, TParents> &
      MapRoute<TRoutes[7], TPrefix, TParents>
  : TRoutes extends [Route, Route, Route, Route, Route, Route, Route, Route, Route]
  ? MapRoute<TRoutes[0], TPrefix, TParents> &
      MapRoute<TRoutes[1], TPrefix, TParents> &
      MapRoute<TRoutes[2], TPrefix, TParents> &
      MapRoute<TRoutes[3], TPrefix, TParents> &
      MapRoute<TRoutes[4], TPrefix, TParents> &
      MapRoute<TRoutes[5], TPrefix, TParents> &
      MapRoute<TRoutes[6], TPrefix, TParents> &
      MapRoute<TRoutes[7], TPrefix, TParents> &
      MapRoute<TRoutes[8], TPrefix, TParents>
  : TRoutes extends [Route, Route, Route, Route, Route, Route, Route, Route, Route, Route]
  ? MapRoute<TRoutes[0], TPrefix, TParents> &
      MapRoute<TRoutes[1], TPrefix, TParents> &
      MapRoute<TRoutes[2], TPrefix, TParents> &
      MapRoute<TRoutes[3], TPrefix, TParents> &
      MapRoute<TRoutes[4], TPrefix, TParents> &
      MapRoute<TRoutes[5], TPrefix, TParents> &
      MapRoute<TRoutes[6], TPrefix, TParents> &
      MapRoute<TRoutes[7], TPrefix, TParents> &
      MapRoute<TRoutes[8], TPrefix, TParents> &
      MapRoute<TRoutes[9], TPrefix, TParents>
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
//               query: t.partial({
//                 pageStep: t.string,
//               }),
//             }),
//           },
//           {
//             path: '/agent-configuration/edit',
//             element,
//             params: t.partial({
//               query: t.partial({
//                 pageStep: t.string,
//               }),
//             }),
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
//           {
//             path: '/',
//             element,
//           },
//         ],
//       },
//       {
//         path: '/services/:serviceName',
//         element,
//         params: t.intersection([
//           t.type({
//             path: t.type({
//               serviceName: t.string,
//             }),
//           }),
//           t.partial({
//             query: t.partial({
//               environment: t.string,
//               rangeFrom: t.string,
//               rangeTo: t.string,
//               comparisonEnabled: t.string,
//               comparisonType: t.string,
//               latencyAggregationType: t.string,
//               transactionType: t.string,
//               kuery: t.string,
//             }),
//           }),
//         ]),
//         children: [
//           {
//             path: '/overview',
//             element,
//           },
//           {
//             path: '/transactions',
//             element,
//           },
//           {
//             path: '/errors',
//             element,
//             children: [
//               {
//                 path: '/:groupId',
//                 element,
//                 params: t.type({
//                   path: t.type({
//                     groupId: t.string,
//                   }),
//                 }),
//               },
//               {
//                 path: '/',
//                 element,
//                 params: t.partial({
//                   query: t.partial({
//                     sortDirection: t.string,
//                     sortField: t.string,
//                     pageSize: t.string,
//                     page: t.string,
//                   }),
//                 }),
//               },
//             ],
//           },
//           {
//             path: '/foo',
//             element,
//           },
//           {
//             path: '/bar',
//             element,
//           },
//           {
//             path: '/baz',
//             element,
//           },
//           {
//             path: '/',
//             element,
//           },
//         ],
//       },
//       {
//         path: '/',
//         element,
//         params: t.partial({
//           query: t.partial({
//             rangeFrom: t.string,
//             rangeTo: t.string,
//           }),
//         }),
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

// type Mapped = keyof MapRoutes<Routes>;

// type Bar = ValuesType<Match<Routes, '/*'>>['route']['path'];
// type Foo = OutputOf<Routes, '/*'>;

// const { path }: Foo = {} as any;

// function _useApmParams<TPath extends PathsOf<Routes>>(p: TPath): OutputOf<Routes, TPath> {
//   return {} as any;
// }

// const params = _useApmParams('/*');
