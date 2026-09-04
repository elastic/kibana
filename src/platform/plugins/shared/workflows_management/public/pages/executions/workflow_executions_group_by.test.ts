/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { WorkflowExecutionListItemDto } from '@kbn/workflows';
import { ExecutionStatus } from '@kbn/workflows';
import { groupExecutions } from './workflow_executions_group_by';

const createExecution = (
  overrides: Partial<WorkflowExecutionListItemDto> = {}
): WorkflowExecutionListItemDto => ({
  spaceId: 'default',
  id: 'exec-1',
  status: ExecutionStatus.COMPLETED,
  isTestRun: false,
  startedAt: '2026-01-01T00:00:00Z',
  finishedAt: '2026-01-01T00:00:03Z',
  duration: 3000,
  error: null,
  ...overrides,
});

describe('groupExecutions', () => {
  it('returns an empty list for none', () => {
    expect(groupExecutions([createExecution()], 'none')).toEqual([]);
  });

  it('groups by workflow and sorts by count descending', () => {
    const groups = groupExecutions(
      [
        createExecution({ id: '1', workflowId: 'a', workflowName: 'Alpha' }),
        createExecution({ id: '2', workflowId: 'b', workflowName: 'Beta' }),
        createExecution({ id: '3', workflowId: 'a', workflowName: 'Alpha' }),
      ],
      'workflow'
    );

    expect(groups.map((group) => ({ key: group.key, count: group.executions.length }))).toEqual([
      { key: 'a', count: 2 },
      { key: 'b', count: 1 },
    ]);
  });

  it('groups by status', () => {
    const groups = groupExecutions(
      [
        createExecution({ id: '1', status: ExecutionStatus.COMPLETED }),
        createExecution({ id: '2', status: ExecutionStatus.FAILED }),
        createExecution({ id: '3', status: ExecutionStatus.COMPLETED }),
      ],
      'status'
    );

    expect(groups[0].key).toBe(ExecutionStatus.COMPLETED);
    expect(groups[0].executions).toHaveLength(2);
  });
});
