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
import { sanitizeRequestParams } from '../../../../common/search/sanitize_request_params';

/**
 * Get the Kibana representation of an async search response (see `IKibanaSearchResponse`).
 */
export function toAsyncKibanaSearchResponse(
  response: SqlGetAsyncResponse,
  warning?: string,
  requestParams?: ConnectionRequestParams
): IKibanaSearchResponse<SqlGetAsyncResponse> {
  return {
    id: response.id,
    rawResponse: {
      ...response,
    },
    isPartial: response.is_partial,
    isRunning: response.is_running,
    ...(warning ? { warning } : {}),
    ...(requestParams ? { requestParams: sanitizeRequestParams(requestParams) } : {}),
  };
}
