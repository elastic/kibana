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

// type PathsOfRoute<TRoute extends Route> =
//   | TRoute['path']
//   | (TRoute extends { children: Route[] }
//       ? AppendPath<TRoute['path'], '/*'> | PathsOf<TRoute['children']>
//       : never);

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
  pre?: ReactElement;
}

interface ReadonlyPlainRoute {
  readonly path: string;
  readonly element: ReactElement;
  readonly children?: readonly ReadonlyPlainRoute[];
  readonly params?: t.Type<any>;
  readonly defaults?: Record<string, Record<string, string>>;
  pre?: ReactElement;
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

export type FlattenRoutesOf<TRoutes extends Route[]> = Array<
  Omit<ValuesType<MapRoutes<TRoutes>>, 'parents'>
>;

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
  getRoutesToMatch(path: string): FlattenRoutesOf<TRoutes>;
}

type AppendPath<
  TPrefix extends string,
  TPath extends string
> = NormalizePath<`${TPrefix}${NormalizePath<`/${TPath}`>}`>;

type MaybeUnion<T extends Record<string, any>, U extends Record<string, any>> = Omit<T, keyof U> & {
  [key in keyof U]: key extends keyof T ? T[key] | U[key] : U[key];
};

type MapRoute<TRoute extends Route, TParents extends Route[] = []> = MaybeUnion<
  {
    [key in TRoute['path']]: TRoute & { parents: TParents };
  },
  TRoute extends { children: Route[] }
    ? MaybeUnion<
        MapRoutes<TRoute['children'], [...TParents, TRoute]>,
        {
          [key in AppendPath<TRoute['path'], '*'>]: ValuesType<
            MapRoutes<TRoute['children'], [...TParents, TRoute]>
          >;
        }
      >
    : {}
>;

type MapRoutes<TRoutes, TParents extends Route[] = []> = TRoutes extends [Route]
  ? MapRoute<TRoutes[0], TParents>
  : TRoutes extends [Route, Route]
  ? MapRoute<TRoutes[0], TParents> & MapRoute<TRoutes[1], TParents>
  : TRoutes extends [Route, Route, Route]
  ? MapRoute<TRoutes[0], TParents> & MapRoute<TRoutes[1], TParents> & MapRoute<TRoutes[2], TParents>
  : TRoutes extends [Route, Route, Route, Route]
  ? MapRoute<TRoutes[0], TParents> &
      MapRoute<TRoutes[1], TParents> &
      MapRoute<TRoutes[2], TParents> &
      MapRoute<TRoutes[3], TParents>
  : TRoutes extends [Route, Route, Route, Route, Route]
  ? MapRoute<TRoutes[0], TParents> &
      MapRoute<TRoutes[1], TParents> &
      MapRoute<TRoutes[2], TParents> &
      MapRoute<TRoutes[3], TParents> &
      MapRoute<TRoutes[4], TParents>
  : TRoutes extends [Route, Route, Route, Route, Route, Route]
  ? MapRoute<TRoutes[0], TParents> &
      MapRoute<TRoutes[1], TParents> &
      MapRoute<TRoutes[2], TParents> &
      MapRoute<TRoutes[3], TParents> &
      MapRoute<TRoutes[4], TParents> &
      MapRoute<TRoutes[5], TParents>
  : TRoutes extends [Route, Route, Route, Route, Route, Route, Route]
  ? MapRoute<TRoutes[0], TParents> &
      MapRoute<TRoutes[1], TParents> &
      MapRoute<TRoutes[2], TParents> &
      MapRoute<TRoutes[3], TParents> &
      MapRoute<TRoutes[4], TParents> &
      MapRoute<TRoutes[5], TParents> &
      MapRoute<TRoutes[6], TParents>
  : TRoutes extends [Route, Route, Route, Route, Route, Route, Route, Route]
  ? MapRoute<TRoutes[0], TParents> &
      MapRoute<TRoutes[1], TParents> &
      MapRoute<TRoutes[2], TParents> &
      MapRoute<TRoutes[3], TParents> &
      MapRoute<TRoutes[4], TParents> &
      MapRoute<TRoutes[5], TParents> &
      MapRoute<TRoutes[6], TParents> &
      MapRoute<TRoutes[7], TParents>
  : TRoutes extends [Route, Route, Route, Route, Route, Route, Route, Route, Route]
  ? MapRoute<TRoutes[0], TParents> &
      MapRoute<TRoutes[1], TParents> &
      MapRoute<TRoutes[2], TParents> &
      MapRoute<TRoutes[3], TParents> &
      MapRoute<TRoutes[4], TParents> &
      MapRoute<TRoutes[5], TParents> &
      MapRoute<TRoutes[6], TParents> &
      MapRoute<TRoutes[7], TParents> &
      MapRoute<TRoutes[8], TParents>
  : TRoutes extends [Route, Route, Route, Route, Route, Route, Route, Route, Route, Route]
  ? MapRoute<TRoutes[0], TParents> &
      MapRoute<TRoutes[1], TParents> &
      MapRoute<TRoutes[2], TParents> &
      MapRoute<TRoutes[3], TParents> &
      MapRoute<TRoutes[4], TParents> &
      MapRoute<TRoutes[5], TParents> &
      MapRoute<TRoutes[6], TParents> &
      MapRoute<TRoutes[8], TParents> &
      MapRoute<TRoutes[7], TParents> &
      MapRoute<TRoutes[9], TParents>
  : TRoutes extends [Route, Route, Route, Route, Route, Route, Route, Route, Route, Route, Route]
  ? MapRoute<TRoutes[0], TParents> &
      MapRoute<TRoutes[1], TParents> &
      MapRoute<TRoutes[2], TParents> &
      MapRoute<TRoutes[3], TParents> &
      MapRoute<TRoutes[4], TParents> &
      MapRoute<TRoutes[5], TParents> &
      MapRoute<TRoutes[6], TParents> &
      MapRoute<TRoutes[8], TParents> &
      MapRoute<TRoutes[7], TParents> &
      MapRoute<TRoutes[9], TParents> &
      MapRoute<TRoutes[10], TParents>
  : {};

