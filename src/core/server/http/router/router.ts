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

import { Stream } from 'stream';
import { Logger } from '../../logging';
import { KibanaRequest } from './request';
import { KibanaResponseFactory, kibanaResponseFactory, IKibanaResponse } from './response';
import {
  RouteConfig,
  RouteConfigOptions,
  RouteMethod,
  RouteSchemas,
  validBodyOutput,
} from './route';
import { HapiResponseAdapter } from './response_adapter';
import { RequestHandlerContext } from '../../../server';

/**
 * Definition of a route
 *
 * @public
 */
export interface RouterRoute {
  method: RouteMethod;
  path: string;
  options: RouteConfigOptions;
  handler: (req: Request, responseToolkit: ResponseToolkit) => Promise<ResponseObject | Boom<any>>;
}

/**
 * Registers route handlers for specified resource path and method.
 * See {@link RouteConfig} and {@link RequestHandler} for more information about arguments to route registrations.
 *
 * @public
 */
export interface IRouter {
  /**
   * Resulted path
   */
  routerPath: string;

  /**
   * Register a route handler for `GET` request.
   * @param route {@link RouteConfig} - a route configuration.
   * @param handler {@link RequestHandler} - a function to call to respond to an incoming request
   */
  get: <P extends ObjectType, Q extends ObjectType, B extends never>(
    route: RouteConfig<P, Q, B, 'get'>,
    handler: RequestHandler<P, Q, B>
  ) => void;

  /**
   * Register a route handler for `OPTIONS` request.
   * @param route {@link RouteConfig} - a route configuration.
   * @param handler {@link RequestHandler} - a function to call to respond to an incoming request
   */
  options: <P extends ObjectType, Q extends ObjectType, B extends never>(
    route: RouteConfig<P, Q, B, 'options'>,
    handler: RequestHandler<P, Q, B>
  ) => void;

  /**
   * Register a route handler for `POST` request.
   * @param route {@link RouteConfig} - a route configuration.
   * @param handler {@link RequestHandler} - a function to call to respond to an incoming request
   */
  post: <
    P extends ObjectType,
    Q extends ObjectType,
    B extends ObjectType | Type<Buffer> | Type<Stream>
  >(
    route: RouteConfig<P, Q, B, 'post'>,
    handler: RequestHandler<P, Q, B>
  ) => void;

  /**
   * Register a route handler for `PUT` request.
   * @param route {@link RouteConfig} - a route configuration.
   * @param handler {@link RequestHandler} - a function to call to respond to an incoming request
   */
  put: <
    P extends ObjectType,
    Q extends ObjectType,
    B extends ObjectType | Type<Buffer> | Type<Stream>
  >(
    route: RouteConfig<P, Q, B, 'put'>,
    handler: RequestHandler<P, Q, B>
  ) => void;

  /**
   * Register a route handler for `PATCH` request.
   * @param route {@link RouteConfig} - a route configuration.
   * @param handler {@link RequestHandler} - a function to call to respond to an incoming request
   */
  patch: <
    P extends ObjectType,
    Q extends ObjectType,
    B extends ObjectType | Type<Buffer> | Type<Stream>
  >(
    route: RouteConfig<P, Q, B, 'patch'>,
    handler: RequestHandler<P, Q, B>
  ) => void;

  /**
   * Register a route handler for `DELETE` request.
   * @param route {@link RouteConfig} - a route configuration.
   * @param handler {@link RequestHandler} - a function to call to respond to an incoming request
   */
  delete: <
    P extends ObjectType,
    Q extends ObjectType,
    B extends ObjectType | Type<Buffer> | Type<Stream>
  >(
    route: RouteConfig<P, Q, B, 'delete'>,
    handler: RequestHandler<P, Q, B>
  ) => void;

  /**
   * Returns all routes registered with this router.
   * @returns List of registered routes.
   * @internal
   */
  getRoutes: () => RouterRoute[];
}

export type ContextEnhancer<P extends ObjectType, Q extends ObjectType, B extends ObjectType> = (
  handler: RequestHandler<P, Q, B>
) => RequestHandlerEnhanced<P, Q, B>;

function getRouteFullPath(routerPath: string, routePath: string) {
  // If router's path ends with slash and route's path starts with slash,
  // we should omit one of them to have a valid concatenated path.
  const routePathStartIndex = routerPath.endsWith('/') && routePath.startsWith('/') ? 1 : 0;
  return `${routerPath}${routePath.slice(routePathStartIndex)}`;
}

/**
 * Create the validation schemas for a route
 *
 * @returns Route schemas if `validate` is specified on the route, otherwise
 * undefined.
 */
