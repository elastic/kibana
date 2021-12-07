/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { Request } from '@hapi/hapi';
import { ensureRawRequest, KibanaRequest } from './router';

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
 * Gets authentication state for a request. Returned by `auth` interceptor.
 * @param request {@link KibanaRequest} - an incoming request.
 * @public
 */
export type GetAuthState = <T = unknown>(
  request: KibanaRequest
) => { status: AuthStatus; state: T };

/**
 * Returns authentication status for a request.
 * @param request {@link KibanaRequest} - an incoming request.
 * @public
 */
export type IsAuthenticated = (request: KibanaRequest) => boolean;

/** @internal */
export class AuthStateStorage {
  private readonly storage = new WeakMap<Request, unknown>();
  constructor(private readonly canBeAuthenticated: () => boolean) {}
  public set = (request: KibanaRequest | Request, state: unknown) => {
    this.storage.set(ensureRawRequest(request), state);
  };
  public get = <T = unknown>(request: KibanaRequest | Request) => {
    const key = ensureRawRequest(request);
    const state = this.storage.get(key) as T;
    const status: AuthStatus = this.storage.has(key)
      ? AuthStatus.authenticated
      : this.canBeAuthenticated()
      ? AuthStatus.unauthenticated
      : AuthStatus.unknown;

    return { status, state };
  };
  public isAuthenticated: IsAuthenticated = (request) => {
    return this.get(request).status === AuthStatus.authenticated;
  };
}
