/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { ConnectionRequestParams } from '@elastic/transport';
import { SqlGetAsyncResponse } from '@elastic/elasticsearch/lib/api/types';
import type { IKibanaSearchResponse } from '@kbn/search-types';
import { sanitizeRequestParams } from '../../sanitize_request_params';

/**
 * Get the Kibana representation of an async search response (see `IKibanaSearchResponse`).
 */
export async function toAsyncKibanaSearchResponse(
  response: any,
  warning?: string,
  requestParams?: ConnectionRequestParams
): Promise<IKibanaSearchResponse<SqlGetAsyncResponse>> {
  const chunks = [];
  for await (const chunk of response) {
    chunks.push(chunk);
  }
  return {
    id: response.id,
    rawResponse: Buffer.concat(chunks) as any,
    isPartial: !response.complete,
    isRunning: !response.complete && !response.aborted,
    ...(warning ? { warning } : {}),
    ...(requestParams ? { requestParams: sanitizeRequestParams(requestParams) } : {}),
  };
}
