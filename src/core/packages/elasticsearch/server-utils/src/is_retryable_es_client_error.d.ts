import { errors as EsErrors } from '@elastic/elasticsearch';
/**
 * Returns true if the given elasticsearch error should be retried
 *
 * Retryable errors include:
 * - NoLivingConnectionsError
 * - ConnectionError
 * - TimeoutError
 * - ResponseError with status codes:
 *   - 408 RequestTimeout
 *   - 410 Gone
 *   - 429 TooManyRequests (ES circuit breaker)
 *   - 503 ServiceUnavailable
 *   - 504 GatewayTimeout
 *   - OR custom status codes if provided
 * @param e The error to check
 * @param customRetryStatusCodes Custom response status codes to consider as retryable
 * @returns true if the error is retryable, false otherwise
 */
export declare const isRetryableEsClientError: (e: EsErrors.ElasticsearchClientError, customRetryStatusCodes?: number[]) => boolean;
