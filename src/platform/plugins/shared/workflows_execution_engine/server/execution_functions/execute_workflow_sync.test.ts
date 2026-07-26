/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { KibanaRequest } from '@kbn/core/server';
import { ExecutionStatus } from '@kbn/workflows';
import type { EsWorkflowExecution, WorkflowExecutionEngineModel } from '@kbn/workflows';
import { mockContextDependencies } from './__mock__/context_dependencies';
import { executeWorkflowSync } from './execute_workflow_sync';
import { runWorkflowSync } from './run_workflow_sync';
import { buildWorkflowExecutionDocument } from '../lib/build_workflow_execution_document';
import { getAuthenticatedUser } from '../lib/get_user';
import { validateWorkflowInputs } from '../lib/validate_workflow_inputs';

jest.mock('./run_workflow_sync');
jest.mock('../lib/build_workflow_execution_document');
jest.mock('../lib/get_user');
jest.mock('../lib/validate_workflow_inputs');
jest.mock('../repositories/execution_persistence', () => ({
  InMemoryExecutionPersistence: jest.fn().mockImplementation(() => ({})),
}));

const mockRunWorkflowSync = runWorkflowSync as jest.MockedFunction<typeof runWorkflowSync>;
const mockBuildWorkflowExecutionDocument = buildWorkflowExecutionDocument as jest.MockedFunction<
  typeof buildWorkflowExecutionDocument
>;
const mockValidateWorkflowInputs = validateWorkflowInputs as jest.MockedFunction<
  typeof validateWorkflowInputs
>;
const mockGetAuthenticatedUser = getAuthenticatedUser as jest.MockedFunction<
  typeof getAuthenticatedUser
>;

const baseWorkflowExecution = {
  id: 'exec-1',
  workflowId: 'wf-1',
  spaceId: 'default',
  triggeredBy: 'manual',
  workflowDefinition: { version: '1', name: 'Test', enabled: true, triggers: [], steps: [] },
  isTestRun: false,
  status: ExecutionStatus.PENDING,
  context: {},
  yaml: '',
  scopeStack: [],
  error: null,
  startedAt: '2026-01-01T00:00:00.000Z',
  createdAt: '2026-01-01T00:00:00.000Z',
  finishedAt: '',
  cancelRequested: false,
  duration: 0,
};

const completedExecution: EsWorkflowExecution = {
  ...baseWorkflowExecution,
  status: ExecutionStatus.COMPLETED,
  context: { output: { answer: 42 } },
};