function routeSchemasFromRouteConfig<
  P extends ObjectType,
  Q extends ObjectType,
  B extends ObjectType | Type<Buffer> | Type<Stream>,
  Method extends RouteMethod
>(route: RouteConfig<P, Q, B, Method>, routeMethod: Method) {
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

/**
 * Create a valid options object with "sensible" defaults + adding some validation to the options fields
 *
 * @param method HTTP verb for these options
 * @param routeConfig The route config definition
 */
function validOptions<Method extends RouteMethod>(
  method: Method,
  routeConfig: RouteConfig<ObjectType, ObjectType, ObjectType | Type<Buffer> | Type<Stream>, Method>
) {
  const shouldNotHavePayload = ['head', 'get'].includes(method);
  const { options = {}, validate } = routeConfig;
  const shouldValidateBody = (validate && !!validate.body) || !!options.body;

  const { output } = options.body || {};
  if (typeof output === 'string' && !validBodyOutput.includes(output)) {
    throw new Error(
      `[options.body.output: '${output}'] in route ${method.toUpperCase()} ${
        routeConfig.path
      } is not valid. Only '${validBodyOutput.join("' or '")}' are valid.`
    );
  }

  const body = shouldNotHavePayload
    ? undefined
    : {
        // If it's not a GET (requires payload) but no body validation is required (or no body options are specified),
        // We assume the route does not care about the body => use the memory-cheapest approach (stream and no parsing)
        output: !shouldValidateBody ? ('stream' as const) : undefined,
        parse: !shouldValidateBody ? false : undefined,

        // User's settings should overwrite any of the "desired" values
        ...options.body,
      };

  return { ...options, body };
}

/**
 * @internal
 */
export class Router implements IRouter {
  public routes: Array<Readonly<RouterRoute>> = [];
  public get: IRouter['get'];
  public post: IRouter['post'];
  public delete: IRouter['delete'];
  public put: IRouter['put'];
  public patch: IRouter['patch'];
  public options: IRouter['options'];

  constructor(
    public readonly routerPath: string,
    private readonly log: Logger,
    private readonly enhanceWithContext: ContextEnhancer<any, any, any>
  ) {
    const buildMethod = <Method extends RouteMethod>(method: Method) => <
      P extends ObjectType,
      Q extends ObjectType,
      B extends ObjectType | Type<Buffer> | Type<Stream>
    >(
      route: RouteConfig<P, Q, B, Method>,
      handler: RequestHandler<P, Q, B>
    ) => {
      const routeSchemas = routeSchemasFromRouteConfig(route, method);

      this.routes.push({
        handler: async (req, responseToolkit) =>
          await this.handle({
            routeSchemas,
            request: req,
            responseToolkit,
            handler: this.enhanceWithContext(handler),
          }),
        method,
        path: getRouteFullPath(this.routerPath, route.path),
        options: validOptions(method, route),
      });
    };

    this.get = buildMethod('get');
    this.post = buildMethod('post');
    this.delete = buildMethod('delete');
    this.put = buildMethod('put');
    this.patch = buildMethod('patch');
    this.options = buildMethod('options');
  }

  public getRoutes() {
    return [...this.routes];
  }

  private async handle<
    P extends ObjectType,
    Q extends ObjectType,
    B extends ObjectType | Type<Buffer> | Type<Stream>
  >({
    routeSchemas,
    request,
    responseToolkit,
    handler,
  }: {
    request: Request;
    responseToolkit: ResponseToolkit;
    handler: RequestHandlerEnhanced<P, Q, B>;
    routeSchemas?: RouteSchemas<P, Q, B>;
  }) {
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
      this.log.error(e);
      return hapiResponseAdapter.toInternalError();
    }
  }
}

type WithoutHeadArgument<T> = T extends (first: any, ...rest: infer Params) => infer Return
  ? (...rest: Params) => Return
  : never;

type RequestHandlerEnhanced<
  P extends ObjectType,
  Q extends ObjectType,
  B extends ObjectType | Type<Buffer> | Type<Stream>
> = WithoutHeadArgument<RequestHandler<P, Q, B>>;

/**
 * A function executed when route path matched requested resource path.
 * Request handler is expected to return a result of one of {@link KibanaResponseFactory} functions.
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
  P extends ObjectType,
  Q extends ObjectType,
  B extends ObjectType | Type<Buffer> | Type<Stream>
> = (
  context: RequestHandlerContext,
  request: KibanaRequest<TypeOf<P>, TypeOf<Q>, TypeOf<B>>,
  response: KibanaResponseFactory
) => IKibanaResponse<any> | Promise<IKibanaResponse<any>>;
