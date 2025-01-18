/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IKibanaResponse, KibanaRequest, LifecycleResponseFactory } from '../router';

/**
 * @public
 */
export enum OnPostAuthResultType {
  next = 'next',
  authzResult = 'authzResult',
}

/**
 * @public
 */
export interface OnPostAuthNextResult {
  type: OnPostAuthResultType.next;
}

/**
 * @public
 */
export interface OnPostAuthAuthzResult {
  type: OnPostAuthResultType.authzResult;
  authzResult: Record<string, boolean>;
}

/**
 * @public
 */
export type OnPostAuthResult = OnPostAuthNextResult | OnPostAuthAuthzResult;

/**
 * @public
 * A tool set defining an outcome of OnPostAuth interceptor for incoming request.
 */
export interface OnPostAuthToolkit {
  /** To pass request to the next handler */
  next: () => OnPostAuthResult;
  authzResultNext: (authzResult: Record<string, boolean>) => OnPostAuthAuthzResult;
}

/**
 * See {@link OnPostAuthToolkit}.
 * @public
 */
export type OnPostAuthHandler = (
  request: KibanaRequest,
  response: LifecycleResponseFactory,
  toolkit: OnPostAuthToolkit
) => OnPostAuthResult | IKibanaResponse | Promise<OnPostAuthResult | IKibanaResponse>;
