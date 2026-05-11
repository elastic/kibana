/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isWorkflowValidationError, WorkflowValidationError } from './workflow_validation_error';

describe('WorkflowValidationError', () => {
  it('sets name, message, statusCode, and validationErrors', () => {
    const errors = ['field required', 'invalid type'];
    const error = new WorkflowValidationError('invalid workflow', errors);
    expect(error.name).toBe('WorkflowValidationError');
    expect(error.message).toBe('invalid workflow');
    expect(error.statusCode).toBe(400);
    expect(error.validationErrors).toEqual(errors);
    expect(error).toBeInstanceOf(Error);
  });

  it('leaves validationErrors undefined when not provided', () => {
    const error = new WorkflowValidationError('invalid');
    expect(error.validationErrors).toBeUndefined();
  });

  it('serialises to JSON correctly', () => {
    const errors = ['bad field'];
    const error = new WorkflowValidationError('invalid', errors);
    expect(error.toJSON()).toEqual({
      error: 'Bad Request',
      message: 'invalid',
      statusCode: 400,
      validationErrors: errors,
    });
  });
});

describe('isWorkflowValidationError', () => {
  it('returns true for WorkflowValidationError instances', () => {
    expect(isWorkflowValidationError(new WorkflowValidationError('msg'))).toBe(true);
  });

  it('returns false for plain Error instances', () => {
    expect(isWorkflowValidationError(new Error('msg'))).toBe(false);
  });
});
