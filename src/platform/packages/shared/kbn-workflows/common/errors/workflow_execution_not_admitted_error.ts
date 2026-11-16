/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/** A registered execution admission guard (for example a spend budget) refused to start the run. */
export class WorkflowExecutionNotAdmittedError extends Error {
  readonly isUserError = true as const;

  constructor(
    public readonly workflowId: string,
    public readonly guardId: string,
    public readonly reason: string
  ) {
    super(`Workflow ${workflowId} was not started: ${reason}`);
    this.name = 'WorkflowExecutionNotAdmittedError';
  }
}
