/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IRouter, KibanaRequest } from '@kbn/core-http-server';
import type { RequestHandlerContext } from '@kbn/core-http-request-handler-context-server';
import type { IUserStorageClient } from '@kbn/core-user-storage-common';
export interface RegisterRoutesParams {
  router: IRouter<RequestHandlerContext>;
  /**
   * Returns a scoped client for the given request, or `null` when the request
   * has no user profile (e.g. API-key auth). Supplied by the service at start
   * time so that namespace resolution is handled in one place.
   */
  getClient: (request: KibanaRequest) => IUserStorageClient | null;
}
export declare const registerRoutes: ({ router, getClient }: RegisterRoutesParams) => void;
