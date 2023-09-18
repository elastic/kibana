/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { RequestStatus, Response } from './types';

export function moveRequestParamsToTopLevel(status: RequestStatus, response: Response) {
  if (status === RequestStatus.ERROR) {
    const requestParams = response.json?.err?.requestParams;
    if (!requestParams) {
      return response;
    }

    const json = {
      ...response.json,
      err: { ...response.json.err },
    };
    delete json.err.requestParams;
    return {
      ...response,
      json,
      requestParams,
    };
  }

  const requestParams = response.json?.requestParams;
  if (!requestParams) {
    return response;
  }

  const json = { ...response.json };
  delete json.requestParams;
  return {
    ...response,
    json,
    requestParams,
  };
}
