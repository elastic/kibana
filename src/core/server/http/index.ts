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

export { config, HttpConfig, HttpConfigType } from './http_config';
export { HttpService } from './http_service';
export { GetAuthHeaders } from './auth_headers_storage';
export { AuthStatus, GetAuthState, IsAuthenticated } from './auth_state_storage';
export {
  CustomHttpResponseOptions,
  IKibanaSocket,
  isRealRequest,
  HttpResponseOptions,
  HttpResponsePayload,
  ErrorHttpResponseOptions,
  KibanaRequest,
  KibanaRequestRoute,
  KibanaRequestRouteOptions,
  IKibanaResponse,
  KnownHeaders,
  LegacyRequest,
  LifecycleResponseFactory,
  RedirectResponseOptions,
  RequestHandler,
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
  RouteValidateFunction,
  RouteValidatorOptions,
  RouteValidationError,
  RouteValidatorFullConfig,
} from './router';
export { BasePathProxyServer } from './base_path_proxy_server';
export { OnPreAuthHandler, OnPreAuthToolkit } from './lifecycle/on_pre_auth';
export {
  AuthenticationHandler,
  AuthHeaders,
  AuthResultParams,
  AuthToolkit,
  AuthResult,
  Authenticated,
  AuthResultType,
} from './lifecycle/auth';
export { OnPostAuthHandler, OnPostAuthToolkit } from './lifecycle/on_post_auth';
export {
  OnPreResponseHandler,
  OnPreResponseToolkit,
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
