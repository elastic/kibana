/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export { filterHeaders } from './headers';
export type { Headers, ResponseHeaders, KnownHeaders } from './headers';
export { Router } from './router';
export type {
  RequestHandler,
  RequestHandlerWrapper,
  IRouter,
  RouteRegistrar,
  RouterRoute,
} from './router';
export { isKibanaRequest, isRealRequest, ensureRawRequest, KibanaRequest } from './request';
export type {
  KibanaRequestEvents,
  KibanaRequestRoute,
  KibanaRequestRouteOptions,
  KibanaRouteOptions,
  KibanaRequestState,
} from './request';
export { isSafeMethod, validBodyOutput } from './route';
export type {
  DestructiveRouteMethod,
  RouteMethod,
  RouteConfig,
  RouteConfigOptions,
  RouteContentType,
  RouteConfigOptionsBody,
  SafeRouteMethod,
} from './route';
export { HapiResponseAdapter } from './response_adapter';
export {
  kibanaResponseFactory,
  lifecycleResponseFactory,
  isKibanaResponse,
  KibanaResponse,
} from './response';
export type {
  CustomHttpResponseOptions,
  HttpResponseOptions,
  HttpResponsePayload,
  ErrorHttpResponseOptions,
  RedirectResponseOptions,
  ResponseError,
  ResponseErrorAttributes,
  IKibanaResponse,
  KibanaResponseFactory,
  LifecycleResponseFactory,
} from './response';

export type { IKibanaSocket } from './socket';

export type {
  RouteValidatorConfig,
  RouteValidationSpec,
  RouteValidationFunction,
  RouteValidatorOptions,
  RouteValidationError,
  RouteValidatorFullConfig,
  RouteValidationResultFactory,
} from './validator';
