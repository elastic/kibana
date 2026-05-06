/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ExecutionStatus } from '@kbn/workflows';
import type {
  ConnectorStep,
  EsWorkflowExecution,
  EsWorkflowStepExecution,
  WorkflowYaml,
} from '@kbn/workflows';
import { WorkflowGraph } from '@kbn/workflows/graph';
import type { StepExecutionRepository } from '../../repositories/step_execution_repository';
import type { WorkflowExecutionRepository } from '../../repositories/workflow_execution_repository';
import { StepIoService } from '../step_io_service';
import { WorkflowExecutionState } from '../workflow_execution_state';

/**
 * Builds a state + service pair backed by jest-mock repositories. Returns
 * the service under test plus the state so suites can seed step docs via
 * the existing `upsertStep` API.
 */
function buildHarness(opts: { evictionMinBytes?: number } = {}) {
  const workflowExecutionRepository = {
    updateWorkflowExecution: jest.fn(),
  } as unknown as jest.Mocked<WorkflowExecutionRepository>;

  const stepExecutionRepository = {
    bulkUpsert: jest.fn().mockResolvedValue(undefined),
    getStepExecutionsByIds: jest.fn().mockResolvedValue([]),
  } as unknown as jest.Mocked<StepExecutionRepository>;

  const fakeWorkflowExecution = {
    id: 'test-workflow-execution-id',
    workflowId: 'test-workflow-id',
    status: ExecutionStatus.RUNNING,
    startedAt: '2025-08-05T20:00:00.000Z',
    isTestRun: false,
  } as EsWorkflowExecution;

  const state = new WorkflowExecutionState(
    fakeWorkflowExecution,
    workflowExecutionRepository,
    stepExecutionRepository
  );
  // The type requires scopeStack but tests construct via the standard `as`
  // cast — set an empty stack here so prepareForRead can read it.
  state.updateWorkflowExecution({ scopeStack: [] });
  const service = new StepIoService({
    stepRepository: stepExecutionRepository,
    state: state.ioStateAccessor,
    evictionMinBytes: opts.evictionMinBytes ?? Infinity,
  });
  state.setIoService(service);

  return { state, service, stepExecutionRepository, workflowExecutionRepository };
}

function createCompletedStep(
  state: WorkflowExecutionState,
  id: string,
  stepId: string,
  output: unknown,
  stepType?: string
): void {
  state.upsertStep({
    id,
    stepId,
    stepType,
    status: ExecutionStatus.COMPLETED,
    output,
  } as Partial<EsWorkflowStepExecution>);
}

