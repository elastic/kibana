/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { KibanaRequest } from './router';
import type { AuthHeaders } from './lifecycle';

/**
 * Get headers to authenticate a user against Elasticsearch.
 * @param request {@link KibanaRequest} - an incoming request.
 * @return authentication headers {@link AuthHeaders} for - an incoming request.
 * @public
 * */
export type GetAuthHeaders = (request: KibanaRequest) => AuthHeaders | undefined;

/** @public */
export type SetAuthHeaders = (request: KibanaRequest, headers: AuthHeaders) => void;

/** @public */
export interface IAuthHeadersStorage {
  set: SetAuthHeaders;
  get: GetAuthHeaders;
}
