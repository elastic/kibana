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
import { RequiredKeys, ValuesType, UnionToIntersection } from 'utility-types';
import { NormalizePath } from './utils';

export type PathsOf<TRouteMap extends RouteMap> = string &
  ValuesType<{
    [key in keyof TRouteMap]:
      | key
      | (TRouteMap[key] extends { children: RouteMap }
          ? AppendPath<key & string, '*'> | PathsOf<TRouteMap[key]['children']>
          : never);
  }>;

export type RouteMap = Record<string, Route>;

export interface Route {
  element: ReactElement;
  children?: RouteMap;
  params?: t.Type<any>;
  defaults?: Record<string, Record<string, string>>;
  pre?: ReactElement;
  locatorPageId?: string;
}

export interface RouteWithPath extends Route {
  path: string;
}

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

type ToRouteMatch<TRoutes extends Route[]> = TRoutes extends [Route]
  ? [RouteMatch<TRoutes[0]>]
  : TRoutes extends [Route, ...infer TNextRoutes]
  ? [RouteMatch<TRoutes[0]>, ...(TNextRoutes extends Route[] ? ToRouteMatch<TNextRoutes> : [])]
  : TRoutes extends []
  ? []
  : never;

export type Match<TRoutes extends RouteMap, TPath extends string> = MapRoutes<TRoutes>[TPath];

export interface DefaultOutput {
  path: {};
  query: {};
}

type OutputOfRoute<TRoute extends Route> = TRoute extends {
  params: t.Type<any>;
}
  ? t.OutputOf<TRoute['params']>
  : {};

type OutputOfRoutes<TRoutes extends Route[]> = TRoutes extends [Route]
  ? OutputOfRoute<TRoutes[0]>
  : TRoutes extends [Route, ...infer TNextRoutes]
  ? OutputOfRoute<TRoutes[0]> & (TNextRoutes extends Route[] ? OutputOfRoutes<TNextRoutes> : {})
  : {};

export type OutputOf<TRoutes extends RouteMap, TPath extends PathsOf<TRoutes>> = OutputOfRoutes<
  Match<TRoutes, TPath>
> &
  DefaultOutput;

type TypeOfRoute<TRoute extends Route> = TRoute extends {
  params: t.Type<any>;
}
  ? t.TypeOf<TRoute['params']>
  : {};

type TypeOfRoutes<TRoutes extends Route[]> = TRoutes extends [Route]
  ? TypeOfRoute<TRoutes[0]>
  : TRoutes extends [Route, ...infer TNextRoutes]
  ? TypeOfRoute<TRoutes[0]> & (TNextRoutes extends Route[] ? TypeOfRoutes<TNextRoutes> : {})
  : {};

export type TypeOf<
  TRoutes extends RouteMap,
  TPath extends PathsOf<TRoutes>,
  TWithDefaultOutput extends boolean = true
> = TypeOfRoutes<Match<TRoutes, TPath>> & (TWithDefaultOutput extends true ? DefaultOutput : {});

export type TypeAsArgs<TObject> = keyof TObject extends never
  ? []
  : RequiredKeys<TObject> extends never
  ? [TObject] | []
  : [TObject];

export type FlattenRoutesOf<TRoutes extends RouteMap> = Array<
  ValuesType<{
    [key in keyof MapRoutes<TRoutes>]: ValuesType<MapRoutes<TRoutes>[key]>;
  }>
>;

