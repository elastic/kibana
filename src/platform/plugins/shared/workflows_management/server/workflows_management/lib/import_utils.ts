/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Readable } from 'stream';

export {
  detectFileFormat,
  isValidWorkflowId,
  MAX_IMPORT_WORKFLOWS,
} from '../../../common/lib/export';

export const MAX_IMPORT_PAYLOAD_BYTES = 10 * 1024 * 1024; // 10 MB

/**
 * Collects a readable stream into a single Buffer, aborting if the stream
 * exceeds `maxBytes` (when provided) to prevent unbounded memory growth.
 */
export async function readStreamToBuffer(stream: Readable, maxBytes?: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let totalBytes = 0;
    stream.on('data', (chunk: Buffer) => {
      totalBytes += chunk.length;
      if (maxBytes !== undefined && totalBytes > maxBytes) {
        stream.destroy();
        reject(new Error(`Stream exceeded the maximum allowed size of ${maxBytes} bytes`));
        return;
      }
      chunks.push(chunk);
    });
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', (err) => reject(err));
  });
}
