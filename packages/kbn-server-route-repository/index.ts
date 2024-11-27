/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export { formatRequest, parseEndpoint } from '@kbn/server-route-repository-utils';
export { createServerRouteFactory } from './src/create_server_route_factory';
export { decodeRequestParams } from './src/decode_request_params';
export { stripNullishRequestParameters } from './src/strip_nullish_request_parameters';
export { passThroughValidationObject } from './src/validation_objects';
export { registerRoutes } from './src/register_routes';

export type {
  RouteRepositoryClient,
  ReturnOf,
  EndpointOf,
  ClientRequestParamsOf,
  DecodedRequestParamsOf,
  ServerRouteRepository,
  ServerRoute,
  RouteParamsRT,
  DefaultRouteCreateOptions,
  DefaultRouteHandlerResources,
  IoTsParamsObject,
} from '@kbn/server-route-repository-utils';
