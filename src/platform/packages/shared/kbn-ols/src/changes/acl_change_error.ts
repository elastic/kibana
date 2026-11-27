/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Why a requested access was refused. A caller returns it as an HTTP status: `bad_request` as 400,
 * `forbidden` as 403, `not_found` as 404, and `conflict` as 409.
 */
export type AclChangeErrorCode = 'bad_request' | 'forbidden' | 'not_found' | 'conflict';

/**
 * Error that `prepareInitialAcl` and `prepareAclChange` throw when the requested access is invalid
 * or not allowed.
 */
export class AclChangeError extends Error {
  /**
   * @param code Why the requested access was refused.
   * @param message What the caller has to change, safe to return to the caller.
   */
  constructor(public readonly code: AclChangeErrorCode, message: string) {
    super(message);
    this.name = 'AclChangeError';
  }
}
