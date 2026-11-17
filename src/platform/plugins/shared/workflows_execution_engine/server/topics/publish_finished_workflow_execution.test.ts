/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v 1".
 */

import { ExecutionStatus } from '@kbn/workflows';
import { publishFinishedWorkflowExecution } from './publish_finished_workflow_execution';
import { publishWorkflowExecutionFinished } from './publish_workflow_execution_finished';

jest.mock('./publish_workflow_execution_finished', () => ({
  publishWorkflowExecutionFinished: jest.fn().mockResolvedValue(undefined),
}));

describe('publishFinishedWorkflowExecution', () => {
  const execution = {
    id: 'exec-1',
    workflowId: 'wf-1',
    spaceId: 'default',
    status: ExecutionStatus.FAILED,
    finishedAt: '2026-01-01T00:00:00.000Z',
    isTestRun: false,
    triggeredBy: 'manual',
    duration: 40,
    error: { type: 'InputValidationError', message: 'bad' },
  };

  beforeEach(() => {
    jest.mocked(publishWorkflowExecutionFinished).mockClear();
  });

  it('publishes the terminal execution fields', async () => {
    await publishFinishedWorkflowExecution(execution);

    expect(publishWorkflowExecutionFinished).toHaveBeenCalledWith({
      executionId: 'exec-1',
      workflowId: 'wf-1',
      spaceId: 'default',
      status: 'failed',
      finishedAt: '2026-01-01T00:00:00.000Z',
      isTestRun: false,
      triggeredBy: 'manual',
      durationMs: 40,
      errorType: 'InputValidationError',
    });
  });

  it('merges a write over the previous document', async () => {
    await publishFinishedWorkflowExecution(
      { ...execution, status: ExecutionStatus.PENDING, finishedAt: undefined, error: null },
      {
        status: ExecutionStatus.SKIPPED,
        cancelledAt: '2026-01-02T00:00:00.000Z',
        cancellationReason: 'Queue full',
      }
    );

    expect(publishWorkflowExecutionFinished).toHaveBeenCalledWith({
      executionId: 'exec-1',
      workflowId: 'wf-1',
      spaceId: 'default',
      status: 'skipped',
      finishedAt: '2026-01-02T00:00:00.000Z',
      isTestRun: false,
      triggeredBy: 'manual',
      durationMs: 40,
    });
  });

  it('uses cancelledAt when the write did not stamp finishedAt', async () => {
    await publishFinishedWorkflowExecution({
      ...execution,
      status: ExecutionStatus.SKIPPED,
      finishedAt: undefined,
      cancelledAt: '2026-01-02T00:00:00.000Z',
      error: null,
      duration: undefined,
    });

    expect(publishWorkflowExecutionFinished).toHaveBeenCalledWith({
      executionId: 'exec-1',
      workflowId: 'wf-1',
      spaceId: 'default',
      status: 'skipped',
      finishedAt: '2026-01-02T00:00:00.000Z',
      isTestRun: false,
      triggeredBy: 'manual',
    });
  });

  it('does not publish a non-terminal execution, an already-terminal one, or an incomplete document', async () => {
    await publishFinishedWorkflowExecution({
      ...execution,
      status: ExecutionStatus.WAITING_FOR_INPUT,
    });
    await publishFinishedWorkflowExecution(execution, {
      status: ExecutionStatus.FAILED,
      finishedAt: '2026-01-03T00:00:00.000Z',
    });
    await publishFinishedWorkflowExecution(null);
    await publishFinishedWorkflowExecution({ ...execution, workflowId: undefined });
    await publishFinishedWorkflowExecution({ ...execution, isTestRun: undefined });

    expect(publishWorkflowExecutionFinished).not.toHaveBeenCalled();
  });
});
