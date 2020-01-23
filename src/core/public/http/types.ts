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

import { Observable } from 'rxjs';

/** @public */
export interface HttpSetup {
  /**
   * APIs for manipulating the basePath on URL segments.
   */
  basePath: IBasePath;

  /**
   * APIs for denoting certain paths for not requiring authentication
   */
  anonymousPaths: IAnonymousPaths;

  /**
   * Adds a new {@link HttpInterceptor} to the global HTTP client.
   * @param interceptor a {@link HttpInterceptor}
   * @returns a function for removing the attached interceptor.
   */
  intercept(interceptor: HttpInterceptor): () => void;

  /** Makes an HTTP request. Defaults to a GET request unless overriden. See {@link HttpHandler} for options. */
  fetch: HttpHandler;
  /** Makes an HTTP request with the DELETE method. See {@link HttpHandler} for options. */
  delete: HttpHandler;
  /** Makes an HTTP request with the GET method. See {@link HttpHandler} for options. */
  get: HttpHandler;
  /** Makes an HTTP request with the HEAD method. See {@link HttpHandler} for options. */
  head: HttpHandler;
  /** Makes an HTTP request with the OPTIONS method. See {@link HttpHandler} for options. */
  options: HttpHandler;
  /** Makes an HTTP request with the PATCH method. See {@link HttpHandler} for options. */
  patch: HttpHandler;
  /** Makes an HTTP request with the POST method. See {@link HttpHandler} for options. */
  post: HttpHandler;
  /** Makes an HTTP request with the PUT method. See {@link HttpHandler} for options. */
  put: HttpHandler;

  /**
   * Adds a new source of loading counts. Used to show the global loading indicator when sum of all observed counts are
   * more than 0.
   * @param countSource$ an Observable to subscribe to for loading count updates.
   */
  addLoadingCountSource(countSource$: Observable<number>): void;

  /**
   * Get the sum of all loading count sources as a single Observable.
   */
  getLoadingCount$(): Observable<number>;
}

/**
 * See {@link HttpSetup}
 * @public
 */
export type HttpStart = HttpSetup;

/**
 * APIs for manipulating the basePath on URL segments.
 * @public
 */
export interface IBasePath {
  /**
   * Gets the `basePath` string.
   */
  get: () => string;

  /**
   * Prepends `path` with the basePath.
   */
  prepend: (url: string) => string;

  /**
   * Removes the prepended basePath from the `path`.
   */
  remove: (url: string) => string;
}

/**
 * APIs for denoting paths as not requiring authentication
 */
export interface IAnonymousPaths {
  /**
   * Determines whether the provided path doesn't require authentication. `path` should include the current basePath.
   */
  isAnonymous(path: string): boolean;

  /**
   * Register `path` as not requiring authentication. `path` should not include the current basePath.
   */
  register(path: string): void;
}

/** @public */
export interface HttpHeadersInit {
  [name: string]: any;
}

/**
 * Fetch API options available to {@link HttpHandler}s.
 *
 * @internalRemarks these docs are largely copied from TypeScript's included dom types.
 * @public
 */
export interface HttpRequestInit {
  /**
   * A BodyInit object or null to set request's body.
   */
  body?: BodyInit | null;

  /**
   * The cache mode associated with request, which is a string indicating how the request will interact with the
   * browser's cache when fetching.
   */
  cache?: RequestCache;

  /**
   * The credentials mode associated with request, which is a string indicating whether credentials will be sent with
   * the request always, never, or only when sent to a same-origin URL.
   */
  credentials?: RequestCredentials;

  /** {@link HttpHeadersInit} */
  headers?: HttpHeadersInit;

  /**
   * Subresource integrity metadata, which is a cryptographic hash of the resource being fetched. Its value consists of
   * multiple hashes separated by whitespace.
   */
  integrity?: string;

  /** Whether or not request can outlive the global in which it was created. */
  keepalive?: boolean;

  /** HTTP method, which is "GET" by default. */
  method?: string;

  /**
   * The mode associated with request, which is a string indicating whether the request will use CORS, or will be
   * restricted to same-origin URLs.
   */
  mode?: RequestMode;

  /**
   * The redirect mode associated with request, which is a string indicating how redirects for the request will be
   * handled during fetching. A request will follow redirects by default.
   */
  redirect?: RequestRedirect;

  /**
   * The referrer of request. Its value can be a same-origin URL if explicitly set in init, the empty string to
   * indicate no referrer, and "about:client" when defaulting to the global's default. This is used during fetching to
   * determine the value of the `Referer` header of the request being made.
   */
  referrer?: string;

  /**
   * The referrer policy associated with request. This is used during fetching to compute the value of the request's
   * referrer.
   */
  referrerPolicy?: ReferrerPolicy;

  /**
   * Returns the signal associated with request, which is an AbortSignal object indicating whether or not request has
   * been aborted, and its abort event handler.
   */
  signal?: AbortSignal | null;

