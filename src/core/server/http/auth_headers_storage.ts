/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Request } from '@hapi/hapi';
import { KibanaRequest, ensureRawRequest } from './router';
import { AuthHeaders } from './lifecycle/auth';

/**
 * Get headers to authenticate a user against Elasticsearch.
 * @param request {@link KibanaRequest} - an incoming request.
 * @return authentication headers {@link AuthHeaders} for - an incoming request.
 * @public
 * */
export type GetAuthHeaders = (request: KibanaRequest) => AuthHeaders | undefined;

/** @internal */
export type SetAuthHeaders = (request: KibanaRequest, headers: AuthHeaders) => void;

/** @internal */
export interface IAuthHeadersStorage {
  set: SetAuthHeaders;
  get: GetAuthHeaders;
}

/** @internal */
export class AuthHeadersStorage implements IAuthHeadersStorage {
  private authHeadersCache = new WeakMap<Request, AuthHeaders>();

  public set = (request: KibanaRequest | Request, headers: AuthHeaders) => {
    this.authHeadersCache.set(ensureRawRequest(request), headers);
  };

  public get: GetAuthHeaders = (request) => {
    return this.authHeadersCache.get(ensureRawRequest(request));
  };
}
