/**
 * Encodes a string by appending a CRC32 checksum and base64 encoding the result.
 *
 * @param toEncode - The string to encode
 * @returns Base64 encoded string with CRC32 checksum appended
 *
 * @example
 * const encoded = encode("my-string");
 * // Returns a base64 string with the CRC32 checksum appended
 */
export declare function encodeWithChecksum(toEncode: string): string;
/**
 * Decodes a string that was encoded with the encodeWithChecksum() method.
 * Verifies the CRC32 checksum and returns the original string.
 *
 * @param encoded - The base64 encoded string with CRC32 checksum
 * @returns The original decoded string
 * @throws Error if the checksum is invalid
 *
 * @example
 * const original = decode(encoded);
 */
export declare function decodeWithChecksum(encoded: string): string;
