/**
 * Safely stringifies a value to JSON. Handles circular references by omitting
 * them from the output (treating them as `undefined`).
 *
 * If an unexpected error occurs during stringification, `handleError` will be
 * called if provided, otherwise `undefined` is returned.
 *
 * @param value         The value to stringify.
 * @param handleError   Optional callback that is called when an error occurs during
 *                      stringifying.
 * @returns             The JSON string representation of the value, or `undefined`
 *                      if an error occurs.
 */
export declare function safeJsonStringify(value: unknown, handleError?: (error: Error) => string | undefined): string | undefined;
