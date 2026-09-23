/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ExecutionStatus, type WorkflowExecutionListItemDto } from '@kbn/workflows';
import { formatWorkflowExecutionsForCopy } from './format_workflow_executions_for_copy';

const createExecution = (
  id: string,
  overrides: Partial<WorkflowExecutionListItemDto> = {}
): WorkflowExecutionListItemDto => ({
  spaceId: 'default',
  id,
  workflowId: 'wf-1',
  status: ExecutionStatus.COMPLETED,
  isTestRun: false,
  startedAt: '2026-01-01T00:00:00Z',
  finishedAt: '2026-01-01T00:00:03Z',
  duration: 3000,
  error: null,
  ...overrides,
});

describe('formatWorkflowExecutionsForCopy', () => {
  it('pretty-prints a single execution object', () => {
    const execution = createExecution('exec-1', { workflowName: 'Test workflow' });

    expect(formatWorkflowExecutionsForCopy([execution])).toBe(JSON.stringify(execution, null, 2));
  });

  it('pretty-prints multiple executions as a JSON array', () => {
    const executions = [
      createExecution('exec-1'),
      createExecution('exec-2', { workflowId: 'wf-2' }),
    ];

    expect(formatWorkflowExecutionsForCopy(executions)).toBe(JSON.stringify(executions, null, 2));
  });
});
