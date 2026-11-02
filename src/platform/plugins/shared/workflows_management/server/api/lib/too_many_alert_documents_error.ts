/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/** Thrown when more alerts are requested than `loadAlertDocuments` loads in one call. */
export class TooManyAlertDocumentsError extends Error {
  constructor(public readonly limit: number, public readonly requestedCount: number) {
    super(`Cannot load more than ${limit} alerts at once (received ${requestedCount}).`);
    this.name = 'TooManyAlertDocumentsError';
  }
}
