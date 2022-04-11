/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { IContextProvider, IContextContainer } from '../context';
import { ICspConfig } from '../csp';
import { GetAuthState, IsAuthenticated } from './auth_state_storage';
import { IAuthHeadersStorage } from './auth_headers_storage';
import { IRouter } from './router';
import { HttpServerSetup } from './http_server';
import { SessionStorageCookieOptions } from './cookie_session_storage';
import { SessionStorageFactory } from './session_storage';
import { AuthenticationHandler } from './lifecycle/auth';
import { OnPreRoutingHandler } from './lifecycle/on_pre_routing';
import { OnPreAuthHandler } from './lifecycle/on_pre_auth';
import { OnPostAuthHandler } from './lifecycle/on_post_auth';
import { OnPreResponseHandler } from './lifecycle/on_pre_response';
import { IBasePath } from './base_path_service';
import { ExternalUrlConfig } from '../external_url';
import type { PluginOpaqueId, RequestHandlerContext } from '..';

/**
 * An object that handles registration of http request context providers.
 * @public
 */
export type RequestHandlerContextContainer = IContextContainer;

/**
 * Context provider for request handler.
 * Extends request context object with provided functionality or data.
 *
 * @public
 */
export type RequestHandlerContextProvider<
  Context extends RequestHandlerContext,
  ContextName extends keyof Context
> = IContextProvider<Context, ContextName>;

/**
 * @public
 */
export interface HttpAuth {
  /**
   * Gets authentication state for a request. Returned by `auth` interceptor.
   * {@link GetAuthState}
   */
  get: GetAuthState;
  /**
   * Returns authentication status for a request.
   * {@link IsAuthenticated}
   */
  isAuthenticated: IsAuthenticated;
}

/**
 * Kibana HTTP Service provides an abstraction to work with the HTTP stack at the `preboot` stage. This functionality
 * allows Kibana to serve user requests even before Kibana becomes fully operational. Only Core and `preboot` plugins
 * can define HTTP routes at this stage.
 *
 * @example
 * To handle an incoming request in your preboot plugin you should:
 * - Use `@kbn/config-schema` package to create a schema to validate the request `params`, `query`, and `body`. Every incoming request will be validated against the created schema. If validation failed, the request is rejected with `400` status and `Bad request` error without calling the route's handler.
 * To opt out of validating the request, specify `false`.
 * ```ts
 * import { schema, TypeOf } from '@kbn/config-schema';
 * const validate = {
 *   params: schema.object({
 *     id: schema.string(),
 *   }),
 * };
 * ```
 *
 * - Declare a function to respond to incoming request.
 * The function will receive `request` object containing request details: url, headers, matched route, as well as validated `params`, `query`, `body`.
 * And `response` object instructing HTTP server to create HTTP response with information sent back to the client as the response body, headers, and HTTP status.
 * Any exception raised during the handler call will generate `500 Server error` response and log error details for further investigation. See below for returning custom error responses.
 * ```ts
 * const handler = async (context: RequestHandlerContext, request: KibanaRequest, response: ResponseFactory) => {
 *   const data = await findObject(request.params.id);
 *   // creates a command to respond with 'not found' error
 *   if (!data) {
 *     return response.notFound();
 *   }
 *   // creates a command to send found data to the client and set response headers
 *   return response.ok({
 *     body: data,
 *     headers: { 'content-type': 'application/json' }
 *   });
 * }
 * ```
 * * - Acquire `preboot` {@link IRouter} instance and register route handler for GET request to 'path/{id}' path.
 * ```ts
 * import { schema, TypeOf } from '@kbn/config-schema';
 *
 * const validate = {
 *   params: schema.object({
 *     id: schema.string(),
 *   }),
 * };
 *
 * httpPreboot.registerRoutes('my-plugin', (router) => {
 *   router.get({ path: 'path/{id}', validate }, async (context, request, response) => {
 *     const data = await findObject(request.params.id);
 *     if (!data) {
 *       return response.notFound();
 *     }
 *     return response.ok({
 *       body: data,
 *       headers: { 'content-type': 'application/json' }
 *     });
 *   });
 * });
 * ```
 * @public
 */
