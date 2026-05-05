/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { ServerRoute } from '@kbn/server-route-repository-utils';
import { fooRouteDefinition } from './foo';
import type { FooResponse } from './foo';

export const routeDefinitions = {
  foo: fooRouteDefinition,
};

type RouteEntry<
  TDef extends { ENDPOINT: string; params: any },
  TReturn extends Record<string, any>
> = {
  [K in TDef['ENDPOINT']]: ServerRoute<TDef['ENDPOINT'], TDef['params'], any, TReturn, any>;
};

export type SharedAPMRouteRepository = RouteEntry<typeof fooRouteDefinition, FooResponse>;
