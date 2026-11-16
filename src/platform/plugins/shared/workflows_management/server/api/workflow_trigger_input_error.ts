/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Thrown when a run's trigger selection is malformed, too large, or resolves to nothing.
 *
 * `statusCode` lets callers outside this plugin that map errors by status (e.g. Cases'
 * `wrapError`) answer with a 400 as well, not only the workflows routes.
 */
export class WorkflowTriggerInputError extends Error {
  public readonly statusCode = 400;

  constructor(message: string) {
    super(message);
    this.name = 'WorkflowTriggerInputError';
  }
}
