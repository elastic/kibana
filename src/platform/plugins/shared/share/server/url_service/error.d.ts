export type UrlServiceErrorCode = 'SLUG_EXISTS' | 'NOT_FOUND' | '';
export declare class UrlServiceError extends Error {
    readonly code: UrlServiceErrorCode;
    constructor(message: string, code?: UrlServiceErrorCode);
}
