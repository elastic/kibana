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
} from './router';

export interface RouteDefinition<
  P = unknown,
  Q = unknown,
  B = unknown,
  Method extends Exclude<RouteMethod, 'options'> = Exclude<RouteMethod, 'options'>
> extends RouteConfig<P, Q, B, Method>,
    interfaces.Newable<IRouteHandler> {
  method: Method;
}

export interface IRouteHandler {
  handle(): ReturnType<RequestHandler>;
}

export const Route: interfaces.ServiceIdentifier<
  RouteDefinition & Exclude<interfaces.ServiceIdentifier<IRouteHandler>, keyof any>
> = Symbol.for('Route');

export const RouterService: interfaces.ServiceIdentifier<IRouter<any>> =
  Symbol.for('RouterService');

export const RequestToken: interfaces.ServiceIdentifier<KibanaRequest> = Symbol.for('Request');

export const ResponseToken: interfaces.ServiceIdentifier<KibanaResponseFactory> =
  Symbol.for('Response');
