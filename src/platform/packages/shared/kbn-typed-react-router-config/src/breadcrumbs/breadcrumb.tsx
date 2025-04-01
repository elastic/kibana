/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { RequiredKeys } from 'utility-types';
import { useRouterBreadcrumb } from './use_router_breadcrumb';
import { PathsOf, RouteMap, TypeOf } from '../types';

type AsParamsProps<TObject extends Record<string, any>> = RequiredKeys<TObject> extends never
  ? {}
  : { params: TObject };

export type RouterBreadcrumb<TRouteMap extends RouteMap> = <
  TRoutePath extends PathsOf<TRouteMap>
>({}: {
  title: string;
  children: React.ReactNode;
  path: TRoutePath;
} & AsParamsProps<TypeOf<TRouteMap, TRoutePath, false>>) => React.ReactElement;

export function RouterBreadcrumb<
  TRouteMap extends RouteMap,
  TRoutePath extends PathsOf<TRouteMap>
>({
  title,
  path,
  params,
  children,
}: {
  title: string;
  path: TRoutePath;
  children: React.ReactElement;
  params?: Record<string, any>;
}) {
  useRouterBreadcrumb(
    () => ({
      title,
      path,
      params,
    }),
    []
  );

  return children;
}
