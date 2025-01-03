/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ConnectionRequestParams } from '@elastic/transport';
import { SqlQueryResponse } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { SqlSearchStrategyResponse } from '../../../../common';
import { sanitizeRequestParams } from '../../sanitize_request_params';

/**
 * Get the Kibana representation of an async search response
 */
export function toAsyncKibanaSearchResponse(
  response: SqlQueryResponse,
  startTime: number,
  warning?: string,
  requestParams?: ConnectionRequestParams
): SqlSearchStrategyResponse {
  return {
    id: response.id,
    rawResponse: response,
    isPartial: response.is_partial,
    isRunning: response.is_running,
    took: Date.now() - startTime,
    ...(warning ? { warning } : {}),
    ...(requestParams ? { requestParams: sanitizeRequestParams(requestParams) } : {}),
  };
}
