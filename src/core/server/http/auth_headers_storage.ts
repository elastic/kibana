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
import { KibanaRequest, ensureRawRequest, LegacyRequest } from './router';
import { AuthHeaders } from './lifecycle/auth';

/**
 * Get headers to authenticate a user against Elasticsearch.
 * @param request {@link KibanaRequest} - an incoming request.
 * @return authentication headers {@link AuthHeaders} for - an incoming request.
 * @public
 * */
export type GetAuthHeaders = (request: KibanaRequest | LegacyRequest) => AuthHeaders | undefined;

/** @internal */
export class AuthHeadersStorage {
  private authHeadersCache = new WeakMap<LegacyRequest, AuthHeaders>();
  public set = (request: KibanaRequest | LegacyRequest, headers: AuthHeaders) => {
    this.authHeadersCache.set(ensureRawRequest(request), headers);
  };
  public get: GetAuthHeaders = request => {
    return this.authHeadersCache.get(ensureRawRequest(request));
  };
}
