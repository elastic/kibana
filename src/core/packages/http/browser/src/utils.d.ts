import type { IHttpFetchError } from './types';
/** @public */
export declare function isHttpFetchError<T>(error: T | IHttpFetchError): error is IHttpFetchError;
type HttpPathParamPrimitive = string | number | boolean;
type HttpPathParamValue = HttpPathParamPrimitive | readonly HttpPathParamPrimitive[];
type HttpPathParams = Record<string, HttpPathParamValue | undefined>;
/**
 * Builds a URL path from a route template by URI-encoding path params.
 *
 * @example
 * buildPath('/api/dashboards/{id}', { id: '../../../internal/security/users/foo' });
 * // '/api/dashboards/..%2F..%2F..%2Finternal%2Fsecurity%2Fusers%2Ffoo'
 *
 * @example
 * buildPath('/api/files/{filePath*}', { filePath: 'nested/folder/my file.txt' });
 * // '/api/files/nested/folder/my%20file.txt'
 *
 * @public
 */
export declare function buildPath(path: string, params?: HttpPathParams): string;
export {};
