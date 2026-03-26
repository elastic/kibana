/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { WorkflowExecutionInvalidStatusError } from './workflow_execution_invalid_status_error';

describe('WorkflowExecutionInvalidStatusError', () => {
  it('includes all 3 params in message', () => {
    const error = new WorkflowExecutionInvalidStatusError('exec-1', 'running', 'pending');
    expect(error.message).toBe(
      'Workflow execution "exec-1" is in status "running" but expected "pending".'
    );
  });

  it('sets name to WorkflowExecutionInvalidStatusError', () => {
    const error = new WorkflowExecutionInvalidStatusError('e', 'a', 'b');
    expect(error.name).toBe('WorkflowExecutionInvalidStatusError');
  });

  it('is an instance of Error', () => {
    const error = new WorkflowExecutionInvalidStatusError('e', 'a', 'b');
    expect(error).toBeInstanceOf(Error);
  });
});
