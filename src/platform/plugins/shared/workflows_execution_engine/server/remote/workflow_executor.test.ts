/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  type EsWorkflowExecution,
  type EsWorkflowStepExecution,
  ExecutionStatus,
} from '@kbn/workflows';
import type { WorkflowLogApi, WorkflowStepCatalogApi, WorkflowStorageApi } from './tokens';
import { WorkflowExecutor } from './workflow_executor';

const execution = {
  id: 'run-1',
  workflowId: 'wf-1',
  spaceId: 'default',
  isTestRun: false,
  status: ExecutionStatus.PENDING,
  startedAt: '2026-01-01T00:00:00.000Z',
  workflowDefinition: {
    name: 'anchor',
    steps: [{ name: 'graph', type: 'security.buildAlertEntityGraph', with: { alertId: 'a-1' } }],
  },
  context: { inputs: {} },
} as unknown as EsWorkflowExecution;

describe('WorkflowExecutor', () => {
  const storage: jest.Mocked<WorkflowStorageApi> = {
    getExecution: jest.fn<Promise<EsWorkflowExecution>, [string, string, string]>(
      async () => execution
    ),
    markRunning: jest.fn<Promise<void>, [string, string, string]>(async () => undefined),
    recordStep: jest.fn<Promise<void>, [string, EsWorkflowStepExecution]>(async () => undefined),
    complete: jest.fn<Promise<void>, [string, Parameters<WorkflowStorageApi['complete']>[1]]>(
      async () => undefined
    ),
    whereAmI: jest.fn(async () => ({ threadId: 1, isMainThread: true })),
  };
  const log: jest.Mocked<WorkflowLogApi> = { info: jest.fn() };
  const steps: jest.Mocked<WorkflowStepCatalogApi> = {
    supports: jest.fn<boolean, [string]>(() => true),
    run: jest.fn<
      Promise<unknown>,
      [string, string, unknown, Parameters<WorkflowStepCatalogApi['run']>[3]]
    >(async () => ({ output: { nodes: [] } })),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('dispatches rendered steps and stores a completed execution', async () => {
    const executor = new WorkflowExecutor(steps, storage, log);
    const result = await executor.run({
      scopeId: 'scope',
      workflowRunId: 'run-1',
      spaceId: 'default',
    });

    expect(result.status).toBe(ExecutionStatus.COMPLETED);
    expect(steps.run).toHaveBeenCalledWith(
      'security.buildAlertEntityGraph',
      'scope',
      expect.objectContaining({ with: { alertId: 'a-1' } }),
      expect.objectContaining({
        attribution: expect.objectContaining({ id: 'wf-1', runId: 'run-1' }),
      })
    );
    expect(storage.complete).toHaveBeenCalledWith(
      'scope',
      expect.objectContaining({ id: 'run-1', status: ExecutionStatus.COMPLETED })
    );
  });

  it('rejects nested steps instead of running them on the coordinator', async () => {
    storage.getExecution.mockResolvedValueOnce({
      ...execution,
      workflowDefinition: {
        name: 'nested',
        steps: [{ name: 'loop', type: 'foreach', foreach: '${{inputs.items}}' }],
      },
    } as unknown as EsWorkflowExecution);
    const executor = new WorkflowExecutor(steps, storage, log);

    await expect(
      executor.run({ scopeId: 'scope', workflowRunId: 'run-1', spaceId: 'default' })
    ).rejects.toThrow(/Unsupported remote step shape/);
    expect(steps.run).not.toHaveBeenCalled();
    expect(storage.markRunning).not.toHaveBeenCalled();
    expect(storage.complete).toHaveBeenCalledWith(
      'scope',
      expect.objectContaining({ status: ExecutionStatus.FAILED })
    );
  });

  it('rejects an unregistered step before running earlier steps', async () => {
    storage.getExecution.mockResolvedValueOnce({
      ...execution,
      workflowDefinition: {
        name: 'mixed',
        steps: [
          { name: 'graph', type: 'security.buildAlertEntityGraph' },
          { name: 'other', type: 'console' },
        ],
      },
    } as unknown as EsWorkflowExecution);
    steps.supports.mockImplementation((stepType: string) => stepType !== 'console');
    const executor = new WorkflowExecutor(steps, storage, log);

    await expect(
      executor.run({ scopeId: 'scope', workflowRunId: 'run-1', spaceId: 'default' })
    ).rejects.toThrow(/Unsupported remote step type "console"/);
    expect(steps.run).not.toHaveBeenCalled();
    expect(storage.markRunning).not.toHaveBeenCalled();
    expect(storage.recordStep).not.toHaveBeenCalled();
  });
});