describe('StepIoService', () => {
  const EVICTION_THRESHOLD = 100; // bytes

  describe('IO reads/writes', () => {
    it('returns step output via service when state owns the doc', () => {
      const { state, service } = buildHarness();
      createCompletedStep(state, 'step-1', 'myStep', { hello: 'world' }, 'connector');
      expect(service.getStepOutput('step-1')).toEqual({ hello: 'world' });
    });

    it('returns step input via service', () => {
      const { state, service } = buildHarness();
      state.upsertStep({
        id: 'step-1',
        stepId: 'myStep',
        input: { foo: 'bar' },
      } as Partial<EsWorkflowStepExecution>);
      expect(service.getStepInput('step-1')).toEqual({ foo: 'bar' });
    });

    it('writes step input through state.upsertStep', () => {
      const { state, service } = buildHarness();
      state.upsertStep({
        id: 'step-1',
        stepId: 'myStep',
        status: ExecutionStatus.RUNNING,
      } as Partial<EsWorkflowStepExecution>);
      service.setStepInput('step-1', { foo: 'bar' });
      expect(state.getStepExecution('step-1')?.input).toEqual({ foo: 'bar' });
    });

    it('completeStep writes output, status, finishedAt, executionTimeMs atomically', () => {
      const { state, service } = buildHarness();
      service.completeStep({
        id: 'step-1',
        output: { result: 'ok' },
        finishedAt: '2025-08-06T00:00:01.000Z',
        executionTimeMs: 1000,
      });
      const step = state.getStepExecution('step-1');
      expect(step).toEqual(
        expect.objectContaining({
          status: ExecutionStatus.COMPLETED,
          output: { result: 'ok' },
          finishedAt: '2025-08-06T00:00:01.000Z',
          executionTimeMs: 1000,
        })
      );
    });

    it('failStep writes status FAILED, output null, error, scopeStack', () => {
      const { state, service } = buildHarness();
      service.failStep({
        id: 'step-1',
        stepId: 'myStep',
        stepType: 'connector',
        error: { type: 'BadThing', message: 'boom' },
        finishedAt: '2025-08-06T00:00:01.000Z',
        executionTimeMs: 500,
        scopeStack: [],
      });
      const step = state.getStepExecution('step-1');
      expect(step).toEqual(
        expect.objectContaining({
          status: ExecutionStatus.FAILED,
          output: null,
          error: { type: 'BadThing', message: 'boom' },
          finishedAt: '2025-08-06T00:00:01.000Z',
          executionTimeMs: 500,
        })
      );
    });
  });

  describe('recordOutputSize', () => {
    it('stores size for later threshold check', () => {
      const { state, service } = buildHarness({ evictionMinBytes: EVICTION_THRESHOLD });
      createCompletedStep(state, 'step-1', 'myStep', { data: 'something' }, 'connector');
      service.recordOutputSize('step-1', 50);

      service.onStepsFlushed(['step-1']);
      service.onStepsFlushed([]);
      expect(service.hasEvictedOutputs()).toBe(false);

      createCompletedStep(state, 'step-2', 'myStep2', { data: 'large' }, 'connector');
      service.recordOutputSize('step-2', 200);

      service.onStepsFlushed(['step-2']);
      service.onStepsFlushed([]);
      expect(service.hasEvictedOutputs()).toBe(true);
      expect(state.getStepExecution('step-2')?.output).toBeUndefined();
    });

    it('ignores negative sizes (safeOutputSize -1 sentinel)', () => {
      const { service } = buildHarness();
      service.recordOutputSize('step-1', -1);
      expect(service.getOutputSizeStats()).toEqual({ totalBytes: 0, stepCount: 0 });
    });
  });

  describe('getOutputSizeStats', () => {
    it('returns zeros when nothing recorded', () => {
      const { service } = buildHarness();
      expect(service.getOutputSizeStats()).toEqual({ totalBytes: 0, stepCount: 0 });
    });

    it('sums sizes from non-evicted steps', () => {
      const { state, service } = buildHarness();
      createCompletedStep(state, 'step-1', 's1', { data: 'a' }, 'connector');
      createCompletedStep(state, 'step-2', 's2', { data: 'b' }, 'connector');
      service.recordOutputSize('step-1', 100);
      service.recordOutputSize('step-2', 200);

      expect(service.getOutputSizeStats()).toEqual({ totalBytes: 300, stepCount: 2 });
    });

    it('combines sizes from active and evicted steps', () => {
      const { state, service } = buildHarness({ evictionMinBytes: EVICTION_THRESHOLD });
      createCompletedStep(state, 'step-1', 's1', { data: 'a' }, 'connector');
      createCompletedStep(state, 'step-2', 's2', { data: 'b' }, 'connector');
      service.recordOutputSize('step-1', 150);
      service.recordOutputSize('step-2', 250);

      // Drive step-2 through the deferral cycle so it ends up evicted.
      service.onStepsFlushed(['step-2']);
      service.onStepsFlushed([]);

      const stats = service.getOutputSizeStats();
      expect(stats.totalBytes).toBe(400);
      expect(stats.stepCount).toBe(2);
    });
  });

  describe('hasEvictedOutputs', () => {
    it('returns false when nothing is evicted', () => {
      const { service } = buildHarness();
      expect(service.hasEvictedOutputs()).toBe(false);
    });

    it('returns true after eviction', () => {
      const { state, service } = buildHarness({ evictionMinBytes: EVICTION_THRESHOLD });
      createCompletedStep(state, 'step-1', 'myStep', { data: 'large' }, 'connector');
      service.recordOutputSize('step-1', 250);

      service.onStepsFlushed(['step-1']);
      service.onStepsFlushed([]);

      expect(service.hasEvictedOutputs()).toBe(true);
    });
  });

  describe('eviction policy', () => {
    it('evicts output above threshold from completed step', () => {
      const { state, service } = buildHarness({ evictionMinBytes: EVICTION_THRESHOLD });
      createCompletedStep(state, 'step-1', 'myStep', { largeData: 'x'.repeat(200) }, 'connector');
      service.recordOutputSize('step-1', 250);

      service.onStepsFlushed(['step-1']);
      service.onStepsFlushed([]);

      expect(state.getStepExecution('step-1')?.output).toBeUndefined();
      expect(service.hasEvictedOutputs()).toBe(true);
    });

    it('evicts output exactly at threshold (minPayloadSize is inclusive)', () => {
      const { state, service } = buildHarness({ evictionMinBytes: EVICTION_THRESHOLD });
      createCompletedStep(state, 'step-1', 'myStep', { data: 'at-boundary' }, 'connector');
      service.recordOutputSize('step-1', EVICTION_THRESHOLD);

      service.onStepsFlushed(['step-1']);
      service.onStepsFlushed([]);

      expect(state.getStepExecution('step-1')?.output).toBeUndefined();
      expect(service.hasEvictedOutputs()).toBe(true);
    });

    it('retains output below threshold', () => {
      const { state, service } = buildHarness({ evictionMinBytes: EVICTION_THRESHOLD });
      const smallOutput = { key: 'val' };
      createCompletedStep(state, 'step-1', 'myStep', smallOutput, 'connector');
      service.recordOutputSize('step-1', 10);

      service.onStepsFlushed(['step-1']);
      service.onStepsFlushed([]);

      expect(state.getStepExecution('step-1')?.output).toEqual(smallOutput);
      expect(service.hasEvictedOutputs()).toBe(false);
    });

    it('retains output from running steps', () => {
      const { state, service } = buildHarness({ evictionMinBytes: EVICTION_THRESHOLD });
      state.upsertStep({
        id: 'step-1',
        stepId: 'myStep',
        stepType: 'connector',
        status: ExecutionStatus.RUNNING,
        output: { data: 'x'.repeat(200) },
      } as Partial<EsWorkflowStepExecution>);
      service.recordOutputSize('step-1', 250);

      service.onStepsFlushed(['step-1']);
      service.onStepsFlushed([]);

      expect(state.getStepExecution('step-1')?.output).toBeDefined();
      expect(service.hasEvictedOutputs()).toBe(false);
    });

    it('retains output from data.set steps regardless of size (pinned)', () => {
      const { state, service } = buildHarness({ evictionMinBytes: EVICTION_THRESHOLD });
      createCompletedStep(state, 'step-1', 'myDataSet', { largeData: 'x'.repeat(200) }, 'data.set');
      service.recordOutputSize('step-1', 250);

      service.onStepsFlushed(['step-1']);
      service.onStepsFlushed([]);

      expect(state.getStepExecution('step-1')?.output).toBeDefined();
      expect(service.hasEvictedOutputs()).toBe(false);
    });

    it('retains output from waitForInput steps regardless of size (pinned)', () => {
      const { state, service } = buildHarness({ evictionMinBytes: EVICTION_THRESHOLD });
      createCompletedStep(state, 'step-1', 'wait', { answer: 'x'.repeat(200) }, 'waitForInput');
      service.recordOutputSize('step-1', 250);

      service.onStepsFlushed(['step-1']);
      service.onStepsFlushed([]);

      expect(state.getStepExecution('step-1')?.output).toBeDefined();
    });

    it('skips steps with no recorded size (assumes small)', () => {
      const { state, service } = buildHarness({ evictionMinBytes: EVICTION_THRESHOLD });
      createCompletedStep(state, 'step-1', 'myStep', { data: 'something' }, 'connector');
      // No recordOutputSize call

      service.onStepsFlushed(['step-1']);
      service.onStepsFlushed([]);

      expect(state.getStepExecution('step-1')?.output).toBeDefined();
      expect(service.hasEvictedOutputs()).toBe(false);
    });

    it('does not evict failed steps (output: null is semantic)', () => {
      const { state, service } = buildHarness({ evictionMinBytes: EVICTION_THRESHOLD });
      state.upsertStep({
        id: 'step-1',
        stepId: 'myStep',
        stepType: 'connector',
        status: ExecutionStatus.FAILED,
        output: null,
      } as Partial<EsWorkflowStepExecution>);
      service.recordOutputSize('step-1', 250);

      service.onStepsFlushed(['step-1']);
      service.onStepsFlushed([]);

      expect(state.getStepExecution('step-1')?.output).toBeNull();
      expect(service.hasEvictedOutputs()).toBe(false);
    });

    it('does not add to stepDocumentsChanges when evicting', async () => {
      const { state, service, stepExecutionRepository } = buildHarness({
        evictionMinBytes: EVICTION_THRESHOLD,
      });
      createCompletedStep(state, 'step-1', 'myStep', { data: 'x'.repeat(200) }, 'connector');
      service.recordOutputSize('step-1', 250);

      // Cycle 1: persists + queues for eviction.
      await state.flushStepChanges();
      jest.clearAllMocks();

      // Cycle 2: drains eviction; no new doc change should be sent.
      await state.flushStepChanges();
      expect(stepExecutionRepository.bulkUpsert).not.toHaveBeenCalled();
    });
  });

  describe('rehydrateOutputs', () => {
    it('calls repository and restores output', async () => {
      const { state, service, stepExecutionRepository } = buildHarness({
        evictionMinBytes: EVICTION_THRESHOLD,
      });
      const originalOutput = { restored: true, data: 'x'.repeat(200) };
      createCompletedStep(state, 'step-1', 'myStep', originalOutput, 'connector');
      service.recordOutputSize('step-1', 250);

      service.onStepsFlushed(['step-1']);
      service.onStepsFlushed([]);
      expect(state.getStepExecution('step-1')?.output).toBeUndefined();

      stepExecutionRepository.getStepExecutionsByIds.mockResolvedValue([
        {
          id: 'step-1',
          stepId: 'myStep',
          output: originalOutput,
        } as unknown as EsWorkflowStepExecution,
      ]);

      await service.rehydrateOutputs(['step-1']);

      expect(state.getStepExecution('step-1')?.output).toEqual(originalOutput);
      expect(service.hasEvictedOutputs()).toBe(false);
      expect(stepExecutionRepository.getStepExecutionsByIds).toHaveBeenCalledWith(
        ['step-1'],
        ['id', 'output']
      );
    });

    it('is a no-op when no requested IDs are evicted', async () => {
      const { state, service, stepExecutionRepository } = buildHarness();
      createCompletedStep(state, 'step-1', 'myStep', { data: 'small' }, 'connector');

      await service.rehydrateOutputs(['step-1']);

      expect(stepExecutionRepository.getStepExecutionsByIds).not.toHaveBeenCalled();
    });

    it('handles missing documents from ES gracefully', async () => {
      const { state, service, stepExecutionRepository } = buildHarness({
        evictionMinBytes: EVICTION_THRESHOLD,
      });
      createCompletedStep(state, 'step-1', 'myStep', { data: 'large' }, 'connector');
      service.recordOutputSize('step-1', 250);
      service.onStepsFlushed(['step-1']);
      service.onStepsFlushed([]);

      stepExecutionRepository.getStepExecutionsByIds.mockResolvedValue([]);

      await service.rehydrateOutputs(['step-1']);

      expect(service.hasEvictedOutputs()).toBe(false);
      expect(state.getStepExecution('step-1')?.output).toBeUndefined();
    });
  });

  describe('deferred output eviction via flushStepChanges', () => {
    it('does NOT evict output on the flush that persists it', async () => {
      const { state, service } = buildHarness({ evictionMinBytes: EVICTION_THRESHOLD });
      createCompletedStep(state, 'step-1', 'myStep', { data: 'x'.repeat(200) }, 'connector');
      service.recordOutputSize('step-1', 250);

      await state.flushStepChanges();

      expect(state.getStepExecution('step-1')?.output).toBeDefined();
      expect(service.hasEvictedOutputs()).toBe(false);
    });

    it('evicts output on the second flush', async () => {
      const { state, service } = buildHarness({ evictionMinBytes: EVICTION_THRESHOLD });
      createCompletedStep(state, 'step-1', 'myStep', { data: 'x'.repeat(200) }, 'connector');
      service.recordOutputSize('step-1', 250);

      await state.flushStepChanges();
      await state.flushStepChanges();

      expect(state.getStepExecution('step-1')?.output).toBeUndefined();
      expect(service.hasEvictedOutputs()).toBe(true);
    });

    it('does not evict small outputs even after two flushes', async () => {
      const { state, service } = buildHarness({ evictionMinBytes: EVICTION_THRESHOLD });
      const smallOutput = { key: 'val' };
      createCompletedStep(state, 'step-1', 'myStep', smallOutput, 'connector');
      service.recordOutputSize('step-1', 10);

      await state.flushStepChanges();
      await state.flushStepChanges();

      expect(state.getStepExecution('step-1')?.output).toEqual(smallOutput);
      expect(service.hasEvictedOutputs()).toBe(false);
    });

    it('evicts previous batch and queues new batch on successive flushes', async () => {
      const { state, service } = buildHarness({ evictionMinBytes: EVICTION_THRESHOLD });
      createCompletedStep(state, 'step-a', 'sA', { data: 'a'.repeat(200) }, 'connector');
      service.recordOutputSize('step-a', 250);
      await state.flushStepChanges();

      createCompletedStep(state, 'step-b', 'sB', { data: 'b'.repeat(200) }, 'connector');
      service.recordOutputSize('step-b', 300);
      await state.flushStepChanges();

      expect(state.getStepExecution('step-a')?.output).toBeUndefined();
      expect(state.getStepExecution('step-b')?.output).toBeDefined();

      await state.flushStepChanges();
      expect(state.getStepExecution('step-b')?.output).toBeUndefined();
    });

    it('processes pending eviction on empty flush (no new changes)', async () => {
      const { state, service } = buildHarness({ evictionMinBytes: EVICTION_THRESHOLD });
      createCompletedStep(state, 'step-1', 'myStep', { data: 'x'.repeat(200) }, 'connector');
      service.recordOutputSize('step-1', 250);

      await state.flushStepChanges();
      expect(state.getStepExecution('step-1')?.output).toBeDefined();

      await state.flushStepChanges();
      expect(state.getStepExecution('step-1')?.output).toBeUndefined();
      expect(service.hasEvictedOutputs()).toBe(true);
    });

    it('does not evict data.set outputs even after deferral', async () => {
      const { state, service } = buildHarness({ evictionMinBytes: EVICTION_THRESHOLD });
      createCompletedStep(state, 'step-1', 'myDataSet', { largeData: 'x'.repeat(200) }, 'data.set');
      service.recordOutputSize('step-1', 250);

      await state.flushStepChanges();
      await state.flushStepChanges();

      expect(state.getStepExecution('step-1')?.output).toBeDefined();
      expect(service.hasEvictedOutputs()).toBe(false);
    });
  });

  describe('input eviction', () => {
    it('evicts input from completed step after flush', async () => {
      const { state } = buildHarness();
      state.upsertStep({
        id: 'step-1',
        stepId: 'myStep',
        stepType: 'connector',
        status: ExecutionStatus.COMPLETED,
        input: { message: 'hello' },
        output: { result: 'ok' },
      } as Partial<EsWorkflowStepExecution>);

      await state.flushStepChanges();

      expect(state.getStepExecution('step-1')?.input).toBeUndefined();
    });

    it('evicts input from failed step after flush', async () => {
      const { state } = buildHarness();
      state.upsertStep({
        id: 'step-1',
        stepId: 'myStep',
        stepType: 'connector',
        status: ExecutionStatus.FAILED,
        input: { message: 'hello' },
        output: null,
      } as Partial<EsWorkflowStepExecution>);

      await state.flushStepChanges();

      expect(state.getStepExecution('step-1')?.input).toBeUndefined();
    });

    it('does NOT evict input from running step after flush', async () => {
      const { state } = buildHarness();
      const input = { foreach: '{{steps.data.output}}' };
      state.upsertStep({
        id: 'step-1',
        stepId: 'loopStep',
        stepType: 'foreach',
        status: ExecutionStatus.RUNNING,
        input,
      } as Partial<EsWorkflowStepExecution>);

      await state.flushStepChanges();

      expect(state.getStepExecution('step-1')?.input).toEqual(input);
    });

    it('does NOT evict input from waiting step after flush', async () => {
      const { state } = buildHarness();
      const input = { duration: '20m' };
      state.upsertStep({
        id: 'step-1',
        stepId: 'waitStep',
        stepType: 'wait',
        status: ExecutionStatus.WAITING,
        input,
      } as Partial<EsWorkflowStepExecution>);

      await state.flushStepChanges();

      expect(state.getStepExecution('step-1')?.input).toEqual(input);
    });

    it('does not cause stepDocumentsChanges on subsequent flush after input eviction', async () => {
      const { state, stepExecutionRepository } = buildHarness();
      state.upsertStep({
        id: 'step-1',
        stepId: 'myStep',
        stepType: 'connector',
        status: ExecutionStatus.COMPLETED,
        input: { message: 'hello' },
      } as Partial<EsWorkflowStepExecution>);

      await state.flushStepChanges();
      jest.clearAllMocks();

      await state.flushStepChanges();
      expect(stepExecutionRepository.bulkUpsert).not.toHaveBeenCalled();
    });

    it('evicts input immediately and output on the next flush', async () => {
      const { state, service } = buildHarness({ evictionMinBytes: EVICTION_THRESHOLD });
      state.upsertStep({
        id: 'step-1',
        stepId: 'myStep',
        stepType: 'connector',
        status: ExecutionStatus.COMPLETED,
        input: { message: 'hello' },
        output: { data: 'x'.repeat(200) },
      } as Partial<EsWorkflowStepExecution>);
      service.recordOutputSize('step-1', 250);

      await state.flushStepChanges();
      expect(state.getStepExecution('step-1')?.input).toBeUndefined();
      expect(state.getStepExecution('step-1')?.output).toBeDefined();

      await state.flushStepChanges();
      expect(state.getStepExecution('step-1')?.output).toBeUndefined();
      expect(service.hasEvictedOutputs()).toBe(true);
    });
  });

  describe('interaction with evictStaleLoopOutputs', () => {
    it('handles both eviction systems acting on the same step', async () => {
      const { state, service, stepExecutionRepository } = buildHarness({
        evictionMinBytes: EVICTION_THRESHOLD,
      });
      state.upsertStep({
        id: 'iter-1',
        stepId: 'loopStep',
        stepType: 'connector',
        status: ExecutionStatus.COMPLETED,
        output: { data: 'x'.repeat(200) },
      } as Partial<EsWorkflowStepExecution>);
      service.recordOutputSize('iter-1', 250);

      state.upsertStep({
        id: 'iter-2',
        stepId: 'loopStep',
        stepType: 'connector',
        status: ExecutionStatus.COMPLETED,
        output: { data: 'y'.repeat(200) },
      } as Partial<EsWorkflowStepExecution>);
      service.recordOutputSize('iter-2', 250);

      // Stale-loop eviction nullifies iter-1 (non-latest).
      state.evictStaleLoopOutputs(['loopStep']);
      expect(state.getStepExecution('iter-1')?.output).toBeUndefined();
      expect(state.getStepExecution('iter-2')?.output).toBeDefined();

      // Run the deferral cycle on both — iter-1 won't be added to evicted set
      // (output already undefined), iter-2 will.
      service.onStepsFlushed(['iter-1', 'iter-2']);
      service.onStepsFlushed([]);
      expect(service.hasEvictedOutputs()).toBe(true);
      expect(state.getStepExecution('iter-2')?.output).toBeUndefined();

      // iter-2 can be rehydrated from ES.
      stepExecutionRepository.getStepExecutionsByIds.mockResolvedValue([
        { id: 'iter-2', output: { data: 'y'.repeat(200) } } as unknown as EsWorkflowStepExecution,
      ]);
      await service.rehydrateOutputs(['iter-2']);
      expect(state.getStepExecution('iter-2')?.output).toBeDefined();
    });
  });

  describe('onLoad (resume-time deferred outputs)', () => {
    it('marks non-pinned step outputs as deferred', () => {
      const { service } = buildHarness();
      service.onLoad([
        {
          id: '11',
          stepId: 'connectorStep',
          stepType: 'connector',
          status: ExecutionStatus.COMPLETED,
        } as EsWorkflowStepExecution,
      ]);
      expect(service.hasEvictedOutputs()).toBe(true);
    });

    it('returns pinned IDs for eager output fetch (data.set)', () => {
      const { service } = buildHarness();
      const result = service.onLoad([
        {
          id: '11',
          stepId: 'setVar',
          stepType: 'data.set',
          status: ExecutionStatus.COMPLETED,
        } as EsWorkflowStepExecution,
      ]);
      expect(result.pinnedIdsToFetch).toEqual(['11']);
      expect(service.hasEvictedOutputs()).toBe(false);
    });

    it('returns pinned IDs for waitForInput as well', () => {
      const { service } = buildHarness();
      const result = service.onLoad([
        {
          id: '11',
          stepId: 'wait',
          stepType: 'waitForInput',
          status: ExecutionStatus.COMPLETED,
        } as EsWorkflowStepExecution,
      ]);
      expect(result.pinnedIdsToFetch).toEqual(['11']);
      expect(service.hasEvictedOutputs()).toBe(false);
    });

    it('treats undefined stepType as non-pinned', () => {
      const { service } = buildHarness();
      service.onLoad([
        {
          id: '11',
          stepId: 'legacyStep',
          status: ExecutionStatus.COMPLETED,
        } as EsWorkflowStepExecution,
      ]);
      expect(service.hasEvictedOutputs()).toBe(true);
    });
  });

  describe('prepareForRead', () => {
    function buildGraphWorkflow() {
      const workflow: WorkflowYaml = {
        name: 'Targeted',
        version: '1',
        description: 'test',
        enabled: true,
        triggers: [],
        steps: [
          { name: 'step_a', type: 'console', with: { message: 'A' } } as ConnectorStep,
          {
            name: 'step_b',
            type: 'console',
            with: { message: '{{steps.step_a.output}}' },
          } as ConnectorStep,
          {
            name: 'step_c',
            type: 'console',
            with: { message: '{{steps.step_b.output}}' },
          } as ConnectorStep,
        ],
      };
      const graph = WorkflowGraph.fromWorkflowDefinition(workflow);
      const stepCNode = graph.topologicalOrder
        .map((nodeId) => graph.getNode(nodeId))
        .find((n) => n.stepId === 'step_c')!;
      return { graph, stepCNode };
    }

    it('is a no-op when nothing is evicted', async () => {
      const { service, stepExecutionRepository } = buildHarness();
      const { graph, stepCNode } = buildGraphWorkflow();
      await service.prepareForRead({
        node: stepCNode,
        predecessorsResolver: (n) => graph.getAllPredecessors(n.id),
      });
      expect(stepExecutionRepository.getStepExecutionsByIds).not.toHaveBeenCalled();
    });

    it('rehydrates only the step IDs referenced in template expressions', async () => {
      const { state, service, stepExecutionRepository } = buildHarness();
      const { graph, stepCNode } = buildGraphWorkflow();

      // Seed two completed predecessors and mark them as evicted.
      createCompletedStep(state, 'exec-a', 'step_a', { v: 'a' }, 'connector');
      createCompletedStep(state, 'exec-b', 'step_b', { v: 'b' }, 'connector');
      service.onLoad([state.getStepExecution('exec-a')!, state.getStepExecution('exec-b')!]);
      expect(service.hasEvictedOutputs()).toBe(true);

      stepExecutionRepository.getStepExecutionsByIds.mockResolvedValue([
        { id: 'exec-b', output: { v: 'b' } } as unknown as EsWorkflowStepExecution,
      ]);

      await service.prepareForRead({
        node: stepCNode,
        predecessorsResolver: (n) => graph.getAllPredecessors(n.id),
      });

      // Only step_b is referenced by step_c — exec-a should not be rehydrated.
      expect(stepExecutionRepository.getStepExecutionsByIds).toHaveBeenCalledWith(
        ['exec-b'],
        ['id', 'output']
      );
    });

    it('falls back to all predecessors when dynamic access is detected', async () => {
      const dynamicWorkflow: WorkflowYaml = {
        name: 'Dynamic Access',
        version: '1',
        description: 'test',
        enabled: true,
        triggers: [],
        steps: [
          { name: 'step_a', type: 'console', with: { message: 'A' } } as ConnectorStep,
          {
            name: 'step_b',
            type: 'console',
            with: { message: '{{steps[variables.name].output}}' },
          } as ConnectorStep,
        ],
      };
      const graph = WorkflowGraph.fromWorkflowDefinition(dynamicWorkflow);
      const stepBNode = graph.topologicalOrder
        .map((nodeId) => graph.getNode(nodeId))
        .find((n) => n.stepId === 'step_b')!;

      const { state, service, stepExecutionRepository } = buildHarness();
      createCompletedStep(state, 'exec-a', 'step_a', { v: 'a' }, 'connector');
      service.onLoad([state.getStepExecution('exec-a')!]);

      stepExecutionRepository.getStepExecutionsByIds.mockResolvedValue([
        { id: 'exec-a', output: { v: 'a' } } as unknown as EsWorkflowStepExecution,
      ]);

      await service.prepareForRead({
        node: stepBNode,
        predecessorsResolver: (n) => graph.getAllPredecessors(n.id),
      });

      expect(stepExecutionRepository.getStepExecutionsByIds).toHaveBeenCalledWith(
        ['exec-a'],
        ['id', 'output']
      );
    });
  });
});