export interface Router<TRoutes extends RouteMap> {
  matchRoutes<TPath extends PathsOf<TRoutes>>(
    path: TPath,
    location: Location
  ): ToRouteMatch<Match<TRoutes, TPath>>;
  matchRoutes(location: Location): ToRouteMatch<Match<TRoutes, PathsOf<TRoutes>>>;
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

type MapRoute<TRoute extends RouteWithPath, TParents extends RouteWithPath[] = []> = MaybeUnion<
  {
    [key in TRoute['path']]: [...TParents, TRoute];
  },
  TRoute extends { children: RouteMap }
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

type FromRouteMap<
  TRouteMap extends RouteMap,
  TParents extends RouteWithPath[] = []
> = UnionToIntersection<
  ValuesType<{
    [key in keyof TRouteMap]: MapRoute<TRouteMap[key] & { path: key & string }, TParents>;
  }>
>;

type MapRoutes<TRouteMap extends RouteMap, TParents extends RouteWithPath[] = []> = FromRouteMap<
  TRouteMap,
  TParents
> extends Record<string, Route[]>
  ? FromRouteMap<TRouteMap, TParents>
  : never;

// const element = null as any;

// const routes = {
//   '/link-to/transaction/{transactionId}': {
//     element,
//   },
//   '/link-to/trace/{traceId}': {
//     element,
//   },
//   '/': {
//     element,
//     children: {
//       '/settings': {
//         element,
//         children: {
//           '/settings/agent-configuration': {
//             element,
//           },
//           '/settings/agent-configuration/create': {
//             element,
//             params: t.partial({
//               query: t.partial({
//                 pageStep: t.string,
//               }),
//             }),
//           },
//           '/settings/agent-configuration/edit': {
//             element,
//             params: t.partial({
//               query: t.partial({
//                 pageStep: t.string,
//               }),
//             }),
//           },
//           '/settings/apm-indices': {
//             element,
//           },
//           '/settings/custom-links': {
//             element,
//           },
//           '/settings/schema': {
//             element,
//           },
//           '/settings/anomaly-detection': {
//             element,
//           },
//           '/settings/agent-keys': {
//             element,
//           },
//           '/settings': {
//             element,
//           },
//         },
//       },
//       '/services/:serviceName': {
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
//         children: {
//           '/services/:serviceName/overview': {
//             element,
//           },
//           '/services/:serviceName/transactions': {
//             element,
//           },
//           '/services/:serviceName/transactions/view': {
//             element,
//           },
//           '/services/:serviceName/dependencies': {
//             element,
//           },
//           '/services/:serviceName/errors': {
//             element,
//             children: {
//               '/services/:serviceName/errors/:groupId': {
//                 element,
//                 params: t.type({
//                   path: t.type({
//                     groupId: t.string,
//                   }),
//                 }),
//               },
//               '/services/:serviceName/errors': {
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
//             },
//           },
//           '/services/:serviceName/metrics': {
//             element,
//           },
//           '/services/:serviceName/nodes': {
//             element,
//             children: {
//               '/services/{serviceName}/nodes/{serviceNodeName}/metrics': {
//                 element,
//               },
//               '/services/:serviceName/nodes': {
//                 element,
//               },
//             },
//           },
//           '/services/:serviceName/service-map': {
//             element,
//           },
//           '/services/:serviceName/logs': {
//             element,
//           },
//           '/services/:serviceName/profiling': {
//             element,
//           },
//           '/services/:serviceName': {
//             element,
//           },
//         },
//       },
//       '/': {
//         element,
//         params: t.partial({
//           query: t.partial({
//             rangeFrom: t.string,
//             rangeTo: t.string,
//           }),
//         }),
//         children: {
//           '/services': {
//             element,
//           },
//           '/traces': {
//             element,
//           },
//           '/service-map': {
//             element,
//           },
//           '/backends': {
//             element,
//             children: {
//               '/backends/{backendName}/overview': {
//                 element,
//               },
//               '/backends/overview': {
//                 element,
//               },
//               '/backends': {
//                 element,
//               },
//             },
//           },
//           '/': {
//             element,
//           },
//         },
//       },
//     },
//   },
// };

// type Routes = typeof routes;

// type Mapped = MapRoutes<Routes>;
// type Paths = PathsOf<Routes>;

// type Bar = Match<Routes, '/*'>;
// type Foo = OutputOf<Routes, '/*'>;
// type Baz = OutputOf<Routes, '/services/:serviceName/errors'>;

// const { path }: Foo = {} as any;

// function _useApmParams<TPath extends PathsOf<Routes>>(p: TPath): OutputOf<Routes, TPath> {
//   return {} as any;
// }

// const {
//   path: { serviceName },
//   query: { comparisonType },
// } = _useApmParams('/services/:serviceName/nodes/*');
