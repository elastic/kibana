/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isWorkflowValidationError, WorkflowValidationError } from '../../common/lib/errors';

describe('WorkflowValidationError', () => {
  it('should create a validation error with proper properties', () => {
    const validationErrors = [
      'Step name "duplicate" is not unique. Found 2 steps with this name.',
      'Step name "another" is not unique. Found 3 steps with this name.',
    ];

    const error = new WorkflowValidationError(
      'Workflow validation failed: Step names must be unique throughout the workflow.',
      validationErrors
    );

    expect(error.message).toBe(
      'Workflow validation failed: Step names must be unique throughout the workflow.'
    );
    expect(error.statusCode).toBe(400);
    expect(error.validationErrors).toEqual(validationErrors);
    expect(error.name).toBe('WorkflowValidationError');
    expect(isWorkflowValidationError(error)).toBe(true);
  });

  it('should create a validation error without specific validation errors', () => {
    const error = new WorkflowValidationError('General validation failure');

    expect(error.message).toBe('General validation failure');
    expect(error.statusCode).toBe(400);
    expect(error.validationErrors).toBeUndefined();
    expect(isWorkflowValidationError(error)).toBe(true);
  });

  it('should serialize to JSON properly', () => {
    const validationErrors = ['Error 1', 'Error 2'];
    const error = new WorkflowValidationError('Test error', validationErrors);

    const json = error.toJSON();

    expect(json).toEqual({
      error: 'Bad Request',
      message: 'Test error',
      statusCode: 400,
      validationErrors: ['Error 1', 'Error 2'],
    });
  });

  it('should be identified by type guard function', () => {
    const validationError = new WorkflowValidationError('Test');
    const regularError = new Error('Regular error');
    const objectWithFlag = { isWorkflowValidationError: true };

    expect(isWorkflowValidationError(validationError)).toBe(true);
    expect(isWorkflowValidationError(regularError)).toBe(false);
    expect(isWorkflowValidationError(objectWithFlag as unknown as Error)).toBe(false);
    expect(isWorkflowValidationError(null as unknown as Error)).toBe(false);
    expect(isWorkflowValidationError(undefined as unknown as Error)).toBe(false);
    expect(isWorkflowValidationError({} as unknown as Error)).toBe(false);
  });
});
