export type RequestValidationSource = 'params' | 'query' | 'body' | 'unknown';
export declare class RequestValidationFailure extends Error {
    readonly source: RequestValidationSource;
    readonly rawError: unknown;
    constructor(message: string, source: RequestValidationSource, rawError: unknown);
}