export interface HttpServicePreboot {
  /**
   * Provides ability to acquire `preboot` {@link IRouter} instance for a particular top-level path and register handler
   * functions for any number of nested routes.
   *
   * @remarks
   * Each route can have only one handler function, which is executed when the route is matched.
   * See the {@link IRouter} documentation for more information.
   *
   * @example
   * ```ts
   * registerRoutes('my-plugin', (router) => {
   *   // handler is called when '/my-plugin/path' resource is requested with `GET` method
   *   router.get({ path: '/path', validate: false }, (context, req, res) => res.ok({ content: 'ok' }));
   * });
   * ```
   * @public
   */
  registerRoutes(path: string, callback: (router: IRouter) => void): void;

  /**
   * Access or manipulate the Kibana base path
   * See {@link IBasePath}.
   */
  basePath: IBasePath;

  /**
   * Provides common {@link HttpServerInfo | information} about the running preboot http server.
   */
  getServerInfo: () => HttpServerInfo;
}

/** @internal */
export interface InternalHttpServicePreboot
  extends Pick<
    InternalHttpServiceSetup,
    | 'auth'
    | 'csp'
    | 'basePath'
    | 'externalUrl'
    | 'registerStaticDir'
    | 'registerRouteHandlerContext'
    | 'server'
    | 'getServerInfo'
  > {
  registerRoutes(path: string, callback: (router: IRouter) => void): void;
}

/**
 * Kibana HTTP Service provides own abstraction for work with HTTP stack.
 * Plugins don't have direct access to `hapi` server and its primitives anymore. Moreover,
 * plugins shouldn't rely on the fact that HTTP Service uses one or another library under the hood.
 * This gives the platform flexibility to upgrade or changing our internal HTTP stack without breaking plugins.
 * If the HTTP Service lacks functionality you need, we are happy to discuss and support your needs.
 *
 * @example
 * To handle an incoming request in your plugin you should:
 * - Create a `Router` instance.
 * ```ts
 * const router = httpSetup.createRouter();
 * ```
 *
 * - Use `@kbn/config-schema` package to create a schema to validate the request `params`, `query`, and `body`. Every incoming request will be validated against the created schema. If validation failed, the request is rejected with `400` status and `Bad request` error without calling the route's handler.
 * To opt out of validating the request, specify `false`.
 * ```ts
 * import { schema, TypeOf } from '@kbn/config-schema';
 * const validate = {
 *   params: schema.object({
 *     id: schema.string(),
 *   }),
 * };
 * ```
 *
 * - Declare a function to respond to incoming request.
 * The function will receive `request` object containing request details: url, headers, matched route, as well as validated `params`, `query`, `body`.
 * And `response` object instructing HTTP server to create HTTP response with information sent back to the client as the response body, headers, and HTTP status.
 * Unlike, `hapi` route handler in the Legacy platform, any exception raised during the handler call will generate `500 Server error` response and log error details for further investigation. See below for returning custom error responses.
 * ```ts
 * const handler = async (context: RequestHandlerContext, request: KibanaRequest, response: ResponseFactory) => {
 *   const data = await findObject(request.params.id);
 *   // creates a command to respond with 'not found' error
 *   if (!data) return response.notFound();
 *   // creates a command to send found data to the client and set response headers
 *   return response.ok({
 *     body: data,
 *     headers: {
 *       'content-type': 'application/json'
 *     }
 *   });
 * }
 * ```
 *
 * - Register route handler for GET request to 'path/{id}' path
 * ```ts
 * import { schema, TypeOf } from '@kbn/config-schema';
 * const router = httpSetup.createRouter();
 *
 * const validate = {
 *   params: schema.object({
 *     id: schema.string(),
 *   }),
 * };
 *
 * router.get({
 *   path: 'path/{id}',
 *   validate
 * },
 * async (context, request, response) => {
 *   const data = await findObject(request.params.id);
 *   if (!data) return response.notFound();
 *   return response.ok({
 *     body: data,
 *     headers: {
 *       'content-type': 'application/json'
 *     }
 *   });
 * });
 * ```
 * @public
 */
