/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export {
  OnPreRoutingResultType,
  AuthResultType,
  OnPostAuthResultType,
  OnPreResponseResultType,
  OnPreAuthResultType,
} from './src/lifecycle';
export type {
  OnPreAuthToolkit,
  AuthenticationHandler,
  AuthHeaders,
  AuthRedirectedParams,
  AuthResult,
  AuthResultAuthenticated,
  AuthResultNotHandled,
  AuthResultParams,
  AuthResultRedirected,
  AuthToolkit,
  OnPostAuthHandler,
  OnPostAuthNextResult,
  OnPostAuthToolkit,
  OnPostAuthResult,
  OnPreAuthHandler,
  OnPreAuthNextResult,
  OnPreAuthResult,
  OnPreResponseExtensions,
  OnPreResponseHandler,
  OnPreResponseInfo,
  OnPreResponseRender,
  OnPreResponseResult,
  OnPreResponseResultNext,
  OnPreResponseResultRender,
  OnPreResponseToolkit,
  OnPreRoutingHandler,
  OnPreRoutingResult,
  OnPreRoutingResultNext,
  OnPreRoutingResultRewriteUrl,
  OnPreRoutingToolkit,
} from './src/lifecycle';

export type {
  IContextProvider,
  IContextContainer,
  HandlerContextType,
  HandlerFunction,
  HandlerParameters,
  Headers,
  KnownHeaders,
  KnownKeys,
  ResponseHeaders,
  StringKeysAsVals,
  KibanaRequest,
  KibanaRequestAuth,
  KibanaRequestEvents,
  KibanaRequestRoute,
  KibanaRequestRouteOptions,
  KibanaRequestState,
  KibanaRouteOptions,
  RequestHandlerWrapper,
  RequestHandler,
  RequestHandlerContextBase,
  ResponseError,
  CustomHttpResponseOptions,
  FileHttpResponseOptions,
  HttpResponseOptions,
  HttpResponsePayload,
  IKibanaResponse,
  RedirectResponseOptions,
  ResponseErrorAttributes,
  ErrorHttpResponseOptions,
  RouteConfigOptions,
  RouteMethod,
  DestructiveRouteMethod,
  RouteConfig,
  RouteConfigOptionsBody,
  RouteContentType,
  SafeRouteMethod,
  RouteValidationFunction,
  RouteValidationResultFactory,
  RouteValidationSpec,
  RouteValidatorConfig,
  RouteValidatorOptions,
  IRouter,
  RouteRegistrar,
  RouterRoute,
  IKibanaSocket,
  KibanaErrorResponseFactory,
  KibanaRedirectionResponseFactory,
  KibanaNotModifiedResponseFactory,
  KibanaSuccessResponseFactory,
  KibanaResponseFactory,
  LifecycleResponseFactory,
  RawRequest,
  FakeRawRequest,
  RouteValidator,
  RouteValidatorRequestAndResponses,
  RouteValidatorFullConfigRequest,
  RouteValidatorFullConfigResponse,
  LazyValidator,
  RouteAccess,
} from './src/router';
export {
  validBodyOutput,
  RouteValidationError,
  getRequestValidation,
  getResponseValidation,
  isFullValidatorContainer,
  isKibanaResponse,
} from './src/router';

export type { ICspConfig } from './src/csp';

export type { IExternalUrlConfig } from './src/external_url';

export type { IHttpEluMonitorConfig } from './src/elu_monitor';

export type { IBasePath } from './src/base_path';

export type {
  SessionStorage,
  SessionStorageFactory,
  SessionCookieValidationResult,
  SessionStorageCookieOptions,
} from './src/session_storage';

export type { GetAuthState, IsAuthenticated } from './src/auth_state';
export { AuthStatus } from './src/auth_state';

export type { IAuthHeadersStorage, SetAuthHeaders, GetAuthHeaders } from './src/auth_headers';

export type {
  HttpAuth,
  HttpServerInfo,
  HttpServicePreboot,
  HttpServiceSetup,
  HttpServiceStart,
  HttpProtocol,
} from './src/http_contract';

export type {
  AddVersionOpts,
  VersionedRouteRequestValidation,
  VersionedRouteResponseValidation,
  ApiVersion,
  VersionedRouteValidation,
  VersionedRoute,
  VersionedRouteConfig,
  VersionedRouteRegistrar,
  VersionedRouter,
  VersionedRouteCustomResponseBodyValidation,
  VersionedResponseBodyValidation,
} from './src/versioning';

export type { IStaticAssets } from './src/static_assets';
