/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EventEmitter } from 'node:events';
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
  RouteSecurity,
  PostValidationMetadata,
} from '@kbn/core-http-server';
import { isZod } from '@kbn/zod';
import { validBodyOutput, getRequestValidation } from '@kbn/core-http-server';
import type { RouteSecurityGetter } from '@kbn/core-http-server';
import type { DeepPartial } from '@kbn/utility-types';
import { RouteValidator } from './validator';
import { ALLOWED_PUBLIC_VERSION, CoreVersionedRouter } from './versioned_router';
import { CoreKibanaRequest } from './request';
import { kibanaResponseFactory } from './response';
import { HapiResponseAdapter } from './response_adapter';
import { wrapErrors } from './error_wrapper';
import { Method } from './versioned_router/types';
import { getVersionHeader, injectVersionHeader, prepareRouteConfigValidation } from './util';
import { stripIllegalHttp2Headers } from './strip_illegal_http2_headers';
import { validRouteSecurity } from './security_route_config_validator';
import { InternalRouteConfig } from './route';

export type ContextEnhancer<
  P,
  Q,
  B,
  Method extends RouteMethod,
  Context extends RequestHandlerContextBase
> = (handler: RequestHandler<P, Q, B, Context, Method>) => RequestHandlerEnhanced<P, Q, B, Method>;

export function getRouteFullPath(routerPath: string, routePath: string) {
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
  route: InternalRouteConfig<P, Q, B, typeof routeMethod>,
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
  routeConfig: InternalRouteConfig<unknown, unknown, unknown, typeof method>
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

  // @ts-expect-error to eliminate problems with `security` in the options for route factories abstractions
  if (options.security) {
    throw new Error('`options.security` is not allowed in route config. Use `security` instead.');
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
  /** @default false */
  isVersioned: boolean;
  /**
   * Whether this route should emit "route events" like postValidate
   * @default true
   */
  events: boolean;
}

/** @internal */
export type VersionedRouteConfig<P, Q, B, M extends RouteMethod> = Omit<
  RouteConfig<P, Q, B, M>,
  'security'
> & {
  security?: RouteSecurityGetter;
};

/** @internal */
export type InternalRegistrar<M extends Method, C extends RequestHandlerContextBase> = <P, Q, B>(
  route: InternalRouteConfig<P, Q, B, M>,
  handler: RequestHandler<P, Q, B, C, M>,
  internalOpts?: InternalRegistrarOptions
) => ReturnType<RouteRegistrar<M, C>>;

/** @internal */
type RouterEvents =
  /** Called after route validation, regardless of success or failure */
  'onPostValidate';

/**
 * @internal
 */
export class Router<Context extends RequestHandlerContextBase = RequestHandlerContextBase>
  implements IRouter<Context>
{
  private static ee = new EventEmitter();
  public routes: Array<Readonly<RouterRoute>> = [];
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
        route: InternalRouteConfig<P, Q, B, Method>,
        handler: RequestHandler<P, Q, B, Context, Method>,
        { isVersioned, events }: InternalRegistrarOptions = { isVersioned: false, events: true }
      ) => {
        route = prepareRouteConfigValidation(route);
        const routeSchemas = routeSchemasFromRouteConfig(route, method);
        const isPublicUnversionedRoute =
          !isVersioned &&
          route.options?.access === 'public' &&
          // We do not consider HTTP resource routes as APIs
          route.options?.httpResource !== true;

        this.routes.push({
          handler: async (req, responseToolkit) => {
            return await this.handle({
              routeSchemas,
              request: req,
              responseToolkit,
              isPublicUnversionedRoute,
              handler: this.enhanceWithContext(handler),
              emit: events ? { onPostValidation: this.emitPostValidate } : undefined,
            });
          },
          method,
          path: getRouteFullPath(this.routerPath, route.path),
          options: validOptions(method, route),
          // For the versioned route security is validated in the versioned router
          security: isVersioned
            ? route.security
            : validRouteSecurity(route.security as DeepPartial<RouteSecurity>, route.options),
          validationSchemas: route.validate,
          // @ts-ignore using isVersioned: false in the type instead of boolean
          // for typeguarding between versioned and unversioned RouterRoute types
          isVersioned,
        });
      };

    this.get = buildMethod('get');
    this.post = buildMethod('post');
    this.delete = buildMethod('delete');
    this.put = buildMethod('put');
    this.patch = buildMethod('patch');
  }

  public static on(event: RouterEvents, cb: (req: CoreKibanaRequest, ...args: any[]) => void) {
    Router.ee.on(event, cb);
  }

  public static off(event: RouterEvents, cb: (req: CoreKibanaRequest, ...args: any[]) => void) {
    Router.ee.off(event, cb);
  }

  public getRoutes({ excludeVersionedRoutes }: { excludeVersionedRoutes?: boolean } = {}) {
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

  /** Should be private, just exposed for convenience for the versioned router */
  public emitPostValidate = (
    request: KibanaRequest,
    postValidateConext: PostValidationMetadata = {
      isInternalApiRequest: true,
      isPublicAccess: false,
    }
  ) => {
    const postValidate: RouterEvents = 'onPostValidate';
    Router.ee.emit(postValidate, request, postValidateConext);
  };

  private async handle<P, Q, B>({
    routeSchemas,
    request,
    responseToolkit,
    emit,
    isPublicUnversionedRoute,
    handler,
  }: {
    request: Request;
    responseToolkit: ResponseToolkit;
    emit?: {
      onPostValidation: (req: KibanaRequest, metadata: PostValidationMetadata) => void;
    };
    isPublicUnversionedRoute: boolean;
    handler: RequestHandlerEnhanced<
      P,
      Q,
      B,
      // request.method's type contains way more verbs than we currently support
      typeof request.method extends RouteMethod ? typeof request.method : any
    >;
    routeSchemas?: RouteValidator<P, Q, B>;
  }) {
    let kibanaRequest: KibanaRequest<
      P,
      Q,
      B,
      typeof request.method extends RouteMethod ? typeof request.method : any
    >;
    const hapiResponseAdapter = new HapiResponseAdapter(responseToolkit);
    try {
      kibanaRequest = CoreKibanaRequest.from(request, routeSchemas) as KibanaRequest<
        P,
        Q,
        B,
        typeof request.method extends RouteMethod ? typeof request.method : any
      >;
    } catch (error) {
      this.logError('400 Bad Request', 400, { request, error });
      const response = hapiResponseAdapter.toBadRequest(error.message);
      if (isPublicUnversionedRoute) {
        response.output.headers = {
          ...response.output.headers,
          ...getVersionHeader(ALLOWED_PUBLIC_VERSION),
        };
      }

      // Emit onPostValidation even if validation fails.
      const req = CoreKibanaRequest.from(request);
      emit?.onPostValidation(req, {
        deprecated: req.route.options.deprecated,
        isInternalApiRequest: req.isInternalApiRequest,
        isPublicAccess: req.route.options.access === 'public',
      });
      return response;
    }

    emit?.onPostValidation(kibanaRequest, {
      deprecated: kibanaRequest.route.options.deprecated,
      isInternalApiRequest: kibanaRequest.isInternalApiRequest,
      isPublicAccess: kibanaRequest.route.options.access === 'public',
    });

    try {
      const kibanaResponse = await handler(kibanaRequest, kibanaResponseFactory);
      if (isPublicUnversionedRoute) {
        injectVersionHeader(ALLOWED_PUBLIC_VERSION, kibanaResponse);
      }
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
