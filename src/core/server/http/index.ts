/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

export { config, HttpConfig, HttpConfigType } from './http_config';
export { HttpService } from './http_service';
export { GetAuthHeaders } from './auth_headers_storage';
export { AuthStatus, GetAuthState, IsAuthenticated } from './auth_state_storage';
export {
  CustomHttpResponseOptions,
  IKibanaSocket,
  isKibanaRequest,
  isRealRequest,
  Headers,
  HttpResponseOptions,
  HttpResponsePayload,
  ErrorHttpResponseOptions,
  KibanaRequest,
  KibanaRequestEvents,
  KibanaRequestRoute,
  KibanaRequestRouteOptions,
  IKibanaResponse,
  KnownHeaders,
  LegacyRequest,
  LifecycleResponseFactory,
  RedirectResponseOptions,
  RequestHandler,
  RequestHandlerWrapper,
  ResponseError,
  ResponseErrorAttributes,
  ResponseHeaders,
  kibanaResponseFactory,
  KibanaResponseFactory,
  RouteConfig,
  IRouter,
  RouteMethod,
  RouteRegistrar,
  RouteConfigOptions,
  RouteConfigOptionsBody,
  RouteContentType,
  validBodyOutput,
  RouteValidatorConfig,
  RouteValidationSpec,
  RouteValidationFunction,
  RouteValidatorOptions,
  RouteValidationError,
  RouteValidatorFullConfig,
  RouteValidationResultFactory,
  DestructiveRouteMethod,
  SafeRouteMethod,
} from './router';
export { BasePathProxyServer } from './base_path_proxy_server';
export { OnPreRoutingHandler, OnPreRoutingToolkit } from './lifecycle/on_pre_routing';
export {
  AuthenticationHandler,
  AuthHeaders,
  AuthResultParams,
  AuthRedirected,
  AuthRedirectedParams,
  AuthToolkit,
  AuthResult,
  Authenticated,
  AuthNotHandled,
  AuthResultType,
} from './lifecycle/auth';
export { OnPostAuthHandler, OnPostAuthToolkit } from './lifecycle/on_post_auth';
export { OnPreAuthHandler, OnPreAuthToolkit } from './lifecycle/on_pre_auth';
export {
  OnPreResponseHandler,
  OnPreResponseToolkit,
  OnPreResponseRender,
  OnPreResponseExtensions,
  OnPreResponseInfo,
} from './lifecycle/on_pre_response';
export { SessionStorageFactory, SessionStorage } from './session_storage';
export {
  SessionStorageCookieOptions,
  SessionCookieValidationResult,
} from './cookie_session_storage';
export * from './types';
export { BasePath, IBasePath } from './base_path_service';