export interface HttpServiceSetup {
  /**
   * Creates cookie based session storage factory {@link SessionStorageFactory}
   * @param cookieOptions {@link SessionStorageCookieOptions} - options to configure created cookie session storage.
   */
  createCookieSessionStorageFactory: <T>(
    cookieOptions: SessionStorageCookieOptions<T>
  ) => Promise<SessionStorageFactory<T>>;

  /**
   * To define custom logic to perform for incoming requests before server performs a route lookup.
   *
   * @remarks
   * It's the only place when you can forward a request to another URL right on the server.
   * Can register any number of registerOnPreRouting, which are called in sequence
   * (from the first registered to the last). See {@link OnPreRoutingHandler}.
   *
   * @param handler {@link OnPreRoutingHandler} - function to call.
   */
  registerOnPreRouting: (handler: OnPreRoutingHandler) => void;

  /**
   * To define custom logic to perform for incoming requests before
   * the Auth interceptor performs a check that user has access to requested resources.
   *
   * @remarks
   * Can register any number of registerOnPreAuth, which are called in sequence
   * (from the first registered to the last). See {@link OnPreAuthHandler}.
   *
   * @param handler {@link OnPreRoutingHandler} - function to call.
   */
  registerOnPreAuth: (handler: OnPreAuthHandler) => void;

  /**
   * To define custom authentication and/or authorization mechanism for incoming requests.
   *
   * @remarks
   * A handler should return a state to associate with the incoming request.
   * The state can be retrieved later via http.auth.get(..)
   * Only one AuthenticationHandler can be registered. See {@link AuthenticationHandler}.
   *
   * @param handler {@link AuthenticationHandler} - function to perform authentication.
   */
  registerAuth: (handler: AuthenticationHandler) => void;

  /**
   * To define custom logic after Auth interceptor did make sure a user has access to the requested resource.
   *
   * @remarks
   * The auth state is available at stage via http.auth.get(..)
   * Can register any number of registerOnPostAuth, which are called in sequence
   * (from the first registered to the last). See {@link OnPostAuthHandler}.
   *
   * @param handler {@link OnPostAuthHandler} - function to call.
   */
  registerOnPostAuth: (handler: OnPostAuthHandler) => void;

  /**
   * To define custom logic to perform for the server response.
   *
   * @remarks
   * Doesn't provide the whole response object.
   * Supports extending response with custom headers.
   * See {@link OnPreResponseHandler}.
   *
   * @param handler {@link OnPreResponseHandler} - function to call.
   */
  registerOnPreResponse: (handler: OnPreResponseHandler) => void;

  /**
   * Access or manipulate the Kibana base path
   * See {@link IBasePath}.
   */
  basePath: IBasePath;

  /**
   * The CSP config used for Kibana.
   */
  csp: ICspConfig;

  /**
   * Provides ability to declare a handler function for a particular path and HTTP request method.
   *
   * @remarks
   * Each route can have only one handler function, which is executed when the route is matched.
   * See the {@link IRouter} documentation for more information.
   *
   * @example
   * ```ts
   * const router = createRouter();
   * // handler is called when '/path' resource is requested with `GET` method
   * router.get({ path: '/path', validate: false }, (context, req, res) => res.ok({ content: 'ok' }));
   * ```
   * @public
   */
  createRouter: <
    Context extends RequestHandlerContext = RequestHandlerContext
  >() => IRouter<Context>;

