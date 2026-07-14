export interface StableStringifyOptions {
    /**
     * Adds indentation for pretty-printing. Can be a number of spaces or a string.
     */
    space?: string | number;
    /**
     * A function or array to filter/transform values during stringification.
     */
    replacer?: ((key: string, value: unknown) => unknown) | (string | number)[] | null;
}
/**
 * Deterministically stringifies a value to JSON with sorted keys.
 * This ensures consistent output regardless of property insertion order,
 * making it ideal for:
 * - Generating cache keys
 * - Creating hashes for comparison
 * - Cryptographic operations requiring deterministic input
 *
 * Also handles circular references safely by replacing them with "[Circular]".
 *
 * @param value - The value to stringify
 * @param options - Optional configuration for formatting
 * @returns A JSON string with keys sorted alphabetically
 */
export declare function stableStringify(value: unknown, options?: StableStringifyOptions): string;
