import type { HttpSetup, HttpFetchQuery } from '@kbn/core/public';
export interface SendRequestConfig {
    path: string;
    method: 'get' | 'post' | 'put' | 'delete' | 'patch' | 'head';
    query?: HttpFetchQuery;
    body?: any;
    /**
     * If set, flags this as a "system request" to indicate that this is not a user-initiated request. For more information, see
     * HttpFetchOptions#asSystemRequest.
     */
    asSystemRequest?: boolean;
    version?: string;
}
export interface SendRequestResponse<D = any, E = any> {
    data: D | null;
    error: E | null;
}
export declare const sendRequest: <D = any, E = any>(httpClient: HttpSetup, { path, method, body, query, version, asSystemRequest }: SendRequestConfig) => Promise<SendRequestResponse<D, E>>;
