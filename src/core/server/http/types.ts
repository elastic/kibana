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
import { IContextProvider, IContextContainer } from '../context';
import { ICspConfig } from '../csp';
import { GetAuthState, IsAuthenticated } from './auth_state_storage';
import { GetAuthHeaders } from './auth_headers_storage';
import { RequestHandler, IRouter } from './router';
import { HttpServerSetup } from './http_server';
import { SessionStorageCookieOptions } from './cookie_session_storage';
import { SessionStorageFactory } from './session_storage';
import { AuthenticationHandler } from './lifecycle/auth';
import { OnPreRoutingHandler } from './lifecycle/on_pre_routing';
import { OnPreAuthHandler } from './lifecycle/on_pre_auth';
import { OnPostAuthHandler } from './lifecycle/on_post_auth';
import { OnPreResponseHandler } from './lifecycle/on_pre_response';
import { IBasePath } from './base_path_service';
import { PluginOpaqueId, RequestHandlerContext } from '..';

/**
 * An object that handles registration of http request context providers.
 * @public
 */
export type RequestHandlerContextContainer = IContextContainer<RequestHandler<any, any, any>>;

/**
 * Context provider for request handler.
 * Extends request context object with provided functionality or data.
 *
 * @public
 */
export type RequestHandlerContextProvider<
  TContextName extends keyof RequestHandlerContext
> = IContextProvider<RequestHandler<any, any, any>, TContextName>;

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
   * Auth status.
   * See {@link HttpAuth}
   *
   * @deprecated use {@link HttpServiceStart.auth | the start contract} instead.
   */
  auth: HttpAuth;

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
  createRouter: () => IRouter;

  /**
   * Register a context provider for a route handler.
   * @example
   * ```ts
   *  // my-plugin.ts
   *  deps.http.registerRouteHandlerContext(
   *    'myApp',
   *    (context, req) => {
   *     async function search (id: string) {
   *       return await context.elasticsearch.legacy.client.callAsInternalUser('endpoint', id);
   *     }
   *     return { search };
   *    }
   *  );
   *
   * // my-route-handler.ts
   *  router.get({ path: '/', validate: false }, async (context, req, res) => {
   *    const response = await context.myApp.search(...);
   *    return res.ok(response);
   *  });
   * ```
   * @public
   */
  registerRouteHandlerContext: <T extends keyof RequestHandlerContext>(
    contextName: T,
    provider: RequestHandlerContextProvider<T>
  ) => RequestHandlerContextContainer;

  /**
   * Provides common {@link HttpServerInfo | information} about the running http server.
   */
  getServerInfo: () => HttpServerInfo;
}

/** @internal */
export interface InternalHttpServiceSetup
  extends Omit<HttpServiceSetup, 'createRouter' | 'registerRouteHandlerContext'> {
  auth: HttpServerSetup['auth'];
  server: HttpServerSetup['server'];
  createRouter: (path: string, plugin?: PluginOpaqueId) => IRouter;
  registerStaticDir: (path: string, dirPath: string) => void;
  getAuthHeaders: GetAuthHeaders;
  registerRouteHandlerContext: <T extends keyof RequestHandlerContext>(
    pluginOpaqueId: PluginOpaqueId,
    contextName: T,
    provider: RequestHandlerContextProvider<T>
  ) => RequestHandlerContextContainer;
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

/** @public */
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
