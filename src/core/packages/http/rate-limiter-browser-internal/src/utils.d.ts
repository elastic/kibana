import { type IHttpFetchError } from '@kbn/core-http-browser';
export declare function isRateLimiterError(error: unknown): error is IHttpFetchError;
export declare function getRetryAfter(error: IHttpFetchError): number;
