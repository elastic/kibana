/**
 * Pretty-prints a field value that contains JSON blocks, replacing every JSON block with its pretty-printed
 * form and placing each block (and each surrounding run of text) on its own line so
 * the result reads clearly. Returns the transformed string, or undefined
 * when the value contains no JSON to format, so the caller can render it as-is.
 */
export declare const tryPrettyPrintJsonBlocks: (value: string) => string | undefined;
