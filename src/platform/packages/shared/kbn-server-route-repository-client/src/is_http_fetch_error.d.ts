import type { IHttpFetchError } from '@kbn/core-http-browser';
interface ErrorBody {
    statusCode: number;
    message: string;
    error: string;
}
export declare function isHttpFetchError(error: unknown): error is IHttpFetchError<ErrorBody>;
export {};
