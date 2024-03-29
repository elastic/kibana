/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { ConnectionRequestParams } from '@elastic/transport';
import type { AsyncSearchResponse } from './types';
import { getTotalLoaded } from '../es_search';
import { sanitizeRequestParams } from '../../sanitize_request_params';

/**
 * Get the Kibana representation of an async search response (see `IKibanaSearchResponse`).
 */
export function toAsyncKibanaSearchResponse(
  response: AsyncSearchResponse,
  warning?: string,
  requestParams?: ConnectionRequestParams
) {
  return {
    id: response.id,
    rawResponse: response.response,
    isPartial: response.is_partial,
    isRunning: response.is_running,
    ...(warning ? { warning } : {}),
    ...(requestParams ? { requestParams: sanitizeRequestParams(requestParams) } : {}),
    ...getTotalLoaded(response.response),
  };
}
