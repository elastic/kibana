/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/** Thrown when a schedule request cannot be built because no stored key exists. */
export class WorkflowExecutionIdentityMissingError extends Error {
  constructor(message = 'Workflow execution identity has no usable API key.') {
    super(message);
    this.name = 'WorkflowExecutionIdentityMissingError';
  }
}
