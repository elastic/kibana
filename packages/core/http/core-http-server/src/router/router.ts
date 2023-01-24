/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { Request, ResponseObject, ResponseToolkit } from '@hapi/hapi';
import type Boom from '@hapi/boom';
import type { RouteConfig, RouteMethod } from './route';
import type { RequestHandler, RequestHandlerWrapper } from './request_handler';
import type { RequestHandlerContextBase } from './request_handler_context';
import type { RouteConfigOptions } from './route';

/**
 * Route handler common definition
 *
 * @public
 */
export type RouteRegistrar<
  Method extends RouteMethod,
  Context extends RequestHandlerContextBase = RequestHandlerContextBase
> = <P, Q, B>(
  route: RouteConfig<P, Q, B, Method>,
  handler: RequestHandler<P, Q, B, Context, Method>
) => void;

/**
 * Registers route handlers for specified resource path and method.
 * See {@link RouteConfig} and {@link RequestHandler} for more information about arguments to route registrations.
 *
 * @public
 */
export interface IRouter<Context extends RequestHandlerContextBase = RequestHandlerContextBase> {
  /**
   * Resulted path
   */
  routerPath: string;

  /**
   * Register a route handler for `GET` request.
   * @param route {@link RouteConfig} - a route configuration.
   * @param handler {@link RequestHandler} - a function to call to respond to an incoming request
   */
  get: RouteRegistrar<'get', Context>;

  /**
   * Register a route handler for `POST` request.
   * @param route {@link RouteConfig} - a route configuration.
   * @param handler {@link RequestHandler} - a function to call to respond to an incoming request
   */
  post: RouteRegistrar<'post', Context>;

  /**
   * Register a route handler for `PUT` request.
   * @param route {@link RouteConfig} - a route configuration.
   * @param handler {@link RequestHandler} - a function to call to respond to an incoming request
   */
  put: RouteRegistrar<'put', Context>;

  /**
   * Register a route handler for `PATCH` request.
   * @param route {@link RouteConfig} - a route configuration.
   * @param handler {@link RequestHandler} - a function to call to respond to an incoming request
   */
  patch: RouteRegistrar<'patch', Context>;

  /**
   * Register a route handler for `DELETE` request.
   * @param route {@link RouteConfig} - a route configuration.
   * @param handler {@link RequestHandler} - a function to call to respond to an incoming request
   */
  delete: RouteRegistrar<'delete', Context>;

  /**
   * Wrap a router handler to catch and converts legacy boom errors to proper custom errors.
   * @param handler {@link RequestHandler} - a route handler to wrap
   */
  handleLegacyErrors: RequestHandlerWrapper;

  /**
   * Returns all routes registered with this router.
   * @returns List of registered routes.
   * @internal
   */
  getRoutes: () => RouterRoute[];
}

/** @public */
export interface RouterRoute {
  method: RouteMethod;
  path: string;
  options: RouteConfigOptions<RouteMethod>;
  handler: (
    req: Request,
    responseToolkit: ResponseToolkit
  ) => Promise<ResponseObject | Boom.Boom<any>>;
}
