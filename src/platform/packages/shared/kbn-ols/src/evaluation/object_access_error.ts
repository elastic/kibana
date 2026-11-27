/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AclObjectDecision } from './evaluate_acl';

/**
 * Why an operation on an object was refused. A caller returns it as an HTTP status: `not_found` as
 * 404, so that an object the caller can't view looks missing, and `forbidden` as 403.
 */
export type ObjectAccessErrorCode = Exclude<AclObjectDecision['status'], 'allowed'>;

/**
 * Error that a service throws when a caller can't perform an operation on an object.
 */
export class ObjectAccessError extends Error {
  /**
   * @param code Why the operation was refused.
   * @param type The object type.
   * @param id The object ID.
   * @param operation The refused operation.
   */
  constructor(
    public readonly code: ObjectAccessErrorCode,
    public readonly type: string,
    public readonly id: string,
    public readonly operation: string
  ) {
    super(
      code === 'not_found'
        ? `Object [${type}/${id}] not found`
        : `Unable to ${operation} ${type} [id=${id}]: missing "${operation}" access`
    );
    this.name = 'ObjectAccessError';
  }
}
