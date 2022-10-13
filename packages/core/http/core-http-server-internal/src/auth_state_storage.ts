/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Request } from '@hapi/hapi';
import type { KibanaRequest, IsAuthenticated } from '@kbn/core-http-server';
import { AuthStatus } from '@kbn/core-http-server';
import { ensureRawRequest } from '@kbn/core-http-router-server-internal';

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
