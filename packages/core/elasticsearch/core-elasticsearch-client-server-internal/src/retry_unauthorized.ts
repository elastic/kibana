/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { MaybePromise } from '@kbn/utility-types';
import { UnauthorizedError } from '@kbn/es-errors';
import type { SetAuthHeaders } from '@kbn/core-http-server';
import { isRealRequest } from '@kbn/core-http-router-server-internal';
import type {
  ScopeableRequest,
  UnauthorizedErrorHandler,
  UnauthorizedErrorHandlerResult,
  UnauthorizedErrorHandlerToolkit,
  UnauthorizedErrorHandlerRetryResult,
  UnauthorizedErrorHandlerNotHandledResult,
} from '@kbn/core-elasticsearch-server';

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
