import type { ScopeableRequest } from '@kbn/core-elasticsearch-server';
export declare class HTTPAuthorizationHeader {
    /**
     * The authentication scheme. Should be consumed in a case-insensitive manner.
     * https://www.iana.org/assignments/http-authschemes/http-authschemes.xhtml#authschemes
     */
    readonly scheme: string;
    /**
     * The authentication credentials for the scheme.
     */
    readonly credentials: string;
    constructor(scheme: string, credentials: string);
    /**
     * Parses request's `Authorization` HTTP header if present.
     * @param request Request instance to extract the authorization header from.
     * @param [headerName] Optional name of the HTTP header to extract authentication information from. By default, the
     * authentication information is extracted from the `Authorization` HTTP header.
     */
    static parseFromRequest(request: ScopeableRequest, headerName?: string): HTTPAuthorizationHeader | null;
    toString(): string;
}
