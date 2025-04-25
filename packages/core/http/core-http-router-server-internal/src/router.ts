/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { Request, ResponseToolkit } from '@hapi/hapi';
import apm from 'elastic-apm-node';
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
  VersionedRouter,
  RouteRegistrar,
} from '@kbn/core-http-server';
import { isZod } from '@kbn/zod';
import { validBodyOutput, getRequestValidation } from '@kbn/core-http-server';
import { RouteValidator } from './validator';
import { CoreVersionedRouter } from './versioned_router';
import { CoreKibanaRequest } from './request';
import { kibanaResponseFactory } from './response';
import { HapiResponseAdapter } from './response_adapter';
import { wrapErrors } from './error_wrapper';
import { Method } from './versioned_router/types';
import { prepareRouteConfigValidation } from './util';
import { stripIllegalHttp2Headers } from './strip_illegal_http2_headers';

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
    const validation = getRequestValidation(route.validate);
    Object.entries(validation).forEach(([key, schema]) => {
      if (!(isConfigSchema(schema) || isZod(schema) || typeof schema === 'function')) {
        throw new Error(
          `Expected a valid validation logic declared with '@kbn/config-schema' package, '@kbn/zod' package or a RouteValidationFunction at key: [${key}].`
        );
      }
    });
    return RouteValidator.from(validation);
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
  const shouldValidateBody = (validate && !!getRequestValidation(validate).body) || !!options.body;

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

/** @internal */
export interface RouterOptions {
  /** Whether we are running in development */
  isDev?: boolean;

  /** Plugin for which this router was registered */
  pluginId?: symbol;

  versionedRouterOptions?: {
    /** {@inheritdoc VersionedRouterArgs['defaultHandlerResolutionStrategy'] }*/
    defaultHandlerResolutionStrategy?: 'newest' | 'oldest' | 'none';

    /** {@inheritdoc VersionedRouterArgs['useVersionResolutionStrategyForInternalPaths'] }*/
    useVersionResolutionStrategyForInternalPaths?: string[];
  };
}

/** @internal */
export interface InternalRegistrarOptions {
  isVersioned: boolean;
}

/** @internal */
export type InternalRegistrar<M extends Method, C extends RequestHandlerContextBase> = <P, Q, B>(
  route: RouteConfig<P, Q, B, M>,
  handler: RequestHandler<P, Q, B, C, M>,
  internalOpts?: InternalRegistrarOptions
) => ReturnType<RouteRegistrar<M, C>>;

/** @internal */
export interface InternalRouterRoute extends RouterRoute {
  readonly isVersioned: boolean;
}

/** @internal */
interface InternalGetRoutesOptions {
  excludeVersionedRoutes?: boolean;
}

/**
 * @internal
 */
export class Router<Context extends RequestHandlerContextBase = RequestHandlerContextBase>
  implements IRouter<Context>
{
  public routes: Array<Readonly<InternalRouterRoute>> = [];
  public pluginId?: symbol;
  public get: InternalRegistrar<'get', Context>;
  public post: InternalRegistrar<'post', Context>;
  public delete: InternalRegistrar<'delete', Context>;
  public put: InternalRegistrar<'put', Context>;
  public patch: InternalRegistrar<'patch', Context>;

  constructor(
    public readonly routerPath: string,
    private readonly log: Logger,
    private readonly enhanceWithContext: ContextEnhancer<any, any, any, any, any>,
    private readonly options: RouterOptions
  ) {
    this.pluginId = options.pluginId;
    const buildMethod =
      <Method extends RouteMethod>(method: Method) =>
      <P, Q, B>(
        route: RouteConfig<P, Q, B, Method>,
        handler: RequestHandler<P, Q, B, Context, Method>,
        internalOptions: { isVersioned: boolean } = { isVersioned: false }
      ) => {
        route = prepareRouteConfigValidation(route);
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
          /** Below is added for introspection */
          validationSchemas: route.validate,
          isVersioned: internalOptions.isVersioned,
        });
      };

    this.get = buildMethod('get');
    this.post = buildMethod('post');
    this.delete = buildMethod('delete');
    this.put = buildMethod('put');
    this.patch = buildMethod('patch');
  }

  public getRoutes({ excludeVersionedRoutes }: InternalGetRoutesOptions = {}) {
    if (excludeVersionedRoutes) {
      return this.routes.filter((route) => !route.isVersioned);
    }
    return [...this.routes];
  }

  public handleLegacyErrors = wrapErrors;

  private logError(
    msg: string,
    statusCode: number,
    {
      error,
      request,
    }: {
      request: Request;
      error: Error;
    }
  ) {
    this.log.error(msg, {
      http: {
        response: { status_code: statusCode },
        request: { method: request.route?.method, path: request.route?.path },
      },
      error: { message: error.message },
    });
  }

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
    } catch (error) {
      this.logError('400 Bad Request', 400, { request, error });
      return hapiResponseAdapter.toBadRequest(error.message);
    }

    try {
      const kibanaResponse = await handler(kibanaRequest, kibanaResponseFactory);
      if (kibanaRequest.protocol === 'http2' && kibanaResponse.options.headers) {
        kibanaResponse.options.headers = stripIllegalHttp2Headers({
          headers: kibanaResponse.options.headers,
          isDev: this.options.isDev ?? false,
          logger: this.log,
          requestContext: `${request.route.method} ${request.route.path}`,
        });
      }
      return hapiResponseAdapter.handle(kibanaResponse);
    } catch (error) {
      // capture error
      apm.captureError(error);

      // forward 401 errors from ES client
      if (isElasticsearchUnauthorizedError(error)) {
        this.logError('401 Unauthorized', 401, { request, error });
        return hapiResponseAdapter.handle(
          kibanaResponseFactory.unauthorized(convertEsUnauthorized(error))
        );
      }

      // return a generic 500 to avoid error info / stack trace surfacing
      this.logError('500 Server Error', 500, { request, error });
      return hapiResponseAdapter.toInternalError();
    }
  }

  private versionedRouter: undefined | VersionedRouter<Context> = undefined;

  public get versioned(): VersionedRouter<Context> {
    if (this.versionedRouter === undefined) {
      this.versionedRouter = CoreVersionedRouter.from({
        router: this,
        isDev: this.options.isDev,
        ...this.options.versionedRouterOptions,
      });
    }
    return this.versionedRouter;
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
