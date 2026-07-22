/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { type EsWorkflowExecution, ExecutionStatus } from '@kbn/workflows';
import { InMemoryExecutionPersistence } from './execution_persistence';

describe('InMemoryExecutionPersistence', () => {
  const execution = {
    id: 'execution-1',
    spaceId: 'space-1',
    workflowId: 'workflow-1',
    isTestRun: false,
    status: ExecutionStatus.PENDING,
    context: {},
    workflowDefinition: {
      version: '1',
      name: 'Test workflow',
      enabled: true,
      triggers: [],
      steps: [],
    },
    yaml: '',
    scopeStack: [],
    createdAt: '2026-07-21T00:00:00.000Z',
    error: null,
    startedAt: '2026-07-21T00:00:00.000Z',
    finishedAt: '',
    cancelRequested: false,
    duration: 0,
  } satisfies EsWorkflowExecution;

  it('keeps workflow updates process-local', async () => {
    const persistence = new InMemoryExecutionPersistence(execution);
    await persistence.updateWorkflowExecution({
      id: execution.id,
      status: ExecutionStatus.RUNNING,
    });

    await expect(
      persistence.getWorkflowExecutionById(execution.id, execution.spaceId)
    ).resolves.toEqual(expect.objectContaining({ status: ExecutionStatus.RUNNING }));
    await expect(
      persistence.getWorkflowExecutionById(execution.id, 'another-space')
    ).resolves.toBeNull();
  });

<<<<<<< HEAD
  it('does not share state between execution-scoped instances', async () => {
    const first = new InMemoryExecutionPersistence(execution);
    const secondExecution = { ...execution, id: 'execution-2' };
    const second = new InMemoryExecutionPersistence(secondExecution);

    await first.updateWorkflowExecution({ status: ExecutionStatus.RUNNING });

    await expect(
      second.getWorkflowExecutionById(secondExecution.id, secondExecution.spaceId)
    ).resolves.toEqual(expect.objectContaining({ status: ExecutionStatus.PENDING }));
  });

=======
>>>>>>> b2c2244a48b2 ([Workflows] Add synchronous execution mode)
  it('merges step lifecycle and IO updates without an external repository', async () => {
    const persistence = new InMemoryExecutionPersistence(execution);
    await persistence.bulkUpsert([
      {
        id: 'step-1',
        spaceId: 'space-1',
        stepId: 'step-1',
        scopeStack: [],
        workflowRunId: execution.id,
        workflowId: execution.workflowId,
        status: ExecutionStatus.RUNNING,
        startedAt: '2026-07-21T00:00:00.000Z',
        topologicalIndex: 0,
        globalExecutionIndex: 0,
        stepExecutionIndex: 0,
      },
      { id: 'step-1', output: { content: 'result' } },
    ]);

    await expect(persistence.getStepExecutionsByIds(['step-1'])).resolves.toEqual([
      expect.objectContaining({
        id: 'step-1',
        status: ExecutionStatus.RUNNING,
        output: { content: 'result' },
      }),
    ]);
  });
});
