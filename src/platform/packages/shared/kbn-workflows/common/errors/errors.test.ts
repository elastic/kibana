/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { WorkflowDisabledError } from './workflow_disabled_error';
import { WorkflowExecutionInvalidStatusError } from './workflow_execution_invalid_status_error';
import { WorkflowExecutionNotFoundError } from './workflow_execution_not_found_error';
import { WorkflowNotFoundError } from './workflow_not_found_error';
import { WorkflowResumeNotAppliedError } from './workflow_resume_not_applied_error';

describe('workflow error classes', () => {
  it.each<{ create: () => Error; expectedName: string; expectedMessage: string }>([
    {
      create: () => new WorkflowNotFoundError('wf-123'),
      expectedName: 'WorkflowNotFoundError',
      expectedMessage: 'Workflow with id "wf-123" not found.',
    },
    {
      create: () => new WorkflowExecutionNotFoundError('exec-456'),
      expectedName: 'WorkflowExecutionNotFoundError',
      expectedMessage: 'Workflow execution with id "exec-456" not found.',
    },
    {
      create: () => new WorkflowExecutionInvalidStatusError('exec-1', 'running', 'pending'),
      expectedName: 'WorkflowExecutionInvalidStatusError',
      expectedMessage: 'Workflow execution "exec-1" is in status "running" but expected "pending".',
    },
    {
      create: () => new WorkflowDisabledError('wf-123'),
      expectedName: 'WorkflowDisabledError',
      expectedMessage: 'Workflow is disabled: wf-123. Enable the workflow to run it.',
    },
    {
      create: () => new WorkflowResumeNotAppliedError('exec-1', new Error('scheduling failed')),
      expectedName: 'WorkflowResumeNotAppliedError',
      expectedMessage: 'Workflow execution "exec-1" was not resumed: scheduling failed',
    },
  ])(
    '$expectedName sets name, message, and extends Error',
    ({ create, expectedName, expectedMessage }) => {
      const error = create();

      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe(expectedName);
      expect(error.message).toBe(expectedMessage);
    }
  );

  it.each([new WorkflowDisabledError('wf-123'), new WorkflowNotFoundError('wf-123')])(
    '%s is marked as a user error',
    (error) => {
      expect(error).toHaveProperty('isUserError', true);
    }
  );

  it('WorkflowResumeNotAppliedError keeps the original failure as its cause', () => {
    const cause = new Error('scheduling failed');

    expect(new WorkflowResumeNotAppliedError('exec-1', cause).cause).toBe(cause);
    expect(new WorkflowResumeNotAppliedError('exec-1', 'not an error').message).toBe(
      'Workflow execution "exec-1" was not resumed: not an error'
    );
  });
});
