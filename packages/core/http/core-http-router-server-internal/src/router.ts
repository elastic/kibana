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
  PostValidationMetadata,
  IKibanaResponse,
} from '@kbn/core-http-server';
import { isZod } from '@kbn/zod';
import { getRequestValidation } from '@kbn/core-http-server';
import type { RouteSecurityGetter } from '@kbn/core-http-server';
import { RouteValidator } from './validator';
import { CoreVersionedRouter } from './versioned_router';
import { CoreKibanaRequest, getProtocolFromRequest } from './request';
import { kibanaResponseFactory } from './response';
import { HapiResponseAdapter } from './response_adapter';
import { wrapErrors } from './error_wrapper';
import { Method } from './versioned_router/types';
import { formatErrorMeta } from './util';
import { stripIllegalHttp2Headers } from './strip_illegal_http2_headers';
import { InternalRouteConfig, buildRoute } from './route';

export type ContextEnhancer<
  P,
  Q,
  B,
  Method extends RouteMethod,
  Context extends RequestHandlerContextBase
> = (handler: RequestHandler<P, Q, B, Context, Method>) => RequestHandlerEnhanced<P, Q, B, Method>;

/**
 * @internal
 */
export type InternalRouteHandler = (request: Request) => Promise<IKibanaResponse>;

export type InternalRouterRoute = Omit<RouterRoute, 'handler'> & {
  handler: InternalRouteHandler;
};

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
export type VersionedRouteConfig<P, Q, B, M extends RouteMethod> = Omit<
  RouteConfig<P, Q, B, M>,
  'security'
> & {
  security?: RouteSecurityGetter;
};

/** @internal */
export type InternalRegistrar<M extends Method, C extends RequestHandlerContextBase> = <P, Q, B>(
  route: InternalRouteConfig<P, Q, B, M>,
  handler: RequestHandler<P, Q, B, C, M>
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
  /**
   * Used for global request events at the router level, similar to what we get from Hapi's request lifecycle events.
   *
   * See {@link RouterEvents}.
   */
  private static events = new EventEmitter();
  public routes: Array<Readonly<RouterRoute>> = [];
  public pluginId?: symbol;
  public get: RouteRegistrar<'get', Context>;
  public post: RouteRegistrar<'post', Context>;
  public delete: RouteRegistrar<'delete', Context>;
  public put: RouteRegistrar<'put', Context>;
  public patch: RouteRegistrar<'patch', Context>;

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
        handler: RequestHandler<P, Q, B, Context, Method>
      ) => {
        this.registerRoute(
          buildRoute({
            handler: this.enhanceWithContext(handler),
            log: this.log,
            method,
            route,
            router: this,
          })
        );
      };

    this.get = buildMethod('get');
    this.post = buildMethod('post');
    this.delete = buildMethod('delete');
    this.put = buildMethod('put');
    this.patch = buildMethod('patch');
  }

  public static on(event: RouterEvents, cb: (req: CoreKibanaRequest, ...args: any[]) => void) {
    Router.events.on(event, cb);
  }

  public static off(event: RouterEvents, cb: (req: CoreKibanaRequest, ...args: any[]) => void) {
    Router.events.off(event, cb);
  }

  public getRoutes({ excludeVersionedRoutes }: { excludeVersionedRoutes?: boolean } = {}) {
    if (excludeVersionedRoutes) {
      return this.routes.filter((route) => !route.isVersioned);
    }
    return [...this.routes];
  }

  public handleLegacyErrors = wrapErrors;

  /** Should be private, just exposed for convenience for the versioned router */
  public emitPostValidate = (
    request: KibanaRequest,
    postValidateConext: PostValidationMetadata = {
      isInternalApiRequest: true,
      isPublicAccess: false,
    }
  ) => {
    const postValidate: RouterEvents = 'onPostValidate';
    Router.events.emit(postValidate, request, postValidateConext);
  };

  /** @internal */
  public registerRoute(route: InternalRouterRoute) {
    this.routes.push({
      ...route,
      handler: async (request, responseToolkit) =>
        await this.handle({ request, responseToolkit, handler: route.handler }),
    });
  }

  private async handle<P, Q, B>({
    request,
    responseToolkit,
    handler,
  }: {
    request: Request;
    responseToolkit: ResponseToolkit;
    handler: InternalRouteHandler;
  }) {
    const hapiResponseAdapter = new HapiResponseAdapter(responseToolkit);
    try {
      const kibanaResponse = await handler(request);
      if (getProtocolFromRequest(request) === 'http2' && kibanaResponse.options.headers) {
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
        this.log.error('401 Unauthorized', formatErrorMeta(401, { request, error }));
        return hapiResponseAdapter.handle(
          kibanaResponseFactory.unauthorized(convertEsUnauthorized(error))
        );
      }

      // return a generic 500 to avoid error info / stack trace surfacing
      this.log.error('500 Server Error', formatErrorMeta(500, { request, error }));
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

export type RequestHandlerEnhanced<P, Q, B, Method extends RouteMethod> = WithoutHeadArgument<
  RequestHandler<P, Q, B, RequestHandlerContextBase, Method>
>;
