/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Request } from '@hapi/hapi';
import type { KibanaRequest, IsAuthenticated } from '@kbn/core-http-server';
import type { AuthStatus } from '@kbn/core-http-server';
/** @internal */
export declare class AuthStateStorage {
  private readonly canBeAuthenticated;
  private readonly storage;
  constructor(canBeAuthenticated: () => boolean);
  set: (request: KibanaRequest | Request, state: unknown) => void;
  get: <T = unknown>(
    request: KibanaRequest | Request
  ) => {
    status: AuthStatus;
    state: T;
  };
  isAuthenticated: IsAuthenticated;
}
