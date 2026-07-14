export interface PrettyCompactStringifyOptions {
    /**
     * Maximum line length before breaking to multiple lines.
     * @default 80
     */
    maxLength?: number;
    /**
     * Number of spaces for indentation.
     * @default 2
     */
    indent?: number;
    /**
     * A function that alters the behavior of the stringification process,
     * or an array of strings/numbers to filter properties.
     */
    replacer?: ((key: string, value: unknown) => unknown) | (string | number)[] | null;
}
/**
 * Pretty-prints JSON in a compact format that balances readability with space efficiency.
 *
 * Short objects and arrays are kept on a single line when they fit within `maxLength`.
 * Longer structures are broken across multiple lines with proper indentation.
 *
 * This is useful for displaying JSON in editors or logs where both readability
 * and compact output are desired.
 *
 * @param value - The value to stringify
 * @param options - Configuration options for formatting
 * @returns A formatted JSON string
 *
 * @example
 * // Short arrays stay on one line
 * prettyCompactStringify([1, 2, 3])
 * // => "[1, 2, 3]"
 *
 * @example
 * // Long arrays break to multiple lines
 * prettyCompactStringify([{ x: 1, y: 2 }, { x: 2, y: 1 }], { maxLength: 20 })
 * // => "[\n  {\"x\": 1, \"y\": 2},\n  {\"x\": 2, \"y\": 1}\n]"
 */
export declare function prettyCompactStringify(value: unknown, options?: PrettyCompactStringifyOptions): string;
