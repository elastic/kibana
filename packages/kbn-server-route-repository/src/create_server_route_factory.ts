/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import {
  ServerRouteCreateOptions,
  ServerRouteHandlerResources,
  RouteParamsRT,
  ServerRoute,
} from './typings';

export function createServerRouteFactory<
  TRouteHandlerResources extends ServerRouteHandlerResources,
  TRouteCreateOptions extends ServerRouteCreateOptions
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