describe('executeWorkflowSync', () => {
  const workflow = { id: 'wf-1', yaml: '', isEphemeral: false } as WorkflowExecutionEngineModel;
  const request = {} as KibanaRequest;
  const logger = { warn: jest.fn(), error: jest.fn(), debug: jest.fn() } as any;
  const getWorkflowsExecutionEngine = jest.fn().mockResolvedValue({});

  let dependencies: ReturnType<typeof mockContextDependencies> & {
    workflowRepository?: { isWorkflowEnabled: jest.Mock };
  };

  beforeEach(() => {
    jest.clearAllMocks();
    dependencies = mockContextDependencies();
    mockGetAuthenticatedUser.mockResolvedValue({ username: 'test-user' } as any);
    mockBuildWorkflowExecutionDocument.mockReturnValue(baseWorkflowExecution as any);
    mockValidateWorkflowInputs.mockResolvedValue(true);
    mockRunWorkflowSync.mockResolvedValue(completedExecution);
  });

  const invoke = (overrides?: Partial<Parameters<typeof executeWorkflowSync>[0]>) =>
    executeWorkflowSync({
      workflow,
      context: {},
      request,
      options: {},
      logger,
      dependencies: dependencies as any,
      getWorkflowsExecutionEngine,
      ...overrides,
    });

  describe('disabled workflow guard', () => {
    let isWorkflowEnabled: jest.Mock;

    beforeEach(() => {
      isWorkflowEnabled = jest.fn().mockResolvedValue(true);
      dependencies = { ...dependencies, workflowRepository: { isWorkflowEnabled } } as any;
    });

    it('throws when a non-ephemeral workflow is disabled', async () => {
      isWorkflowEnabled.mockResolvedValue(false);
      await expect(invoke()).rejects.toThrow('Workflow is disabled: wf-1');
      expect(mockRunWorkflowSync).not.toHaveBeenCalled();
    });

    it('skips the check when workflow.isEphemeral is true', async () => {
      const ephemeral = { ...workflow, isEphemeral: true } as WorkflowExecutionEngineModel;
      await invoke({ workflow: ephemeral });
      expect(isWorkflowEnabled).not.toHaveBeenCalled();
    });

    it('skips the check when workflowRepository is absent', async () => {
      delete dependencies.workflowRepository;
      await expect(invoke()).resolves.toBeDefined();
    });
  });

  describe('workflowDefinition guard', () => {
    it('throws when buildWorkflowExecutionDocument returns no workflowDefinition', async () => {
      mockBuildWorkflowExecutionDocument.mockReturnValue({
        ...baseWorkflowExecution,
        workflowDefinition: undefined,
      } as any);
      await expect(invoke()).rejects.toThrow(
        'Synchronous workflow execution requires a workflow definition'
      );
      expect(mockRunWorkflowSync).not.toHaveBeenCalled();
    });
  });

  describe('validateWorkflowInputs guard', () => {
    it('returns FAILED and does not call runWorkflowSync when inputs are invalid', async () => {
      mockValidateWorkflowInputs.mockResolvedValue(false);
      const result = await invoke();
      expect(result).toEqual({
        workflowExecutionId: 'exec-1',
        result: { status: ExecutionStatus.FAILED },
      });
      expect(mockRunWorkflowSync).not.toHaveBeenCalled();
    });
  });

  describe('output extraction', () => {
    it('returns no output field when context.output is undefined', async () => {
      mockRunWorkflowSync.mockResolvedValue({ ...completedExecution, context: {} });
      const result = await invoke();
      expect(result.result).not.toHaveProperty('output');
    });

    it('returns no output field when context.output is null', async () => {
      mockRunWorkflowSync.mockResolvedValue({
        ...completedExecution,
        context: { output: null },
      });
      const result = await invoke();
      expect(result.result).not.toHaveProperty('output');
    });

    it('returns output field when context.output is an object', async () => {
      const output = { answer: 42 };
      mockRunWorkflowSync.mockResolvedValue({
        ...completedExecution,
        context: { output },
      });
      const result = await invoke();
      expect(result.result?.output).toEqual(output);
    });

    it('throws when context.output is a non-object scalar', async () => {
      mockRunWorkflowSync.mockResolvedValue({
        ...completedExecution,
        context: { output: 'not-an-object' },
      });
      await expect(invoke()).rejects.toThrow('Synchronous workflow output must be an object');
    });
  });

  describe('abort signal', () => {
    it('removes abort listener after successful execution', async () => {
      const controller = new AbortController();
      const removeEventListener = jest.spyOn(controller.signal, 'removeEventListener');
      await invoke({ options: { abortSignal: controller.signal } });
      expect(removeEventListener).toHaveBeenCalledWith('abort', expect.any(Function));
    });

    it('removes abort listener even when runWorkflowSync throws', async () => {
      const controller = new AbortController();
      const removeEventListener = jest.spyOn(controller.signal, 'removeEventListener');
      mockRunWorkflowSync.mockRejectedValue(new Error('execution failed'));
      await expect(invoke({ options: { abortSignal: controller.signal } })).rejects.toThrow(
        'execution failed'
      );
      expect(removeEventListener).toHaveBeenCalledWith('abort', expect.any(Function));
    });

    it('aborts the internal controller immediately when signal is already aborted', async () => {
      const controller = new AbortController();
      controller.abort('pre-aborted');
      mockRunWorkflowSync.mockImplementation(async ({ abortController: ctrl }) => {
        expect(ctrl.signal.aborted).toBe(true);
        return completedExecution;
      });
      await invoke({ options: { abortSignal: controller.signal } });
      expect(mockRunWorkflowSync).toHaveBeenCalledTimes(1);
    });
  });

  describe('happy path', () => {
    it('returns workflowExecutionId and status from runWorkflowSync', async () => {
      const result = await invoke();
      expect(result).toEqual({
        workflowExecutionId: 'exec-1',
        result: { status: ExecutionStatus.COMPLETED, output: { answer: 42 } },
      });
    });

    it('calls getWorkflowsExecutionEngine and forwards the result to runWorkflowSync', async () => {
      const fakeEngine = { supportsSynchronousExecution: true as const };
      getWorkflowsExecutionEngine.mockResolvedValue(fakeEngine);
      await invoke();
      expect(getWorkflowsExecutionEngine).toHaveBeenCalledTimes(1);
      expect(mockRunWorkflowSync).toHaveBeenCalledWith(
        expect.objectContaining({ workflowsExecutionEngine: fakeEngine })
      );
    });

    it('overrides execution id when options.executionId is set', async () => {
      await invoke({ options: { executionId: 'custom-id' } });
      expect(mockRunWorkflowSync).toHaveBeenCalledWith(
        expect.objectContaining({
          workflowExecution: expect.objectContaining({ id: 'custom-id' }),
        })
      );
    });
  });
});
