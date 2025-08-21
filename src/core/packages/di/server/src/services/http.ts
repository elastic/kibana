/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Newable, ServiceIdentifier } from 'inversify';
import type {
  IRouter,
  KibanaRequest,
  KibanaResponseFactory,
  RequestHandler,
  RouteConfig,
  RouteMethod,
} from '@kbn/core-http-server';

/**
 * The route definition.
 * @public
 */
export interface RouteDefinition<
  P = unknown,
  Q = unknown,
  B = unknown,
  Method extends Exclude<RouteMethod, 'options'> = Exclude<RouteMethod, 'options'>
> extends RouteConfig<P, Q, B, Method>,
    Newable<RouteHandler> {
  /**
   * The HTTP method of the route.
   */
  method: Method;
}

/**
 * The route handler.
 * @public
 */
export interface RouteHandler {
  /**
   * The handler function that will be called when the route is matched.
   * The request and response objects can be injected using {@link Request} and {@link Response}.
   */
  handle(): ReturnType<RequestHandler>;
}

/**
 * The service identifier that is used to register an HTTP route.
 * @public
 */
export const Route: ServiceIdentifier<ServiceIdentifier<RouteHandler> & RouteDefinition> =
  Symbol('Route');

/**
 * The service identifier of the plugin-scoped router.
 * @public
 */
export const Router: ServiceIdentifier<IRouter<any>> = Symbol('Router');

/**
 * The service identifier of the current request.
 * @public
 */
export const Request: ServiceIdentifier<KibanaRequest> = Symbol('Request');

/**
 * The service identifier of the current response factory.
 * @public
 */
export const Response: ServiceIdentifier<KibanaResponseFactory> = Symbol('Response');
