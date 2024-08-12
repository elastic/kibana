/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export { formatRequest } from './src/format_request';
export { parseEndpoint } from './src/parse_endpoint';

export type {
  ServerRouteCreateOptions,
  ServerRouteHandlerResources,
  RouteParamsRT,
  ServerRoute,
  EndpointOf,
  ReturnOf,
  RouteRepositoryClient,
  RouteState,
  ClientRequestParamsOf,
  DecodedRequestParamsOf,
  ServerRouteRepository,
  DefaultClientOptions,
  DefaultRouteCreateOptions,
  DefaultRouteHandlerResources,
} from './src/typings';
