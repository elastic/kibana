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
import Boom from 'boom';

import { Logger } from '../../logging';
import { KibanaRequest } from './request';
import { KibanaResponse, ResponseFactory, responseFactory } from './response';
import { RouteConfig, RouteConfigOptions, RouteMethod, RouteSchemas } from './route';
import { HapiResponseAdapter } from './response_adapter';

/**
 * @internal
 */
export interface RouterRoute {
  method: RouteMethod;
  path: string;
  options: RouteConfigOptions;
  handler: (
    request: Request,
    responseToolkit: ResponseToolkit,
    log: Logger
  ) => Promise<ResponseObject | Boom<any>>;
}

/** @public */
export class Router {
  private routes: Array<Readonly<RouterRoute>> = [];

  constructor(readonly path: string) {}

  /**
   * Register a `GET` request with the router
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
   * Register a `POST` request with the router
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
   * Register a `PUT` request with the router
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
   * Register a `DELETE` request with the router
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
   */
  public getRoutes() {
    return [...this.routes];
  }

  /**
   * Create the schemas for a route
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
      const kibanaResponse = await handler(kibanaRequest, responseFactory);
      return hapiResponseAdapter.handle(kibanaResponse);
    } catch (e) {
      log.error(e);
      return hapiResponseAdapter.toInternalError();
    }
  }
}

export type RequestHandler<P extends ObjectType, Q extends ObjectType, B extends ObjectType> = (
  request: KibanaRequest<TypeOf<P>, TypeOf<Q>, TypeOf<B>>,
  createResponse: ResponseFactory
) => KibanaResponse<any> | Promise<KibanaResponse<any>>;