  /**
   * Register a context provider for a route handler.
   * @example
   * ```ts
   *  // my-plugin.ts
   *  interface MyRequestHandlerContext extends RequestHandlerContext {
   *    myApp: { search(id: string): Promise<Result> };
   *  }
   *  deps.http.registerRouteHandlerContext<MyRequestHandlerContext, 'myApp'>(
   *    'myApp',
   *    (context, req) => {
   *     async function search (id: string) {
   *       return await context.elasticsearch.client.asCurrentUser.find(id);
   *     }
   *     return { search };
   *    }
   *  );
   *
   * // my-route-handler.ts
   *  import type { MyRequestHandlerContext } from './my-plugin.ts';
   *  const router = createRouter<MyRequestHandlerContext>();
   *  router.get({ path: '/', validate: false }, async (context, req, res) => {
   *    const response = await context.myApp.search(...);
   *    return res.ok(response);
   *  });
   * ```
   * @public
   */
  registerRouteHandlerContext: <
    Context extends RequestHandlerContext,
    ContextName extends keyof Context
  >(
    contextName: ContextName,
    provider: RequestHandlerContextProvider<Context, ContextName>
  ) => RequestHandlerContextContainer;

  /**
   * Provides common {@link HttpServerInfo | information} about the running http server.
   */
  getServerInfo: () => HttpServerInfo;
}

/** @internal */
export interface RegisterStaticDirOptions {
  etagMethod?: 'hash' | 'simple' | false;
  cache?: RegisterStaticDirCacheOptions;
}

/** @internal */
export interface RegisterStaticDirCacheOptions {
  privacy?: 'default' | 'public' | 'private';
  /**  relative expiration expressed in the number of milliseconds since the item was saved in the cache */
  expiresIn?: number;
  /**  a string with the value of the 'Cache-Control' header when caching is disabled */
  otherwise?: string | undefined;
}

/** @internal */
export interface InternalHttpServiceSetup
  extends Omit<HttpServiceSetup, 'createRouter' | 'registerRouteHandlerContext'> {
  auth: HttpServerSetup['auth'];
  server: HttpServerSetup['server'];
  externalUrl: ExternalUrlConfig;
  createRouter: <Context extends RequestHandlerContext = RequestHandlerContext>(
    path: string,
    plugin?: PluginOpaqueId
  ) => IRouter<Context>;
  registerRouterAfterListening: (router: IRouter) => void;
  registerStaticDir: (path: string, dirPath: string, options?: RegisterStaticDirOptions) => void;
  authRequestHeaders: IAuthHeadersStorage;
  registerRouteHandlerContext: <
    Context extends RequestHandlerContext,
    ContextName extends keyof Context
  >(
    pluginOpaqueId: PluginOpaqueId,
    contextName: ContextName,
    provider: RequestHandlerContextProvider<Context, ContextName>
  ) => RequestHandlerContextContainer;

  registerPrebootRoutes(path: string, callback: (router: IRouter) => void): void;
}

/** @public */
export interface HttpServiceStart {
  /**
   * Access or manipulate the Kibana base path
   * See {@link IBasePath}.
   */
  basePath: IBasePath;

  /**
   * Auth status.
   * See {@link HttpAuth}
   */
  auth: HttpAuth;

  /**
   * Provides common {@link HttpServerInfo | information} about the running http server.
   */
  getServerInfo: () => HttpServerInfo;
}

/** @internal */
export interface InternalHttpServiceStart extends HttpServiceStart {
  /** Indicates if the http server is listening on the configured port */
  isListening: () => boolean;
}

/**
 * Information about what hostname, port, and protocol the server process is
 * running on. Note that this may not match the URL that end-users access
 * Kibana at. For the public URL, see {@link BasePath.publicBaseUrl}.
 * @public
 */
export interface HttpServerInfo {
  /** The name of the Kibana server */
  name: string;
  /** The hostname of the server */
  hostname: string;
  /** The port the server is listening on */
  port: number;
  /** The protocol used by the server */
  protocol: 'http' | 'https' | 'socket';
}
