/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SqlQueryResponse } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { SqlSearchStrategyResponse } from '../../../../common';

/**
 * Get the Kibana representation of an async search response
 */
export function toAsyncKibanaSearchResponse(
  response: SqlQueryResponse,
  warning?: string
): SqlSearchStrategyResponse {
  return {
    id: response.id,
    rawResponse: response,
    isPartial: response.is_partial,
    isRunning: response.is_running,
    ...(warning ? { warning } : {}),
  };
}
