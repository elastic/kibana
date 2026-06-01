/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Thrown by `resumeWorkflowExecution` when the caller's `expectedResumeSeq` does
 * not match the workflow execution's current `resume_seq + 1`. Indicates that
 * another resume already advanced the execution and this submission is stale.
 *
 * Callers should treat this as an idempotent rejection — no retry; refetch
 * canonical state and surface a stale acknowledgement to the user.
 */
export class WorkflowExecutionStaleResumeError extends Error {
  public readonly executionId: string;
  public readonly expectedResumeSeq: number;
  public readonly currentResumeSeq: number;

  constructor(executionId: string, expectedResumeSeq: number, currentResumeSeq: number) {
    super(
      `Workflow execution "${executionId}" stale resume: expected resume_seq=${expectedResumeSeq}, current=${currentResumeSeq}.`
    );
    this.name = 'WorkflowExecutionStaleResumeError';
    this.executionId = executionId;
    this.expectedResumeSeq = expectedResumeSeq;
    this.currentResumeSeq = currentResumeSeq;
  }
}
