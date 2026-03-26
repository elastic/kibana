/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { WorkflowNotFoundError } from './workflow_not_found_error';

describe('WorkflowNotFoundError', () => {
  it('includes workflowId in message', () => {
    const error = new WorkflowNotFoundError('wf-123');
    expect(error.message).toBe('Workflow with id "wf-123" not found.');
  });

  it('sets name to WorkflowNotFoundError', () => {
    const error = new WorkflowNotFoundError('wf-123');
    expect(error.name).toBe('WorkflowNotFoundError');
  });

  it('is an instance of Error', () => {
    const error = new WorkflowNotFoundError('wf-123');
    expect(error).toBeInstanceOf(Error);
  });

  it('handles special characters in workflowId', () => {
    const error = new WorkflowNotFoundError('wf-<script>alert(1)</script>');
    expect(error.message).toContain('wf-<script>alert(1)</script>');
  });
});