  /**
   * Can only be null. Used to disassociate request from any Window.
   */
  window?: null;
}

/** @public */
export interface HttpFetchQuery {
  [key: string]: string | number | boolean | undefined;
}

/**
 * All options that may be used with a {@link HttpHandler}.
 * @public
 */
export interface HttpFetchOptions extends HttpRequestInit {
  /**
   * The query string for an HTTP request. See {@link HttpFetchQuery}.
   */
  query?: HttpFetchQuery;

  /**
   * Whether or not the request should automatically prepend the basePath. Defaults to `true`.
   */
  prependBasePath?: boolean;

  /**
   * Headers to send with the request. See {@link HttpHeadersInit}.
   */
  headers?: HttpHeadersInit;

  /**
   * When `true` the return type of {@link HttpHandler} will be an {@link IHttpResponse} with detailed request and
   * response information. When `false`, the return type will just be the parsed response body. Defaults to `false`.
   */
  asResponse?: boolean;
}

/**
 * A function for making an HTTP requests to Kibana's backend. See {@link HttpFetchOptions} for options and
 * {@link IHttpResponse} for the response.
 *
 * @param path the path on the Kibana server to send the request to. Should not include the basePath.
 * @param options {@link HttpFetchOptions}
 * @returns a Promise that resolves to a {@link IHttpResponse}
 * @public
 */
export interface HttpHandler {
  <TResponseBody = any>(path: string, options: HttpFetchOptions & { asResponse: true }): Promise<
    IHttpResponse<TResponseBody>
  >;
  <TResponseBody = any>(path: string, options?: HttpFetchOptions): Promise<TResponseBody>;
}

/** @public */
export interface IHttpResponse<TResponseBody = any> {
  /** Raw request sent to Kibana server. */
  readonly request: Readonly<Request>;
  /** Raw response received, may be undefined if there was an error. */
  readonly response?: Readonly<Response>;
  /** Parsed body received, may be undefined if there was an error. */
  readonly body?: TResponseBody;
}

/**
 * Properties that can be returned by HttpInterceptor.request to override the response.
 * @public
 */
export interface IHttpResponseInterceptorOverrides<TResponseBody = any> {
  /** Raw response received, may be undefined if there was an error. */
  readonly response?: Readonly<Response>;
  /** Parsed body received, may be undefined if there was an error. */
  readonly body?: TResponseBody;
}

/** @public */
export interface IHttpFetchError extends Error {
  readonly request: Request;
  readonly response?: Response;
  /**
   * @deprecated Provided for legacy compatibility. Prefer the `request` property instead.
   */
  readonly req: Request;
  /**
   * @deprecated Provided for legacy compatibility. Prefer the `response` property instead.
   */
  readonly res?: Response;
  readonly body?: any;
}

/** @public */
export interface HttpErrorResponse extends IHttpResponse {
  error: Error | IHttpFetchError;
}
/** @public */
export interface HttpErrorRequest {
  request: Request;
  error: Error;
}

/**
 * An object that may define global interceptor functions for different parts of the request and response lifecycle.
 * See {@link IHttpInterceptController}.
 *
 * @public
 */
export interface HttpInterceptor {
  /**
   * Define an interceptor to be executed before a request is sent.
   * @param request
   * @param controller {@link IHttpInterceptController}
   */
  request?(
    request: Request,
    controller: IHttpInterceptController
  ): Promise<Request> | Request | void;

  /**
   * Define an interceptor to be executed if a request interceptor throws an error or returns a rejected Promise.
   * @param httpErrorRequest {@link HttpErrorRequest}
   * @param controller {@link IHttpInterceptController}
   */
  requestError?(
    httpErrorRequest: HttpErrorRequest,
    controller: IHttpInterceptController
  ): Promise<Request> | Request | void;

  /**
   * Define an interceptor to be executed after a response is received.
   * @param httpResponse {@link IHttpResponse}
   * @param controller {@link IHttpInterceptController}
   */
  response?(
    httpResponse: IHttpResponse,
    controller: IHttpInterceptController
  ): Promise<IHttpResponseInterceptorOverrides> | IHttpResponseInterceptorOverrides | void;

  /**
   * Define an interceptor to be executed if a response interceptor throws an error or returns a rejected Promise.
   * @param httpErrorResponse {@link HttpErrorResponse}
   * @param controller {@link IHttpInterceptController}
   */
  responseError?(
    httpErrorResponse: HttpErrorResponse,
    controller: IHttpInterceptController
  ): Promise<IHttpResponseInterceptorOverrides> | IHttpResponseInterceptorOverrides | void;
}

/**
 * Used to halt a request Promise chain in a {@link HttpInterceptor}.
 * @public
 */
export interface IHttpInterceptController {
  /** Whether or not this chain has been halted. */
  halted: boolean;
  /** Halt the request Promise chain and do not process further interceptors or response handlers. */
  halt(): void;
}
