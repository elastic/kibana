/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { errors } from '@elastic/elasticsearch';
import { loggerMock } from '@kbn/logging-mocks';
import type { EsWorkflowExecution, EsWorkflowStepExecution } from '@kbn/workflows';
import type { WorkflowsExecutionEnginePluginStart } from '@kbn/workflows-execution-engine/server';
import { workflowsExecutionEngineMock } from '@kbn/workflows-execution-engine/server/mocks';
import { getWorkflowExecution } from './get_workflow_execution';
import { WORKFLOW_EXECUTION_EMBEDDED_STEPS_MAX_COUNT } from '../../../common';

describe('getWorkflowExecution', () => {
  let workflowsExecutionEngine: jest.Mocked<WorkflowsExecutionEnginePluginStart>;
  let mockLogger: ReturnType<typeof loggerMock.create>;

  const baseExecution = {
    spaceId: 'default',
    workflowId: 'workflow-1',
    status: 'completed',
    billable: true,
    startedAt: '2024-01-01T00:00:00Z',
    stepExecutionIds: ['step-doc-1', 'step-doc-2'],
    workflowDefinition: { version: '1', name: 'test', enabled: true, triggers: [], steps: [] },
    concurrencyGroupKey: 'streams-ki-onboarding-my-stream',
    createdBy: 'creator',
  } as unknown as EsWorkflowExecution;

  const steps = [
    { stepId: 's1', status: 'completed' },
    { stepId: 's2', status: 'completed' },
  ] as EsWorkflowStepExecution[];

  const load = (overrides: Record<string, unknown> = {}) =>
    getWorkflowExecution({
      workflowsExecutionEngine,
      logger: mockLogger,
      workflowExecutionId: 'exec-1',
      spaceId: 'default',
      ...overrides,
    });

  beforeEach(() => {
    workflowsExecutionEngine = workflowsExecutionEngineMock.createStart();
    workflowsExecutionEngine.getWorkflowExecutionsById.mockReset();
    workflowsExecutionEngine.getStepExecutionsByIds.mockReset();
    workflowsExecutionEngine.searchSteps.mockReset();
    mockLogger = loggerMock.create();
    workflowsExecutionEngine.getWorkflowExecutionsById.mockResolvedValue([baseExecution]);
    workflowsExecutionEngine.getStepExecutionsByIds.mockResolvedValue(steps);
  });

  it('reads the execution and its steps by id', async () => {
    await load({ includeInput: false, includeOutput: true });

    expect(workflowsExecutionEngine.getWorkflowExecutionsById).toHaveBeenCalledWith({
      ids: ['exec-1'],
      spaceId: 'default',
    });
    expect(workflowsExecutionEngine.getStepExecutionsByIds).toHaveBeenCalledWith({
      ids: ['step-doc-1', 'step-doc-2'],
      spaceId: 'default',
      includeInput: false,
      includeOutput: true,
    });
    expect(workflowsExecutionEngine.searchSteps).not.toHaveBeenCalled();
  });

  it('drops step input and output unless they are requested', async () => {
    await load();

    expect(workflowsExecutionEngine.getStepExecutionsByIds).toHaveBeenCalledWith(
      expect.objectContaining({ includeInput: false, includeOutput: false })
    );
  });

  it('does not exclude step fields when both payloads are requested', async () => {
    await load({ includeInput: true, includeOutput: true });

    expect(workflowsExecutionEngine.getStepExecutionsByIds).toHaveBeenCalledWith(
      expect.objectContaining({ includeInput: true, includeOutput: true })
    );
  });

  it('searches legacy runs that have no step id list', async () => {
    workflowsExecutionEngine.getWorkflowExecutionsById.mockResolvedValue([
      { ...baseExecution, stepExecutionIds: undefined },
    ]);
    workflowsExecutionEngine.searchSteps.mockResolvedValue({ results: steps, total: 2 });

    const result = await load({ includeInput: true, includeOutput: false });

    expect(workflowsExecutionEngine.getStepExecutionsByIds).not.toHaveBeenCalled();
    expect(workflowsExecutionEngine.searchSteps).toHaveBeenCalledWith({
      executionId: 'exec-1',
      spaceId: 'default',
      size: WORKFLOW_EXECUTION_EMBEDDED_STEPS_MAX_COUNT,
      includeInput: true,
      includeOutput: false,
      sort: 'startedAt:asc',
    });
    expect(result?.stepExecutions).toEqual(steps);
  });

  it('caps the embedded step id list', async () => {
    const manyIds = Array.from(
      { length: WORKFLOW_EXECUTION_EMBEDDED_STEPS_MAX_COUNT + 1 },
      (_, index) => `s${index}`
    );
    workflowsExecutionEngine.getWorkflowExecutionsById.mockResolvedValue([
      { ...baseExecution, stepExecutionIds: manyIds },
    ]);

    await load();

    expect(workflowsExecutionEngine.getStepExecutionsByIds.mock.calls[0][0].ids).toHaveLength(
      WORKFLOW_EXECUTION_EMBEDDED_STEPS_MAX_COUNT
    );
  });

  it('skips steps when they are omitted', async () => {
    const result = await load({ omitStepExecutions: true });

    expect(workflowsExecutionEngine.getStepExecutionsByIds).not.toHaveBeenCalled();
    expect(workflowsExecutionEngine.searchSteps).not.toHaveBeenCalled();
    expect(result?.stepExecutions).toEqual([]);
  });

  it('returns null when the engine has no execution', async () => {
    workflowsExecutionEngine.getWorkflowExecutionsById.mockResolvedValue([]);

    await expect(load()).resolves.toBeNull();
    expect(workflowsExecutionEngine.getStepExecutionsByIds).not.toHaveBeenCalled();
  });

  it('maps the read into a workflow execution', async () => {
    const result = await load();

    expect(result?.id).toBe('exec-1');
    expect(result?.stepExecutions).toEqual(steps);
    expect(result?.concurrencyGroupKey).toBe('streams-ki-onboarding-my-stream');
    expect(result?.isTestRun).toBe(false);
    expect(result?.executedBy).toBe('creator');
    expect(result?.yaml).toContain('name: test');
    expect(result).not.toHaveProperty('billable');
    expect(result?.version).toBeUndefined();
  });

  it('keeps the stored yaml and workflow document version', async () => {
    workflowsExecutionEngine.getWorkflowExecutionsById.mockResolvedValue([
      {
        ...baseExecution,
        yaml: 'name: stored',
        version: 7,
        isTestRun: true,
        executedBy: 'runner',
      },
    ]);
    workflowsExecutionEngine.getStepExecutionsByIds.mockResolvedValue([]);

    const result = await load();

    expect(result?.yaml).toBe('name: stored');
    expect(result?.version).toBe(7);
    expect(result?.isTestRun).toBe(true);
    expect(result?.executedBy).toBe('runner');
  });

  it('returns an empty yaml when the definition cannot be stringified', async () => {
    workflowsExecutionEngine.getWorkflowExecutionsById.mockResolvedValue([
      { ...baseExecution, workflowDefinition: null } as unknown as EsWorkflowExecution,
    ]);
    workflowsExecutionEngine.getStepExecutionsByIds.mockResolvedValue([]);

    const result = await load();

    expect(result?.yaml).toBe('');
    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.stringContaining('Failed to stringify workflow definition')
    );
  });

  it('returns the execution with empty steps when the step payload is too large', async () => {
    workflowsExecutionEngine.getStepExecutionsByIds.mockRejectedValue(
      new errors.RequestAbortedError(
        'The content length (9000) is bigger than the maximum allowed buffer (42)'
      )
    );

    const result = await load();

    expect(result?.id).toBe('exec-1');
    expect(result?.stepExecutions).toEqual([]);
    expect(mockLogger.warn).toHaveBeenCalled();
    expect(mockLogger.error).not.toHaveBeenCalled();
  });

  it('logs a warn and rethrows when the execution document exceeds the response size', async () => {
    const sizeError = new errors.RequestAbortedError(
      'The content length (9000) is bigger than the maximum allowed buffer (42)'
    );
    workflowsExecutionEngine.getWorkflowExecutionsById.mockRejectedValue(sizeError);

    await expect(load()).rejects.toBe(sizeError);
    expect(mockLogger.warn).toHaveBeenCalledWith(
      'Workflow execution document exec-1 exceeded the maximum response size Kibana can process'
    );
  });
});
