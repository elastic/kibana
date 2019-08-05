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
import { ensureRawRequest, KibanaRequest, LegacyRequest } from './router';

/**
 * Status indicating an outcome of the authentication.
 * @public
 */
export enum AuthStatus {
  /**
   * `auth` interceptor successfully authenticated a user
   */
  authenticated = 'authenticated',
  /**
   * `auth` interceptor failed user authentication
   */
  unauthenticated = 'unauthenticated',
  /**
   * `auth` interceptor has not been registered
   */
  unknown = 'unknown',
}

/**
 * Get authentication state for a request. Returned by `auth` interceptor.
 * @param request {@link KibanaRequest} - an incoming request.
 * @public
 */
export type GetAuthState = (
  request: KibanaRequest | LegacyRequest
) => { status: AuthStatus; state: unknown };

/**
 * Return authentication status for a request.
 * @param request {@link KibanaRequest} - an incoming request.
 * @public
 */
export type IsAuthenticated = (request: KibanaRequest | LegacyRequest) => boolean;

/** @internal */
export class AuthStateStorage {
  private readonly storage = new WeakMap<LegacyRequest, unknown>();
  constructor(private readonly canBeAuthenticated: () => boolean) {}
  public set = (request: KibanaRequest | LegacyRequest, state: unknown) => {
    this.storage.set(ensureRawRequest(request), state);
  };
  public get: GetAuthState = request => {
    const key = ensureRawRequest(request);
    const state = this.storage.get(key);
    const status: AuthStatus = this.storage.has(key)
      ? AuthStatus.authenticated
      : this.canBeAuthenticated()
      ? AuthStatus.unauthenticated
      : AuthStatus.unknown;

    return { status, state };
  };
  public isAuthenticated: IsAuthenticated = request => {
    return this.get(request).status === AuthStatus.authenticated;
  };
}
