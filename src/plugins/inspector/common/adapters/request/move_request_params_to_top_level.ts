/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Response } from './types';

export function moveRequestParamsToTopLevel(response: Response): Response {
  const requestParams = response.json?.requestParams;
  if (!requestParams) {
    return response;
  }

  return {
    ...response,
    json: response.json ? { ...response.json, requestParams: undefined } : undefined,
    requestParams,
  };
}
