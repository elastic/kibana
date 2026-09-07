/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { charset as mimeCharset } from 'mime-types';

/**
 * Determines whether a Content-Type represents text (safe for UTF-8 decoding) rather than
 * binary data. Uses a layered approach:
 *  1. Missing / empty Content-Type → binary (safe default to avoid data corruption)
 *  2. text/* prefix → always text
 *  3. +json / +xml structured syntax suffix → always text
 *  4. mime-types IANA-derived DB (charset() returns a charset string for text types)
 * Unknown types default to binary to avoid data corruption.
 */
export const isTextContentType = (contentType: string | null): boolean => {
  if (!contentType) return false;
  const mimeType = contentType.split(';')[0].trim().toLowerCase();
  if (mimeType.startsWith('text/')) return true;
  if (mimeType.endsWith('+json') || mimeType.endsWith('+xml')) return true;
  return !!mimeCharset(mimeType);
};

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
export const readResponseStream = async (
  response: Response,
  maxBytes: number
): Promise<ReadStreamResult> => {
  if (!response.body) return { buffer: Buffer.alloc(0), truncated: false };
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (maxBytes > 0 && totalBytes > maxBytes) {
        void reader.cancel();
        return { buffer: Buffer.concat(chunks), truncated: true };
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  return { buffer: Buffer.concat(chunks), truncated: false };
};
