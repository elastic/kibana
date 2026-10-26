/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { estypes } from '@elastic/elasticsearch';
import { isResponseError } from '@kbn/es-errors';

/**
 * Returns true if the error is an ES `index_not_found_exception`.
 * This is expected when an index has not yet been created (e.g. no workflows executed yet).
 */
export const isIndexNotFoundError = (error: unknown): boolean =>
  isResponseError(error) && error.body?.error?.type === 'index_not_found_exception';

const ELASTICSEARCH_QUERY_ERROR_TYPES = new Set([
  'search_phase_execution_exception',
  'query_shard_exception',
  'parsing_exception',
  'illegal_argument_exception',
]);

export const isElasticsearchQueryError = (error: unknown): boolean => {
  if (!isResponseError(error)) {
    return false;
  }

  const errorTypes = [
    error.body?.error?.type,
    ...(error.body?.error?.root_cause?.map((cause: estypes.ErrorCause) => cause.type) ?? []),
    ...(error.body?.error?.caused_by?.type ? [error.body.error.caused_by.type] : []),
  ];

  return errorTypes.some((type) => type != null && ELASTICSEARCH_QUERY_ERROR_TYPES.has(type));
};

export const getElasticsearchErrorMessage = (error: unknown): string | undefined => {
  if (!isResponseError(error)) {
    return undefined;
  }

  const rootCauseReason = error.body?.error?.root_cause?.[0]?.reason;
  if (typeof rootCauseReason === 'string' && rootCauseReason.length > 0) {
    return rootCauseReason;
  }

  const reason = error.body?.error?.reason;
  if (typeof reason === 'string' && reason.length > 0) {
    return reason;
  }

  return error.message;
};
