/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { TransportResult } from '@elastic/transport';

function createApiResponseMock<TResponse, TContext>(
  apiResponse: Pick<TransportResult<TResponse, TContext>, 'body'> &
    Partial<Omit<TransportResult<TResponse, TContext>, 'body'>>
): TransportResult<TResponse, TContext> {
  return {
    statusCode: null,
    headers: null,
    warnings: null,
    meta: {} as any,
    ...apiResponse,
  };
}

export const interactiveSetupMock = {
  createApiResponse: createApiResponseMock,
};
