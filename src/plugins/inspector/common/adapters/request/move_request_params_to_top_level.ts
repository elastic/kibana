/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { ConnectionRequestParams } from '@elastic/transport';
import { RequestStatus, Response } from './types';

interface ErrorResponse {
  [key: string]: unknown;
  err?: {
    [key: string]: unknown;
    requestParams?: ConnectionRequestParams;
  };
}

interface OkResponse {
  [key: string]: unknown;
  requestParams?: ConnectionRequestParams;
}

export function moveRequestParamsToTopLevel(status: RequestStatus, response: Response) {
  if (status === RequestStatus.ERROR) {
    const requestParams = (response.json as ErrorResponse)?.err?.requestParams;
    if (!requestParams) {
      return response;
    }

    const json = {
      ...response.json,
      err: { ...(response.json as ErrorResponse).err },
    };
    delete json.err.requestParams;
    return {
      ...response,
      json,
      requestParams,
    };
  }

  const requestParams = (response.json as OkResponse)?.requestParams;
  if (!requestParams) {
    return response;
  }

  const json = { ...response.json } as OkResponse;
  delete json.requestParams;
  return {
    ...response,
    json,
    requestParams,
  };
}
