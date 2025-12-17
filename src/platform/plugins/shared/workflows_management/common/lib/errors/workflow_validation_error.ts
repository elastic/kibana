/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export class WorkflowValidationError extends Error {
  public readonly statusCode = 400;

  constructor(message: string, public readonly validationErrors?: string[]) {
    super(message);
    this.name = 'WorkflowValidationError';
  }

  public toJSON() {
    return {
      error: 'Bad Request',
      message: this.message,
      statusCode: this.statusCode,
      validationErrors: this.validationErrors,
    };
  }
}

export function isWorkflowValidationError(error: Error): error is WorkflowValidationError {
  return error instanceof WorkflowValidationError;
}
