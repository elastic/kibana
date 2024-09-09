/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  RouteParamsRT,
  ServerRoute,
  ServerRouteCreateOptions,
  ServerRouteHandlerResources,
  DefaultRouteHandlerResources,
  DefaultRouteCreateOptions,
} from '@kbn/server-route-repository-utils';

export function createServerRouteFactory<
  TRouteHandlerResources extends ServerRouteHandlerResources = DefaultRouteHandlerResources,
  TRouteCreateOptions extends ServerRouteCreateOptions = DefaultRouteCreateOptions
>(): <
  TEndpoint extends string,
  TReturnType,
  TRouteParamsRT extends RouteParamsRT | undefined = undefined
>(
  route: ServerRoute<
    TEndpoint,
    TRouteParamsRT,
    TRouteHandlerResources,
    TReturnType,
    TRouteCreateOptions
  >
) => Record<
  TEndpoint,
  ServerRoute<TEndpoint, TRouteParamsRT, TRouteHandlerResources, TReturnType, TRouteCreateOptions>
> {
  return (route) => ({ [route.endpoint]: route } as any);
}
