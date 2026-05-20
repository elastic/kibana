import type { RequestResult } from '../../application/hooks/use_send_current_request/send_request';
export declare function textFromRequest(request: {
    method: string;
    url: string;
    data: string | string[];
}): string;
export declare function jsonToString(data: object, indent: boolean): string;
export declare function formatRequestBodyDoc(data: string[], indent: boolean): {
    changed: boolean;
    data: string[];
};
export declare function extractWarningMessages(warnings: string): string[];
export declare function unescape(s: string): string;
export declare function splitOnUnquotedCommaSpace(s: string): string[];
/**
 * Normalizes a URL string using the URL constructor so that comparisons
 * are insensitive to trailing-slash differences and other minor formatting
 * variations (e.g. default-port elision). Returns the original string when
 * it cannot be parsed as a URL.
 */
export declare function normalizeUrl(url: string): string;
/**
 *  Sorts the request data by statusCode in increasing order and
 *  returns the last one which will be rendered in network request status bar
 */
export declare const getResponseWithMostSevereStatusCode: (requestData: RequestResult[] | null | undefined) => RequestResult<unknown> | undefined;
