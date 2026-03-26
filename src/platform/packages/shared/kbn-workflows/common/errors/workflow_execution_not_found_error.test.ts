/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { WorkflowExecutionNotFoundError } from './workflow_execution_not_found_error';

describe('WorkflowExecutionNotFoundError', () => {
  it('includes executionId in message', () => {
    const error = new WorkflowExecutionNotFoundError('exec-456');
    expect(error.message).toBe('Workflow execution with id "exec-456" not found.');
  });

  it('sets name to WorkflowExecutionNotFoundError', () => {
    expect(new WorkflowExecutionNotFoundError('exec-1').name).toBe(
      'WorkflowExecutionNotFoundError'
    );
  });

  it('is an instance of Error', () => {
    expect(new WorkflowExecutionNotFoundError('exec-1')).toBeInstanceOf(Error);
  });
});
