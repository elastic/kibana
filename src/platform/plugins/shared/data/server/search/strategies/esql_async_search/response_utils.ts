/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ConnectionRequestParams } from '@elastic/transport';
import { SqlGetAsyncResponse } from '@elastic/elasticsearch/lib/api/types';
import type { IKibanaSearchResponse } from '@kbn/search-types';
import { IncomingHttpHeaders } from 'http';
import { sanitizeRequestParams } from '../../sanitize_request_params';

/**
 * Get the Kibana representation of an async search response (see `IKibanaSearchResponse`).
 */
export function toAsyncKibanaSearchResponse(
  response: SqlGetAsyncResponse,
  headers: IncomingHttpHeaders,
  requestParams?: ConnectionRequestParams
): IKibanaSearchResponse<SqlGetAsyncResponse> {
  const responseIsStream = response.id === undefined;
  return {
    id: responseIsStream ? (headers['x-elasticsearch-async-id'] as string) : response.id,
    rawResponse: response,
    isRunning: responseIsStream
      ? headers['x-elasticsearch-async-is-running'] === '?1'
      : response.is_running,
    isPartial: responseIsStream
      ? headers['x-elasticsearch-async-is-partial'] === '?1'
      : response.is_partial,
    ...(headers?.warning ? { warning: headers?.warning } : {}),
    ...(requestParams ? { requestParams: sanitizeRequestParams(requestParams) } : {}),
  };
}
