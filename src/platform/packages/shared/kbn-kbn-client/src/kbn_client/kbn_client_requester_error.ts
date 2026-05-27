/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Error thrown by `KbnClientRequester` when an HTTP request fails after retries.
 * Exposes `.status` directly so callers can branch on the HTTP code (e.g. treat
 * 404 as "not found"), and `.headers` so callers can read response headers like
 * `Retry-After` for backoff. The underlying error is attached via `Error.cause`.
 */
export class KbnClientRequesterError extends Error {
  status?: number;
  headers?: Headers;
  constructor(message: string, options?: { status?: number; headers?: Headers; cause?: unknown }) {
    super(message, options?.cause !== undefined ? { cause: options.cause } : undefined);
    this.name = 'KbnClientRequesterError';
    this.status = options?.status;
    this.headers = options?.headers;
  }
}
