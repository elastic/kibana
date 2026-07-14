import * as Either from 'fp-ts/Either';
import type { errors as EsErrors } from '@elastic/elasticsearch';
export interface RetryableEsClientError {
    type: 'retryable_es_client_error';
    message: string;
    error?: Error;
}
export declare const catchRetryableEsClientErrors: (e: EsErrors.ElasticsearchClientError) => Either.Either<RetryableEsClientError, never>;
export declare const catchRetryableSearchPhaseExecutionException: (e: EsErrors.ResponseError) => Either.Either<RetryableEsClientError, never>;
