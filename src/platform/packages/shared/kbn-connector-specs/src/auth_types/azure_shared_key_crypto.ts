/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Compute the Shared Key signature: HMAC-SHA256 over UTF-8 string-to-sign with Base64-decoded key, result Base64-encoded.
 * Uses the Web Crypto API (available in both browser and Node.js 16+).
 * @see https://learn.microsoft.com/en-us/rest/api/storageservices/authorize-with-shared-key
 */
export async function computeSignature(
  stringToSign: string,
  base64AccountKey: string
): Promise<string> {
  const keyBytes = Uint8Array.from(atob(base64AccountKey), (c) => c.charCodeAt(0));
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyBytes,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sigBuffer = await crypto.subtle.sign(
    'HMAC',
    cryptoKey,
    new TextEncoder().encode(stringToSign)
  );
  let binary = '';
  for (const byte of new Uint8Array(sigBuffer)) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}
