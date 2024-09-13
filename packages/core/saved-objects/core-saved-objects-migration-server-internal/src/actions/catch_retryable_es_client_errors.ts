/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as Either from 'fp-ts/lib/Either';
import { errors as EsErrors } from '@elastic/elasticsearch';
import { isRetryableEsClientError } from '@kbn/core-elasticsearch-server-internal';

export interface RetryableEsClientError {
  type: 'retryable_es_client_error';
  message: string;
  error?: Error;
}

export const catchRetryableEsClientErrors = (
  e: EsErrors.ElasticsearchClientError
): Either.Either<RetryableEsClientError, never> => {
  if (isRetryableEsClientError(e)) {
    return Either.left({
      type: 'retryable_es_client_error' as const,
      message: e?.message,
      error: e,
    });
  } else {
    throw e;
  }
};
