/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { errors as EsErrors } from '@elastic/elasticsearch';
import { isRetryableEsClientError } from '@kbn/core-elasticsearch-server-utils';
import { isResponseError } from '@kbn/es-errors';

/** Error types of a shard that is not assigned or started yet, which clear on their own. */
export const SHARD_UNAVAILABLE_ERROR_TYPES: ReadonlySet<string> = new Set([
  'no_shard_available_action_exception',
  'unavailable_shards_exception',
]);

/** A workflow read or write failed because the workflow index's shard was not available. */
export class WorkflowShardUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WorkflowShardUnavailableError';
  }
}

/**
 * Returns true for the Elasticsearch errors of a cluster that is starting or briefly unreachable:
 * no living connections, connection errors, timeouts, 408/410/429/502/503/504 responses and
 * unavailable shards. Errors that would fail the same way again return false.
 */
export const isTransientEsError = (error: unknown): boolean => {
  if (error instanceof WorkflowShardUnavailableError) {
    return true;
  }
  if (!(error instanceof EsErrors.ElasticsearchClientError)) {
    return false;
  }
  if (isRetryableEsClientError(error)) {
    return true;
  }
  return isResponseError(error) && SHARD_UNAVAILABLE_ERROR_TYPES.has(error.body?.error?.type);
};
