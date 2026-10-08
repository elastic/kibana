/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Thrown when the `workflow:resume` task for a parked wait cannot be scheduled,
 * e.g. Task Manager fails to clone the task's UIAM API key because it was revoked.
 * Nothing can advance the execution afterwards, so step-level `on-failure`
 * handlers (retry, fallback, continue) must not recover from it: the execution
 * has to fail instead of staying WAITING without a continuation.
 */
export class ResumeTaskSchedulingError extends Error {
  constructor(cause: unknown) {
    super(
      `Failed to schedule workflow resume task: ${
        cause instanceof Error ? cause.message : String(cause)
      }`,
      { cause }
    );
    this.name = 'ResumeTaskSchedulingError';
  }
}

export const isResumeTaskSchedulingError = (error: unknown): error is ResumeTaskSchedulingError =>
  error instanceof ResumeTaskSchedulingError;
