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

export interface UnauthorizedErrorHandlerOptions {
  error: UnauthorizedError;
  request: KibanaRequest;
}

export type UnauthorizedErrorHandlerResultType = 'notHandled';

export interface UnauthorizedErrorHandlerResultRetryParams {
  authHeaders: AuthHeaders;
}

export interface UnauthorizedErrorHandlerRetryResult
  extends UnauthorizedErrorHandlerResultRetryParams {
  type: 'retry';
}

export interface UnauthorizedErrorHandlerNotHandledResult {
  type: 'notHandled';
}

export type UnauthorizedErrorHandlerResult =
  | UnauthorizedErrorHandlerRetryResult
  | UnauthorizedErrorHandlerNotHandledResult;

interface UnauthorizedErrorHandlerToolkit {
  /**
   * The handler cannot handle the error, or was not able to reauthenticate
   * */
  notHandled: () => UnauthorizedErrorHandlerResult;
  /**
   * The handle was able to reauthenticate.
   * @param params
   */
  retry: (params: UnauthorizedErrorHandlerResultRetryParams) => UnauthorizedErrorHandlerResult;
}

export const toolkit: UnauthorizedErrorHandlerToolkit = {
  notHandled: () => ({ type: 'notHandled' }),
  retry: ({ authHeaders }) => ({
    type: 'retry',
    authHeaders,
  }),
};

export type UnauthorizedErrorHandler = (
  options: UnauthorizedErrorHandlerOptions,
  toolkit: UnauthorizedErrorHandlerToolkit
) => MaybePromise<UnauthorizedErrorHandlerResult>;

export type InternalUnauthorizedErrorHandler = (
  error: UnauthorizedError
) => MaybePromise<UnauthorizedErrorHandlerResult>;

export const notHandledInternalErrorHandler: InternalUnauthorizedErrorHandler = () =>
  toolkit.notHandled();

/**
 * Converts the public version of `UnauthorizedErrorHandler` to the internal one used by the ES client
 *
 * @internal
 */
export const createInternalErrorHandler = ({
  handler,
  request,
  setAuthHeaders,
}: {
  handler: UnauthorizedErrorHandler;
  request: ScopeableRequest;
  setAuthHeaders: SetAuthHeaders;
}): InternalUnauthorizedErrorHandler => {
  // we don't want to support 401 retry for fake requests
  if (!isRealRequest(request)) {
    return notHandledInternalErrorHandler;
  }
  return async (error) => {
    try {
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
