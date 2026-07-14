/**
 * Safely parses a JSON string. If the string cannot be parsed, for instance
 * if it is not valid JSON, it will return `undefined`. If `handleError` is
 * defined, it will be called with the error, and the response from the callback
 * will be returned. This allows consumers to wrap the JSON.parse error.
 *
 * @param value         The JSON string to parse.
 * @param handleError   Optional callback that is called when an error
 *                      during parsing. Its return value is returned from the
 *                      function.
 * @returns             The parsed object, or `undefined` if an error occurs.
 */
export declare function safeJsonParse<T = unknown>(value: string, handleError?: (error: Error) => T): T;
