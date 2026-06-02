/**
 * Formats an array value as a JSON-encoded string of individually converted elements.
 *
 * This is the text-path counterpart of {@link formatReactArray}.
 */
export declare function formatTextArray(val: unknown[], convertSingle: (v: unknown) => string): string;
