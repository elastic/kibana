/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { IncomingMessage } from 'http';

export function streamToJSON(stream: IncomingMessage, limit: number) {
  return new Promise<string>((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on('data', (chunk) => {
      chunks.push(chunk);
      if (Buffer.byteLength(Buffer.concat(chunks)) > limit) {
        stream.destroy();
        reject(new Error('Response size limit exceeded'));
      }
    });
    stream.on('end', () => {
      const response = Buffer.concat(chunks).toString('utf8');
      resolve(JSON.parse(response));
    });
    stream.on('error', reject);
  });
}
