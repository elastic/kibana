/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import type { EsWorkflowExecution } from '@kbn/workflows';
import { ExecutionStatus } from '@kbn/workflows';

import { resolveInterruptedWorkflowRunTask, shouldFailOnWorkflowRunRetry } from './task_recovery';
import { WorkflowExecutionRepository } from '../repositories/workflow_execution_repository';

describe('shouldFailOnWorkflowRunRetry', () => {
  const base = (status: ExecutionStatus): EsWorkflowExecution =>
    ({
      id: 'e1',
      spaceId: 'default',
      workflowId: 'w1',
      status,
    } as EsWorkflowExecution);

  it('returns false when taskAttempts is 1', () => {
    expect(shouldFailOnWorkflowRunRetry(base(ExecutionStatus.RUNNING), 1)).toBe(false);
  });

  it('returns false when execution is null', () => {
    expect(shouldFailOnWorkflowRunRetry(null, 2)).toBe(false);
  });

  it('returns false when terminal', () => {
    expect(shouldFailOnWorkflowRunRetry(base(ExecutionStatus.FAILED), 2)).toBe(false);
    expect(shouldFailOnWorkflowRunRetry(base(ExecutionStatus.COMPLETED), 2)).toBe(false);
  });

  it('returns false for waiting_for_input', () => {
    expect(shouldFailOnWorkflowRunRetry(base(ExecutionStatus.WAITING_FOR_INPUT), 2)).toBe(false);
  });

  it('returns true for running on retry', () => {
    expect(shouldFailOnWorkflowRunRetry(base(ExecutionStatus.RUNNING), 2)).toBe(true);
  });
});

describe('resolveInterruptedWorkflowRunTask', () => {
  let esClient: ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>;
  let repository: WorkflowExecutionRepository;
  const logger = loggingSystemMock.create().get();

  beforeEach(() => {
    esClient = elasticsearchServiceMock.createElasticsearchClient();
    repository = new WorkflowExecutionRepository(esClient);
  });

  it('returns run_workflow when attempts is 1', async () => {
    await expect(
      resolveInterruptedWorkflowRunTask({
        workflowExecutionRepository: repository,
        workflowRunId: 'x',
        spaceId: 'default',
        taskAttempts: 1,
        logger,
      })
    ).resolves.toBe('run_workflow');
    expect(esClient.get).not.toHaveBeenCalled();
  });

  it('marks failed and completes task when retrying a running execution', async () => {
    esClient.get.mockResolvedValue({
      _source: {
        id: 'x',
        spaceId: 'default',
        workflowId: 'w',
        status: ExecutionStatus.RUNNING,
      },
    } as any);

    await expect(
      resolveInterruptedWorkflowRunTask({
        workflowExecutionRepository: repository,
        workflowRunId: 'x',
        spaceId: 'default',
        taskAttempts: 2,
        logger,
      })
    ).resolves.toBe('task_complete');

    expect(esClient.update).toHaveBeenCalled();
  });
});
