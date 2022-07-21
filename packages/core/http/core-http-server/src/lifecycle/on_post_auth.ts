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
export enum OnPostAuthResultType {
  next = 'next',
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
export type OnPostAuthResult = OnPostAuthNextResult;

/**
 * @public
 * A tool set defining an outcome of OnPostAuth interceptor for incoming request.
 */
export interface OnPostAuthToolkit {
  /** To pass request to the next handler */
  next: () => OnPostAuthResult;
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
