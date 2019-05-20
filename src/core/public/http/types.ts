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

import { BasePathSetup } from '../base_path';
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
export interface Deps {
  basePath: BasePathSetup;
  injectedMetadata: InjectedMetadataSetup;
  fatalErrors: FatalErrorsSetup;
}
export interface HttpFetchQuery {
  [key: string]: string | number | boolean | undefined;
}
export interface HttpFetchOptions extends HttpRequestInit {
  query?: HttpFetchQuery;
  prependBasePath?: boolean;
  headers?: HttpHeadersInit;
}
export type HttpBody = BodyInit | null;
