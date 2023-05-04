/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { RouteMethod } from './route';
import type { KibanaRequest } from './request';
import type { RequestHandlerContextBase } from './request_handler_context';
import type { IKibanaResponse } from './response';
import type { KibanaResponseFactory } from './response_factory';

/**
 * A function executed when route path matched requested resource path.
 * Request handler is expected to return a result of one of {@link KibanaResponseFactory} functions.
 * If anything else is returned, or an error is thrown, the HTTP service will automatically log the error
 * and respond `500 - Internal Server Error`.
 * @param context {@link RequestHandlerContext} - the core context exposed for this request.
 * @param request {@link KibanaRequest} - object containing information about requested resource,
 * such as path, method, headers, parameters, query, body, etc.
 * @param response {@link KibanaResponseFactory} - a set of helper functions used to respond to a request.
 *
 * @example
 * ```ts
 * const router = httpSetup.createRouter();
 * // creates a route handler for GET request on 'my-app/path/{id}' path
 * router.get(
 *   {
 *     path: 'path/{id}',
 *     // defines a validation schema for a named segment of the route path
 *     validate: {
 *       params: schema.object({
 *         id: schema.string(),
 *       }),
 *     },
 *   },
 *   // function to execute to create a responses
 *   async (context, request, response) => {
 *     const data = await context.findObject(request.params.id);
 *     // creates a command to respond with 'not found' error
 *     if (!data) return response.notFound();
 *     // creates a command to send found data to the client
 *     return response.ok(data);
 *   }
 * );
 * ```
 * @public
 */
export type RequestHandler<
  P = unknown,
  Q = unknown,
  B = unknown,
  Context extends RequestHandlerContextBase = RequestHandlerContextBase,
  Method extends RouteMethod = any,
  ResponseFactory extends KibanaResponseFactory = KibanaResponseFactory
> = (
  context: Context,
  request: KibanaRequest<P, Q, B, Method>,
  response: ResponseFactory
) => IKibanaResponse<any> | Promise<IKibanaResponse<any>>;

/**
 * Type-safe wrapper for {@link RequestHandler} function.
 * @example
 * ```typescript
 * export const wrapper: RequestHandlerWrapper = handler => {
 *   return async (context, request, response) => {
 *     // do some logic
 *     ...
 *   };
 * }
 * ```
 * @public
 */
export type RequestHandlerWrapper = <
  P,
  Q,
  B,
  Context extends RequestHandlerContextBase = RequestHandlerContextBase,
  Method extends RouteMethod = any,
  ResponseFactory extends KibanaResponseFactory = KibanaResponseFactory
>(
  handler: RequestHandler<P, Q, B, Context, Method, ResponseFactory>
) => RequestHandler<P, Q, B, Context, Method, ResponseFactory>;
