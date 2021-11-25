/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Request, ResponseObject, ResponseToolkit } from '@hapi/hapi';
import Boom from '@hapi/boom';

import { isConfigSchema } from '@kbn/config-schema';
import { Logger } from '../../logging';
import {
  isUnauthorizedError as isElasticsearchUnauthorizedError,
  UnauthorizedError as EsNotAuthorizedError,
} from '../../elasticsearch/client/errors';
import { KibanaRequest } from './request';
import {
  KibanaResponseFactory,
  kibanaResponseFactory,
  IKibanaResponse,
  ErrorHttpResponseOptions,
} from './response';
import { RouteConfig, RouteConfigOptions, RouteMethod, validBodyOutput } from './route';
import { HapiResponseAdapter } from './response_adapter';
import { RequestHandlerContext } from '../../../server';
import { wrapErrors } from './error_wrapper';
import { RouteValidator } from './validator';

/** @internal */
export interface RouterRoute {
  method: RouteMethod;
  path: string;
  options: RouteConfigOptions<RouteMethod>;
  handler: (
    req: Request,
    responseToolkit: ResponseToolkit
  ) => Promise<ResponseObject | Boom.Boom<any>>;
}

/**
 * Route handler common definition
 *
 * @public
 */
export type RouteRegistrar<
  Method extends RouteMethod,
  Context extends RequestHandlerContext = RequestHandlerContext
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
export interface IRouter<Context extends RequestHandlerContext = RequestHandlerContext> {
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

export type ContextEnhancer<
  P,
  Q,
  B,
  Method extends RouteMethod,
  Context extends RequestHandlerContext
> = (handler: RequestHandler<P, Q, B, Context, Method>) => RequestHandlerEnhanced<P, Q, B, Method>;

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
function routeSchemasFromRouteConfig<P, Q, B>(
  route: RouteConfig<P, Q, B, typeof routeMethod>,
  routeMethod: RouteMethod
) {
  // The type doesn't allow `validate` to be undefined, but it can still
  // happen when it's used from JavaScript.
  if (route.validate === undefined) {
    throw new Error(
      `The [${routeMethod}] at [${route.path}] does not have a 'validate' specified. Use 'false' as the value if you want to bypass validation.`
    );
  }

  if (route.validate !== false) {
    Object.entries(route.validate).forEach(([key, schema]) => {
      if (!(isConfigSchema(schema) || typeof schema === 'function')) {
        throw new Error(
          `Expected a valid validation logic declared with '@kbn/config-schema' package or a RouteValidationFunction at key: [${key}].`
        );
      }
    });
  }

  if (route.validate) {
    return RouteValidator.from(route.validate);
  }
}

/**
 * Create a valid options object with "sensible" defaults + adding some validation to the options fields
 *
 * @param method HTTP verb for these options
 * @param routeConfig The route config definition
 */
function validOptions(
  method: RouteMethod,
  routeConfig: RouteConfig<unknown, unknown, unknown, typeof method>
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
export class Router<Context extends RequestHandlerContext = RequestHandlerContext>
  implements IRouter<Context>
{
  public routes: Array<Readonly<RouterRoute>> = [];
  public get: IRouter<Context>['get'];
  public post: IRouter<Context>['post'];
  public delete: IRouter<Context>['delete'];
  public put: IRouter<Context>['put'];
  public patch: IRouter<Context>['patch'];

  constructor(
    public readonly routerPath: string,
    private readonly log: Logger,
    private readonly enhanceWithContext: ContextEnhancer<any, any, any, any, any>
  ) {
    const buildMethod =
      <Method extends RouteMethod>(method: Method) =>
      <P, Q, B>(
        route: RouteConfig<P, Q, B, Method>,
        handler: RequestHandler<P, Q, B, Context, Method>
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
  }

  public getRoutes() {
    return [...this.routes];
  }

  public handleLegacyErrors = wrapErrors;

  private async handle<P, Q, B>({
    routeSchemas,
    request,
    responseToolkit,
    handler,
  }: {
    request: Request;
    responseToolkit: ResponseToolkit;
    handler: RequestHandlerEnhanced<P, Q, B, typeof request.method>;
    routeSchemas?: RouteValidator<P, Q, B>;
  }) {
    let kibanaRequest: KibanaRequest<P, Q, B, typeof request.method>;
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
      // forward 401 errors from ES client
      if (isElasticsearchUnauthorizedError(e)) {
        return hapiResponseAdapter.handle(
          kibanaResponseFactory.unauthorized(convertEsUnauthorized(e))
        );
      }
      return hapiResponseAdapter.toInternalError();
    }
  }
}

const convertEsUnauthorized = (e: EsNotAuthorizedError): ErrorHttpResponseOptions => {
  const getAuthenticateHeaderValue = () => {
    const header = Object.entries(e.headers || {}).find(
      ([key]) => key.toLowerCase() === 'www-authenticate'
    );
    return header ? (header[1] as string) : 'Basic realm="Authorization Required"';
  };
  return {
    body: e.message,
    headers: {
      'www-authenticate': getAuthenticateHeaderValue(),
    },
  };
};

type WithoutHeadArgument<T> = T extends (first: any, ...rest: infer Params) => infer Return
  ? (...rest: Params) => Return
  : never;

type RequestHandlerEnhanced<P, Q, B, Method extends RouteMethod> = WithoutHeadArgument<
  RequestHandler<P, Q, B, RequestHandlerContext, Method>
>;

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
  Context extends RequestHandlerContext = RequestHandlerContext,
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
  Context extends RequestHandlerContext = RequestHandlerContext,
  Method extends RouteMethod = any,
  ResponseFactory extends KibanaResponseFactory = KibanaResponseFactory
>(
  handler: RequestHandler<P, Q, B, Context, Method, ResponseFactory>
) => RequestHandler<P, Q, B, Context, Method, ResponseFactory>;
