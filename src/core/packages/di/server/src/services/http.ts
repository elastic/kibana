/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { interfaces } from 'inversify';
import type {
  IRouter,
  KibanaRequest,
  KibanaResponseFactory,
  RequestHandler,
  RouteConfig,
  RouteMethod,
} from '@kbn/core-http-server';

interface RouteDefinition<
  P = unknown,
  Q = unknown,
  B = unknown,
  Method extends Exclude<RouteMethod, 'options'> = Exclude<RouteMethod, 'options'>
> extends RouteConfig<P, Q, B, Method>,
    interfaces.Newable<RouteHandler> {
  method: Method;
}

interface RouteHandler {
  handle(): ReturnType<RequestHandler>;
}

export const Route: interfaces.ServiceIdentifier<
  interfaces.ServiceIdentifier<RouteHandler> & RouteDefinition
> = Symbol('Route');

export const Router: interfaces.ServiceIdentifier<IRouter<any>> = Symbol('Router');

export const Request: interfaces.ServiceIdentifier<KibanaRequest> = Symbol('Request');

export const Response: interfaces.ServiceIdentifier<KibanaResponseFactory> = Symbol('Response');
