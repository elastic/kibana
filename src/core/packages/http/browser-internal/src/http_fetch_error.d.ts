import type { IHttpFetchError } from '@kbn/core-http-browser';
/** @internal */
export declare class HttpFetchError extends Error implements IHttpFetchError {
    readonly request: Request;
    readonly response?: Response | undefined;
    readonly body?: any | undefined;
    readonly name: string;
    constructor(message: string, name: string, request: Request, response?: Response | undefined, body?: any | undefined);
}
