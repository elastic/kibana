/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { ObjectType, TypeOf, Type } from '@kbn/config-schema';
import { Request, ResponseObject, ResponseToolkit } from 'hapi';

import { Logger } from '../../logging';
import { KibanaRequest } from './request';
import { KibanaResponse, KibanaResponseFactory, kibanaResponseFactory } from './response';
import { RouteConfig, RouteConfigOptions, RouteMethod, RouteSchemas } from './route';
import { HapiResponseAdapter } from './response_adapter';

interface RouterRoute {
  method: RouteMethod;
  path: string;
  options: RouteConfigOptions;
  handler: (req: Request, responseToolkit: ResponseToolkit, log: Logger) => Promise<ResponseObject>;
}

/**
 * Provides ability to declare a handler function for a particular path and HTTP request method.
 * Each route can have only one handler functions, which is executed when the route is matched.
 *
 * @example
 * ```ts
 * const router = new Router('my-app');
 * // handler is called when 'my-app/path' resource is requested with `GET` method
 * router.get({ path: '/path', validate: false }, (req, res) => res.ok({ content: 'ok' }));
 * ```
 *
 * @public
 * */
export class Router {
  public routes: Array<Readonly<RouterRoute>> = [];
  /**
   * @param path - a router path, set as the very first path segment for all registered routes.
   */
  constructor(readonly path: string) {}

  /**
   * Register a route handler for `GET` request.
   * @param route {@link RouteConfig} - a route configuration.
   * @param handler {@link RequestHandler} - a function to call to respond to an incoming request
   */
  public get<P extends ObjectType, Q extends ObjectType, B extends ObjectType>(
    route: RouteConfig<P, Q, B>,
    handler: RequestHandler<P, Q, B>
  ) {
    const { path, options = {} } = route;
    const routeSchemas = this.routeSchemasFromRouteConfig(route, 'get');
    this.routes.push({
      handler: async (req, responseToolkit, log) =>
        await this.handle(routeSchemas, req, responseToolkit, handler, log),
      method: 'get',
      path,
      options,
    });
  }

  /**
   * Register a route handler for `POST` request.
   * @param route {@link RouteConfig} - a route configuration.
   * @param handler {@link RequestHandler} - a function to call to respond to an incoming request
   */
  public post<P extends ObjectType, Q extends ObjectType, B extends ObjectType>(
    route: RouteConfig<P, Q, B>,
    handler: RequestHandler<P, Q, B>
  ) {
    const { path, options = {} } = route;
    const routeSchemas = this.routeSchemasFromRouteConfig(route, 'post');
    this.routes.push({
      handler: async (req, responseToolkit, log) =>
        await this.handle(routeSchemas, req, responseToolkit, handler, log),
      method: 'post',
      path,
      options,
    });
  }

  /**
   * Register a route handler for `PUT` request.
   * @param route {@link RouteConfig} - a route configuration.
   * @param handler {@link RequestHandler} - a function to call to respond to an incoming request
   */
  public put<P extends ObjectType, Q extends ObjectType, B extends ObjectType>(
    route: RouteConfig<P, Q, B>,
    handler: RequestHandler<P, Q, B>
  ) {
    const { path, options = {} } = route;
    const routeSchemas = this.routeSchemasFromRouteConfig(route, 'put');
    this.routes.push({
      handler: async (req, responseToolkit, log) =>
        await this.handle(routeSchemas, req, responseToolkit, handler, log),
      method: 'put',
      path,
      options,
    });
  }

  /**
   * Register a route handler for `DELETE` request.
   * @param route {@link RouteConfig} - a route configuration.
   * @param handler {@link RequestHandler} - a function to call to respond to an incoming request
   */
  public delete<P extends ObjectType, Q extends ObjectType, B extends ObjectType>(
    route: RouteConfig<P, Q, B>,
    handler: RequestHandler<P, Q, B>
  ) {
    const { path, options = {} } = route;
    const routeSchemas = this.routeSchemasFromRouteConfig(route, 'delete');
    this.routes.push({
      handler: async (req, responseToolkit, log) =>
        await this.handle(routeSchemas, req, responseToolkit, handler, log),
      method: 'delete',
      path,
      options,
    });
  }

  /**
   * Returns all routes registered with the this router.
   * @returns List of registered routes.
   * @internal
   */
  public getRoutes() {
    return [...this.routes];
  }

  /**
   * Create the validation schemas for a route
   *
   * @returns Route schemas if `validate` is specified on the route, otherwise
   * undefined.
   */
  private routeSchemasFromRouteConfig<
    P extends ObjectType,
    Q extends ObjectType,
    B extends ObjectType
  >(route: RouteConfig<P, Q, B>, routeMethod: RouteMethod) {
    // The type doesn't allow `validate` to be undefined, but it can still
    // happen when it's used from JavaScript.
    if (route.validate === undefined) {
      throw new Error(
        `The [${routeMethod}] at [${route.path}] does not have a 'validate' specified. Use 'false' as the value if you want to bypass validation.`
      );
    }

    if (route.validate !== false) {
      Object.entries(route.validate).forEach(([key, schema]) => {
        if (!(schema instanceof Type)) {
          throw new Error(
            `Expected a valid schema declared with '@kbn/config-schema' package at key: [${key}].`
          );
        }
      });
    }

    return route.validate ? route.validate : undefined;
  }

  private async handle<P extends ObjectType, Q extends ObjectType, B extends ObjectType>(
    routeSchemas: RouteSchemas<P, Q, B> | undefined,
    request: Request,
    responseToolkit: ResponseToolkit,
    handler: RequestHandler<P, Q, B>,
    log: Logger
  ) {
    let kibanaRequest: KibanaRequest<TypeOf<P>, TypeOf<Q>, TypeOf<B>>;
    const hapiResponseAdapter = new HapiResponseAdapter(responseToolkit);
    try {
      kibanaRequest = KibanaRequest.from(request, routeSchemas);
    } catch (e) {
      return hapiResponseAdapter.toBadRequest(e.message);
    }

    try {
      const kibanaResponse = await handler(kibanaRequest, kibanaResponseFactory);
      return hapiResponseAdapter.handle(kibanaResponse);
    } catch (e) {
      log.error(e);
      return hapiResponseAdapter.toInternalError();
    }
  }
}

/**
 * A function executed when route path matched requested resource path.
 * Request handler is expected to return a result of one of {@link KibanaResponseFactory} functions.
 * @param request {@link KibanaRequest} - object containing information about requested resource,
 * such as path, method, headers, parameters, query, body, etc.
 * @param response {@link KibanaResponseFactory} - a set of helper functions used to respond to a request.
 *
 * @example
 * ```ts
 * const router = new Router('my-app');
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
 *   async (request, response) => {
 *     const data = await findObject(request.params.id);
 *     // creates a command to respond with 'not found' error
 *     if (!data) return response.notFound();
 *     // creates a command to send found data to the client
 *     return response.ok(data);
 *   }
 * );
 * ```
 * @public
 */
export type RequestHandler<P extends ObjectType, Q extends ObjectType, B extends ObjectType> = (
  request: KibanaRequest<TypeOf<P>, TypeOf<Q>, TypeOf<B>>,
  response: KibanaResponseFactory
) => KibanaResponse<any> | Promise<KibanaResponse<any>>;
