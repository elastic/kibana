/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type * as Either from 'fp-ts/Either';
import type { errors as EsErrors } from '@elastic/elasticsearch';
export interface RetryableEsClientError {
  type: 'retryable_es_client_error';
  message: string;
  error?: Error;
}
export declare const catchRetryableEsClientErrors: (
  e: EsErrors.ElasticsearchClientError
) => Either.Either<RetryableEsClientError, never>;
export declare const catchRetryableSearchPhaseExecutionException: (
  e: EsErrors.ResponseError
) => Either.Either<RetryableEsClientError, never>;
