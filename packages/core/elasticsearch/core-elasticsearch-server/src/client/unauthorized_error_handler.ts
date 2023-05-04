/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { MaybePromise } from '@kbn/utility-types';
import type { UnauthorizedError } from '@kbn/es-errors';
import type { AuthHeaders, KibanaRequest } from '@kbn/core-http-server';

/**
 * @public
 */
export interface UnauthorizedErrorHandlerOptions {
  error: UnauthorizedError;
  request: KibanaRequest;
}

/**
 * @public
 */
export interface UnauthorizedErrorHandlerResultRetryParams {
  authHeaders: AuthHeaders;
}

/**
 * @public
 */
export interface UnauthorizedErrorHandlerRetryResult
  extends UnauthorizedErrorHandlerResultRetryParams {
  type: 'retry';
}

/**
 * @public
 */
export interface UnauthorizedErrorHandlerNotHandledResult {
  type: 'notHandled';
}

/**
 * @public
 */
export type UnauthorizedErrorHandlerResult =
  | UnauthorizedErrorHandlerRetryResult
  | UnauthorizedErrorHandlerNotHandledResult;

/**
 * Toolkit passed to a {@link UnauthorizedErrorHandler} used to generate responses from the handler
 * @public
 */
export interface UnauthorizedErrorHandlerToolkit {
  /**
   * The handler cannot handle the error, or was not able to authenticate.
   */
  notHandled: () => UnauthorizedErrorHandlerNotHandledResult;
  /**
   * The handler was able to authenticate. Will retry the failed request with new auth headers
   */
  retry: (params: UnauthorizedErrorHandlerResultRetryParams) => UnauthorizedErrorHandlerRetryResult;
}

/**
 * A handler used to handle unauthorized error returned by elasticsearch
 *
 * @public
 */
export type UnauthorizedErrorHandler = (
  options: UnauthorizedErrorHandlerOptions,
  toolkit: UnauthorizedErrorHandlerToolkit
) => MaybePromise<UnauthorizedErrorHandlerResult>;
