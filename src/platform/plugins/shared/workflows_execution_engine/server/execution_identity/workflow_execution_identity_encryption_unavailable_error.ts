/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/** Thrown when the identity store cannot be used because encryption is unavailable. */
export class WorkflowExecutionIdentityEncryptionUnavailableError extends Error {
  constructor(message = 'Encrypted saved objects are unavailable; cannot use execution identity.') {
    super(message);
    this.name = 'WorkflowExecutionIdentityEncryptionUnavailableError';
  }
}
