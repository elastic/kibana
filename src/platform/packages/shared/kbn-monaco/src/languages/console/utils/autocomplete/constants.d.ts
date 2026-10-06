export declare const HTTP_METHODS: readonly ['GET', 'POST', 'PUT', 'DELETE', 'HEAD', 'PATCH'];
/**
 * Safeguards for request-line lookup. We scan backwards from the cursor until we find the nearest
 * request method line (GET/POST/...), but we cap the amount of work to avoid a potentially large
 * number of `getLineContent()` calls on very long documents.
 *
 * The character cap is not redundant with the line cap: pasted JSON with huge string fields can
 * hold millions of characters in only a handful of lines, and callers scan the text we return
 * character by character (see https://github.com/elastic/kibana/pull/251173).
 */
export declare const MAX_REQUEST_LINE_LOOKBACK_LINES = 2000;
export declare const MAX_REQUEST_LINE_LOOKBACK_CHARS = 100000;
