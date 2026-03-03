/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export class WorkflowExecutionInvalidStatusError extends Error {
  public readonly statusCode = 409;

  constructor(executionId: string, currentStatus: string, expectedStatus: string) {
    super(
      `Workflow execution "${executionId}" is in status "${currentStatus}" but expected "${expectedStatus}".`
    );
    this.name = 'WorkflowExecutionInvalidStatusError';
  }
}

export const isWorkflowExecutionInvalidStatusError = (
  error: Error
): error is WorkflowExecutionInvalidStatusError =>
  error instanceof WorkflowExecutionInvalidStatusError;
