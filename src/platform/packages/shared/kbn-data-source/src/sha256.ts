/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * SHA-256 of a UTF-8 string, hex-encoded.
 *
 * Uses the native `crypto.subtle` API when available (browser, Node 15+), and
 * falls back to the pure-JS `@kbn/crypto-browser` implementation in
 * environments where it is not (older jsdom, test workers without Web Crypto).
 * Both paths produce identical output.
 */
export async function sha256(input: string): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const enc = new TextEncoder();
    const hash = await crypto.subtle.digest('SHA-256', enc.encode(input));
    return Array.from(new Uint8Array(hash))
      .map((v) => v.toString(16).padStart(2, '0'))
      .join('');
  }
  const { Sha256 } = await import('@kbn/crypto-browser');
  return new Sha256().update(input).digest('hex');
}
