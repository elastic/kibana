/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { Request, ResponseToolkit } from '@hapi/hapi';
import { isConfigSchema } from '@kbn/config-schema';
import type { Logger } from '@kbn/logging';
import {
  isUnauthorizedError as isElasticsearchUnauthorizedError,
  UnauthorizedError as EsNotAuthorizedError,
} from '@kbn/es-errors';
import type {
  KibanaRequest,
  ErrorHttpResponseOptions,
  RouteConfig,
  RouteMethod,
  RequestHandlerContextBase,
  RouterRoute,
  IRouter,
  RequestHandler,
} from '@kbn/core-http-server';
import { validBodyOutput } from '@kbn/core-http-server';
import { CoreKibanaRequest } from './request';
import { kibanaResponseFactory } from './response';
import { HapiResponseAdapter } from './response_adapter';
import { wrapErrors } from './error_wrapper';
import { RouteValidator } from './validator';

export type ContextEnhancer<
  P,
  Q,
  B,
  Method extends RouteMethod,
  Context extends RequestHandlerContextBase
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
export class Router<Context extends RequestHandlerContextBase = RequestHandlerContextBase>
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
      kibanaRequest = CoreKibanaRequest.from(request, routeSchemas);
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
  RequestHandler<P, Q, B, RequestHandlerContextBase, Method>
>;
