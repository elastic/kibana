/**
 * Determines whether a Content-Type represents text (safe for UTF-8 decoding) rather than
 * binary data. Uses a layered approach:
 *  1. Missing / empty Content-Type → binary (safe default to avoid data corruption)
 *  2. text/* prefix → always text
 *  3. +json / +xml structured syntax suffix → always text
 *  4. mime-types IANA-derived DB (charset() returns a charset string for text types)
 * Unknown types default to binary to avoid data corruption.
 */
export declare const isTextContentType: (contentType: string | null) => boolean;
export interface ReadStreamResult {
    buffer: Buffer;
    truncated: boolean;
}
/**
 * Reads a fetch Response body stream into a raw Buffer with byte-size enforcement.
 * When the limit is exceeded the stream is cancelled and the bytes read so far are
 * returned with `truncated: true`. The caller decides whether to throw or truncate.
 *
 * @param response - The fetch Response whose body to read.
 * @param maxBytes - Maximum number of bytes to read. 0 or negative disables the limit.
 */
export declare const readResponseStream: (response: Response, maxBytes: number) => Promise<ReadStreamResult>;
