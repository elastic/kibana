/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { appendFileSync } from 'node:fs';

/**
 * Records one coordinator call when `KBN_REMOTE_SEAM_LOG` is a file path.
 * The line is the method name and the serialized byte size. The payload is not written.
 */
export function recordSeam(name: string, payload: unknown): void {
  const path = process.env.KBN_REMOTE_SEAM_LOG;
  if (!path) return;
  let bytes = 0;
  try {
    const encoded = JSON.stringify(payload);
    bytes = encoded ? Buffer.byteLength(encoded) : 0;
  } catch {
    bytes = 0;
  }
  appendFileSync(path, `${JSON.stringify({ name, bytes, at: new Date().toISOString() })}\n`);
}
