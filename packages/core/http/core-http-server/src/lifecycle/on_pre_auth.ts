/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { IKibanaResponse, KibanaRequest, LifecycleResponseFactory } from '../router';

/**
 * @public
 */
export enum OnPreAuthResultType {
  next = 'next',
}

/**
 * @public
 */
export interface OnPreAuthNextResult {
  type: OnPreAuthResultType.next;
}

/**
 * @public
 */
export type OnPreAuthResult = OnPreAuthNextResult;

/**
 * @public
 * A tool set defining an outcome of OnPreAuth interceptor for incoming request.
 */
export interface OnPreAuthToolkit {
  /** To pass request to the next handler */
  next: () => OnPreAuthResult;
}

/**
 * See {@link OnPreAuthToolkit}.
 * @public
 */
export type OnPreAuthHandler = (
  request: KibanaRequest,
  response: LifecycleResponseFactory,
  toolkit: OnPreAuthToolkit
) => OnPreAuthResult | IKibanaResponse | Promise<OnPreAuthResult | IKibanaResponse>;
