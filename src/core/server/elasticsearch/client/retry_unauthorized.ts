/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { MaybePromise } from '@kbn/utility-types';
import { AuthHeaders, KibanaRequest, SetAuthHeaders, isRealRequest } from '../../http';
import { ScopeableRequest } from '../types';
import { UnauthorizedError } from './errors';

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

/** @internal */
export type InternalUnauthorizedErrorHandler = (
  error: UnauthorizedError
) => MaybePromise<UnauthorizedErrorHandlerResult>;

/** @internal */
export const toolkit: UnauthorizedErrorHandlerToolkit = {
  notHandled: () => ({ type: 'notHandled' }),
  retry: ({ authHeaders }) => ({
    type: 'retry',
    authHeaders,
  }),
};

const notHandledInternalErrorHandler: InternalUnauthorizedErrorHandler = () => toolkit.notHandled();

/**
 * Converts the public version of `UnauthorizedErrorHandler` to the internal one used by the ES client
 *
 * @internal
 */
export const createInternalErrorHandler = ({
  getHandler,
  request,
  setAuthHeaders,
}: {
  getHandler: () => UnauthorizedErrorHandler | undefined;
  request: ScopeableRequest;
  setAuthHeaders: SetAuthHeaders;
}): InternalUnauthorizedErrorHandler => {
  // we don't want to support 401 retry for fake requests
  if (!isRealRequest(request)) {
    return notHandledInternalErrorHandler;
  }
  return async (error) => {
    try {
      const handler = getHandler();
      if (!handler) {
        return toolkit.notHandled();
      }
      const result = await handler({ request, error }, toolkit);
      if (isRetryResult(result)) {
        setAuthHeaders(request, result.authHeaders);
      }
      return result;
    } catch (e) {
      return toolkit.notHandled();
    }
  };
};

export const isRetryResult = (
  result: UnauthorizedErrorHandlerResult
): result is UnauthorizedErrorHandlerRetryResult => {
  return result.type === 'retry';
};

export const isNotHandledResult = (
  result: UnauthorizedErrorHandlerResult
): result is UnauthorizedErrorHandlerNotHandledResult => {
  return result.type === 'notHandled';
};
