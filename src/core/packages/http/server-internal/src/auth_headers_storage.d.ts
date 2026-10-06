/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Request } from '@hapi/hapi';
import type {
  KibanaRequest,
  AuthHeaders,
  IAuthHeadersStorage,
  GetAuthHeaders,
} from '@kbn/core-http-server';
/** @internal */
export declare class AuthHeadersStorage implements IAuthHeadersStorage {
  private authHeadersCache;
  set: (request: KibanaRequest | Request, headers: AuthHeaders) => void;
  get: GetAuthHeaders;
}
