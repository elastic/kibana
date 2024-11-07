/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Request } from '@hapi/hapi';
import type {
  KibanaRequest,
  AuthHeaders,
  IAuthHeadersStorage,
  GetAuthHeaders,
} from '@kbn/core-http-server';
import { ensureRawRequest } from '@kbn/core-http-router-server-internal';

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
