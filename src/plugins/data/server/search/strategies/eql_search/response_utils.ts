/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { TransportResult } from '@elastic/elasticsearch';
import { EqlSearchResponse } from './types';
import { EqlSearchStrategyResponse } from '../../../../common';

/**
 * Get the Kibana representation of an EQL search response (see `IKibanaSearchResponse`).
 * (EQL does not provide _shard info, so total/loaded cannot be calculated.)
 */
export function toEqlKibanaSearchResponse(
  response: TransportResult<EqlSearchResponse>
): EqlSearchStrategyResponse {
  return {
    id: response.body.id,
    rawResponse: response,
    isPartial: response.body.is_partial,
    isRunning: response.body.is_running,
  };
}
