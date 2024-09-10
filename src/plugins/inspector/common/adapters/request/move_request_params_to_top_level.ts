/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ConnectionRequestParams } from '@elastic/transport';
import { Response } from './types';

interface SearchResponse {
  [key: string]: unknown;
  requestParams?: ConnectionRequestParams;
}

export function moveRequestParamsToTopLevel(response: Response) {
  const requestParams = (response.json as SearchResponse)?.requestParams;
  if (!requestParams) {
    return response;
  }

  const json = { ...response.json } as SearchResponse;
  delete json.requestParams;
  return {
    ...response,
    json,
    requestParams,
  };
}