// const element = null as any;

// const routes = unconst([
//   {
//     path: '/link-to/transaction/{transactionId}',
//     element,
//   },
//   {
//     path: '/link-to/trace/{traceId}',
//     element,
//   },
//   {
//     path: '/',
//     element,
//     children: [
//       {
//         path: '/settings',
//         element,
//         children: [
//           {
//             path: '/settings/agent-configuration',
//             element,
//           },
//           {
//             path: '/settings/agent-configuration/create',
//             element,
//             params: t.partial({
//               query: t.partial({
//                 pageStep: t.string,
//               }),
//             }),
//           },
//           {
//             path: '/settings/agent-configuration/edit',
//             element,
//             params: t.partial({
//               query: t.partial({
//                 pageStep: t.string,
//               }),
//             }),
//           },
//           {
//             path: '/settings/apm-indices',
//             element,
//           },
//           {
//             path: '/settings/custom-links',
//             element,
//           },
//           {
//             path: '/settings/schema',
//             element,
//           },
//           {
//             path: '/settings/anomaly-detection',
//             element,
//           },
//           {
//             path: '/settings/agent-keys',
//             element,
//           },
//           {
//             path: '/settings',
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
//             path: '/services/:serviceName/overview',
//             element,
//           },
//           {
//             path: '/services/:serviceName/transactions',
//             element,
//           },
//           {
//             path: '/services/:serviceName/transactions/view',
//             element,
//           },
//           {
//             path: '/services/:serviceName/dependencies',
//             element,
//           },
//           {
//             path: '/services/:serviceName/errors',
//             element,
//             children: [
//               {
//                 path: '/services/:serviceName/errors/:groupId',
//                 element,
//                 params: t.type({
//                   path: t.type({
//                     groupId: t.string,
//                   }),
//                 }),
//               },
//               {
//                 path: '/services/:serviceName/errors',
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
//             path: '/services/:serviceName/metrics',
//             element,
//           },
//           {
//             path: '/services/:serviceName/nodes',
//             element,
//             children: [
//               {
//                 path: '/services/{serviceName}/nodes/{serviceNodeName}/metrics',
//                 element,
//               },
//               {
//                 path: '/services/:serviceName/nodes',
//                 element,
//               },
//             ],
//           },
//           {
//             path: '/services/:serviceName/service-map',
//             element,
//           },
//           {
//             path: '/services/:serviceName/logs',
//             element,
//           },
//           {
//             path: '/services/:serviceName/profiling',
//             element,
//           },
//           {
//             path: '/services/:serviceName',
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
//             path: '/backends',
//             element,
//             children: [
//               {
//                 path: '/backends/{backendName}/overview',
//                 element,
//               },
//               {
//                 path: '/backends/overview',
//                 element,
//               },
//               {
//                 path: '/backends',
//                 element,
//               },
//             ],
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
// type Paths = PathsOf<Routes>;

// type Bar = ValuesType<Match<Routes, '/*'>>['route']['path'];
// type Foo = OutputOf<Routes, '/*'>;
// // type Baz = OutputOf<Routes, '/services/:serviceName/errors'>;

// const { path }: Foo = {} as any;

// function _useApmParams<TPath extends PathsOf<Routes>>(p: TPath): OutputOf<Routes, TPath> {
//   return {} as any;
// }

// // const params = _useApmParams('/services/:serviceName/nodes/*');
