/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ConnectionRequestParams } from '@elastic/transport';
import type { IKibanaSearchResponse } from '@kbn/search-types';
import { IncomingHttpHeaders } from 'http';
import type { AsyncSearchResponse } from './types';
import { sanitizeRequestParams } from '../../sanitize_request_params';
import { AsyncSearchStatusResponse } from './types';

/**
 * Get the Kibana representation of an async search status response.
 */
export function toAsyncKibanaSearchStatusResponse(
  response: AsyncSearchStatusResponse,
  warning?: string
): IKibanaSearchResponse {
  return {
    id: response.id,
    rawResponse: {},
    isPartial: response.is_partial,
    isRunning: response.is_running,
    ...(warning ? { warning } : {}),
  };
}

/**
 * Get the Kibana representation of an async search response.
 */
export function toAsyncKibanaSearchResponse(
  response: AsyncSearchResponse,
  headers: IncomingHttpHeaders,
  requestParams?: ConnectionRequestParams
): IKibanaSearchResponse {
  return {
    id: headers['x-elasticsearch-async-id'] as string,
    rawResponse: response,
    isPartial: headers['x-elasticsearch-async-is-running'] === '?1',
    isRunning: headers['x-elasticsearch-async-is-running'] === '?1',
    ...(headers.warning ? { warning: headers.warning } : {}),
    ...(requestParams ? { requestParams: sanitizeRequestParams(requestParams) } : {}),
  };
}
