/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isWorkflowConflictError, WorkflowConflictError } from './workflow_conflict_error';

describe('WorkflowConflictError', () => {
  const error = new WorkflowConflictError('already exists', 'wf-123');

  it('sets name, message, statusCode, and workflowId', () => {
    expect(error.name).toBe('WorkflowConflictError');
    expect(error.message).toBe('already exists');
    expect(error.statusCode).toBe(409);
    expect(error.workflowId).toBe('wf-123');
    expect(error).toBeInstanceOf(Error);
  });

  it('serialises to JSON correctly', () => {
    expect(error.toJSON()).toEqual({
      error: 'Conflict',
      message: 'already exists',
      statusCode: 409,
      workflowId: 'wf-123',
    });
  });
});

describe('isWorkflowConflictError', () => {
  it('returns true for WorkflowConflictError instances', () => {
    expect(isWorkflowConflictError(new WorkflowConflictError('msg', 'id'))).toBe(true);
  });

  it('returns false for plain Error instances', () => {
    expect(isWorkflowConflictError(new Error('msg'))).toBe(false);
  });
});
