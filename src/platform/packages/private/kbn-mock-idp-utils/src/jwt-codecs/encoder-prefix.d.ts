/**
 * Prefixes an encoded string with the ESSU dev identifier.
 *
 * @param encoded - The encoded string to prefix
 * @returns The encoded string prefixed with "essu_dev_"
 *
 * @example
 * ```typescript
 * const encoded = "abc123";
 * const prefixed = prefixWithEssuDev(encoded);
 * // Returns: "essu_dev_abc123"
 **/
export declare function prefixWithEssuDev(encoded: string): string;
/**
 * Removes the essu_dev_ identifier prefix from a string.
 *
 * @param prefixed - The prefixed string to remove the prefix from
 * @returns The string without the "essu_dev_" prefix
 * @throws Error if the string doesn't start with the expected prefix
 *
 * @example
 * ```typescript
 * const prefixed = "essu_dev_abc123";
 * const unprefixed = removePrefixEssuDev(prefixed);
 * // Returns: "abc123"
 **/
export declare function removePrefixEssuDev(prefixed: string): string;
