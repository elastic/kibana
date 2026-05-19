/**
 * Compute the Shared Key signature: HMAC-SHA256 over UTF-8 string-to-sign with Base64-decoded key, result Base64-encoded.
 * Uses the Web Crypto API (available in both browser and Node.js 16+).
 * @see https://learn.microsoft.com/en-us/rest/api/storageservices/authorize-with-shared-key
 */
export declare function computeSignature(stringToSign: string, base64AccountKey: string): Promise<string>;
