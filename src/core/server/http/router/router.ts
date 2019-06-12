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

import { ObjectType, schema, TypeOf } from '@kbn/config-schema';
import { Request, ResponseObject, ResponseToolkit } from 'hapi';

import { KibanaRequest } from './request';
import { KibanaResponse, ResponseFactory, responseFactory } from './response';
import { RouteConfig, RouteConfigOptions, RouteMethod, RouteSchemas } from './route';

export interface RouterRoute {
  method: RouteMethod;
  path: string;
  options: RouteConfigOptions;
  handler: (req: Request, responseToolkit: ResponseToolkit) => Promise<ResponseObject>;
}

/** @public */
export class Router {
  public routes: Array<Readonly<RouterRoute>> = [];

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
      handler: async (req, responseToolkit) =>
        await this.handle(routeSchemas, req, responseToolkit, handler),
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
      handler: async (req, responseToolkit) =>
        await this.handle(routeSchemas, req, responseToolkit, handler),
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
      handler: async (req, responseToolkit) =>
        await this.handle(routeSchemas, req, responseToolkit, handler),
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
      handler: async (req, responseToolkit) =>
        await this.handle(routeSchemas, req, responseToolkit, handler),
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
        `The [${routeMethod}] at [${
          route.path
        }] does not have a 'validate' specified. Use 'false' as the value if you want to bypass validation.`
      );
    }

    return route.validate ? route.validate(schema) : undefined;
  }

  private async handle<P extends ObjectType, Q extends ObjectType, B extends ObjectType>(
    routeSchemas: RouteSchemas<P, Q, B> | undefined,
    request: Request,
    responseToolkit: ResponseToolkit,
    handler: RequestHandler<P, Q, B>
  ) {
    let kibanaRequest: KibanaRequest<TypeOf<P>, TypeOf<Q>, TypeOf<B>>;

    try {
      kibanaRequest = KibanaRequest.from(request, routeSchemas);
    } catch (e) {
      // TODO Handle failed validation
      return responseToolkit.response({ error: e.message }).code(400);
    }

    try {
      const kibanaResponse = await handler(kibanaRequest, responseFactory);

      let payload = null;
      if (kibanaResponse.payload instanceof Error) {
        // TODO Design an error format
        payload = { error: kibanaResponse.payload.message };
      } else if (kibanaResponse.payload !== undefined) {
        payload = kibanaResponse.payload;
      }

      return responseToolkit.response(payload).code(kibanaResponse.status);
    } catch (e) {
      // TODO Handle `KibanaResponseError`

      // Otherwise we default to something along the lines of
      return responseToolkit.response({ error: e.message }).code(500);
    }
  }
}

export type RequestHandler<P extends ObjectType, Q extends ObjectType, B extends ObjectType> = (
  req: KibanaRequest<TypeOf<P>, TypeOf<Q>, TypeOf<B>>,
  createResponse: ResponseFactory
) => KibanaResponse<any> | Promise<KibanaResponse<any>>;
