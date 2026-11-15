/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Thrown by the engine when a resume failed and it left nothing pending, so the caller can release
 * its claim on the waiting step. Every other resume failure is rethrown unchanged.
 */
export class WorkflowResumeNotAppliedError extends Error {
  constructor(executionId: string, cause: unknown) {
    super(
      `Workflow execution "${executionId}" was not resumed: ${
        cause instanceof Error ? cause.message : String(cause)
      }`,
      { cause }
    );
    this.name = 'WorkflowResumeNotAppliedError';
  }
}
