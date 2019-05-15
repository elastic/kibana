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
import { InjectedMetadataSetup } from '../injected_metadata';
import { FatalErrorsSetup } from '../fatal_errors';

export interface HttpHeadersInit {
  [name: string]: any;
}
export interface HttpRequestInit {
  body?: BodyInit | null;
  cache?: RequestCache;
  credentials?: RequestCredentials;
  headers?: HttpHeadersInit;
  integrity?: string;
  keepalive?: boolean;
  method?: string;
  mode?: RequestMode;
  redirect?: RequestRedirect;
  referrer?: string;
  referrerPolicy?: ReferrerPolicy;
  signal?: AbortSignal | null;
  window?: any;
}
export interface HttpDeps {
  injectedMetadata: InjectedMetadataSetup;
  fatalErrors: FatalErrorsSetup | null;
}
export interface HttpFetchQuery {
  [key: string]: string | number | boolean | undefined;
}
export interface HttpFetchOptions extends HttpRequestInit {
  query?: HttpFetchQuery;
  prependBasePath?: boolean;
  headers?: HttpHeadersInit;
}
export type HttpHandler = (path: string, options?: HttpFetchOptions) => Promise<HttpBody>;
export interface IHttpService {
  stop(): void;
  getBasePath(): string;
  addToPath(path: string): string;
  removeFromPath(path: string): string;
  fetch: HttpHandler;
  delete: HttpHandler;
  get: HttpHandler;
  head: HttpHandler;
  options: HttpHandler;
  patch: HttpHandler;
  post: HttpHandler;
  put: HttpHandler;
  addLoadingCount(count$: Observable<number>): void;
  getLoadingCount$(): Observable<number>;
}
export type HttpBody = BodyInit | null;
