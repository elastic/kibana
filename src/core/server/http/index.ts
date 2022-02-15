/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export { config, HttpConfig } from './http_config';
export type { HttpConfigType } from './http_config';
export { HttpService } from './http_service';
export type { GetAuthHeaders, SetAuthHeaders, IAuthHeadersStorage } from './auth_headers_storage';
export type { AuthStatus, GetAuthState, IsAuthenticated } from './auth_state_storage';
export {
  isKibanaRequest,
  isRealRequest,
  KibanaRequest,
  kibanaResponseFactory,
  validBodyOutput,
} from './router';
export type {
  CustomHttpResponseOptions,
  IKibanaSocket,
  Headers,
  HttpResponseOptions,
  HttpResponsePayload,
  ErrorHttpResponseOptions,
  KibanaRequestEvents,
  KibanaRequestRoute,
  KibanaRequestRouteOptions,
  IKibanaResponse,
  KnownHeaders,
  LifecycleResponseFactory,
  RedirectResponseOptions,
  RequestHandler,
  RequestHandlerWrapper,
  ResponseError,
  ResponseErrorAttributes,
  ResponseHeaders,
  KibanaResponseFactory,
  RouteConfig,
  IRouter,
  RouteMethod,
  RouteRegistrar,
  RouteConfigOptions,
  RouteConfigOptionsBody,
  RouteContentType,
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
export type { OnPreRoutingHandler, OnPreRoutingToolkit } from './lifecycle/on_pre_routing';
export type {
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
export type { OnPostAuthHandler, OnPostAuthToolkit } from './lifecycle/on_post_auth';
export type { OnPreAuthHandler, OnPreAuthToolkit } from './lifecycle/on_pre_auth';
export type {
  OnPreResponseHandler,
  OnPreResponseToolkit,
  OnPreResponseRender,
  OnPreResponseExtensions,
  OnPreResponseInfo,
} from './lifecycle/on_pre_response';
export type { SessionStorageFactory, SessionStorage } from './session_storage';
export type {
  SessionStorageCookieOptions,
  SessionCookieValidationResult,
} from './cookie_session_storage';
export type {
  RequestHandlerContextContainer,
  RequestHandlerContextProvider,
  HttpAuth,
  HttpServicePreboot,
  InternalHttpServicePreboot,
  HttpServiceSetup,
  InternalHttpServiceSetup,
  HttpServiceStart,
  InternalHttpServiceStart,
  HttpServerInfo,
} from './types';
export { BasePath } from './base_path_service';
export type { IBasePath } from './base_path_service';
