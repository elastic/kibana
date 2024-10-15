/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { RequestHandlerContext } from 'src/core/server';
import type {
  IRouter,
  RouteConfig,
  IKibanaResponse,
  ResponseHeaders,
  HttpResponseOptions,
  KibanaResponseFactory,
  RequestHandler,
} from '../http';

/**
 * Allows to configure HTTP response parameters
 * @public
 */
export interface HttpResourcesRenderOptions {
  /**
   * HTTP Headers with additional information about response.
   * @remarks
   * All HTML pages are already pre-configured with `content-security-policy` header that cannot be overridden.
   * */
  headers?: ResponseHeaders;
  /**
   * @internal
   * This is only used for integration tests that allow us to verify which config keys are exposed to the browser.
   */
  includeExposedConfigKeys?: boolean;
}

/**
 * HTTP Resources response parameters
 * @public
 */
export type HttpResourcesResponseOptions = HttpResponseOptions;

/**
 * Extended set of {@link KibanaResponseFactory} helpers used to respond with HTML or JS resource.
 * @public
 */
export interface HttpResourcesServiceToolkit {
  /** To respond with HTML page bootstrapping Kibana application. */
  renderCoreApp: (options?: HttpResourcesRenderOptions) => Promise<IKibanaResponse>;
  /** To respond with HTML page bootstrapping Kibana application without retrieving user-specific information. */
  renderAnonymousCoreApp: (options?: HttpResourcesRenderOptions) => Promise<IKibanaResponse>;
  /** To respond with a custom HTML page. */
  renderHtml: (options: HttpResourcesResponseOptions) => IKibanaResponse;
  /** To respond with a custom JS script file. */
  renderJs: (options: HttpResourcesResponseOptions) => IKibanaResponse;
}

/**
 * Extended version of {@link RequestHandler} having access to {@link HttpResourcesServiceToolkit}
 * to respond with HTML or JS resources.
 * @param context {@link RequestHandlerContext} - the core context exposed for this request.
 * @param request {@link KibanaRequest} - object containing information about requested resource,
 * such as path, method, headers, parameters, query, body, etc.
 * @param response {@link KibanaResponseFactory} {@libk HttpResourcesServiceToolkit} - a set of helper functions used to respond to a request.
 *
 *  @example
 * ```typescript
 * httpResources.register({
 *   path: '/login',
 *   validate: {
 *     params: schema.object({ id: schema.string() }),
 *   },
 * },
 * async (context, request, response) => {
 *   //..
 *   return response.renderCoreApp();
 * });
 * @public
 */
export type HttpResourcesRequestHandler<
  P = unknown,
  Q = unknown,
  B = unknown,
  Context extends RequestHandlerContext = RequestHandlerContext
> = RequestHandler<P, Q, B, Context, 'get', KibanaResponseFactory & HttpResourcesServiceToolkit>;

/**
 * Allows to configure HTTP response parameters
 * @internal
 */
export interface InternalHttpResourcesPreboot {
  createRegistrar(router: IRouter): HttpResources;
}

/**
 * Allows to configure HTTP response parameters
 * @internal
 */
export type InternalHttpResourcesSetup = InternalHttpResourcesPreboot;

/**
 * HttpResources service is responsible for serving static & dynamic assets for Kibana application via HTTP.
 * Provides API allowing plug-ins to respond with:
 * - a pre-configured HTML page bootstrapping Kibana client app
 * - custom HTML page
 * - custom JS script file.
 * @public
 */
export interface HttpResources {
  /** To register a route handler executing passed function to form response. */
  register: <P, Q, B, Context extends RequestHandlerContext = RequestHandlerContext>(
    route: RouteConfig<P, Q, B, 'get'>,
    handler: HttpResourcesRequestHandler<P, Q, B, Context>
  ) => void;
}
