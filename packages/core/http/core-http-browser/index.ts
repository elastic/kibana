/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export type {
  HttpSetup,
  HttpStart,
  IBasePath,
  IExternalUrl,
  IAnonymousPaths,
  IStaticAssets,
  HttpHeadersInit,
  HttpRequestInit,
  HttpFetchQuery,
  HttpFetchOptions,
  HttpFetchOptionsWithPath,
  HttpHandler,
  HttpResponse,
  IHttpResponseInterceptorOverrides,
  ResponseErrorBody,
  IHttpFetchError,
  HttpInterceptorResponseError,
  HttpInterceptorRequestError,
  HttpInterceptor,
  IHttpInterceptController,
} from './src/types';

export { isHttpFetchError } from './src/utils';
