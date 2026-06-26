/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Logger } from '@kbn/core/server';
import { loggerMock } from '@kbn/logging-mocks';
import type { JsonValue } from '@kbn/utility-types';
import { ExecutionStatus } from '@kbn/workflows';
import type {
  ConnectorStep,
  EsWorkflowExecution,
  EsWorkflowStepExecution,
  StackFrame,
  WorkflowYaml,
} from '@kbn/workflows';
import { WorkflowGraph } from '@kbn/workflows/graph';
import type { StepExecutionRepository } from '../../repositories/step_execution_repository';
import type { WorkflowExecutionRepository } from '../../repositories/workflow_execution_repository';
import { buildStepExecutionId } from '../../utils';
import type { CacheTier } from '../sqlite_cache/cache_tier';
import { StepIoService } from '../step_io_service';
import { WorkflowExecutionState } from '../workflow_execution_state';

/**
 * Builds a state + service pair backed by jest-mock repositories. Returns
 * the service under test plus the state so suites can seed step docs via
 * the existing `upsertStep` API.
 */
function buildHarness(opts: { cacheTier?: CacheTier; logger?: Logger } = {}) {
  const workflowExecutionRepository = {
    updateWorkflowExecution: jest.fn(),
  } as unknown as jest.Mocked<WorkflowExecutionRepository>;

  const stepExecutionRepository = {
    bulkUpsert: jest.fn().mockResolvedValue(undefined),
    // Default: flush-verification calls (sourceIncludes=['id']) return ID-matched stubs so the
    // diagnostic in flushStepChanges sees a successful write. Rehydration calls (wider projection)
    // return [] to simulate an ES miss — tests that need specific rehydration data override this.
    getStepExecutionsByIds: jest.fn().mockImplementation(
      (ids: string[], sourceIncludes?: string[]) =>
        sourceIncludes?.length === 1 && sourceIncludes[0] === 'id'
          ? Promise.resolve(ids.map((id) => ({ id }) as EsWorkflowStepExecution))
          : Promise.resolve([])
    ),
  } as unknown as jest.Mocked<StepExecutionRepository>;

  const fakeWorkflowExecution = {
    id: 'test-workflow-execution-id',
    workflowId: 'test-workflow-id',
    status: ExecutionStatus.RUNNING,
    startedAt: '2025-08-05T20:00:00.000Z',
    isTestRun: false,
  } as EsWorkflowExecution;

  const state = new WorkflowExecutionState(fakeWorkflowExecution, workflowExecutionRepository);
  // The type requires scopeStack but tests construct via the standard `as`
  // cast — set an empty stack here so prepareForRead can read it.
  state.updateWorkflowExecution({ scopeStack: [] });
  const service = new StepIoService({
    stepRepository: stepExecutionRepository,
    state,
    cacheTier: opts.cacheTier,
    logger: opts.logger,
  });

  return { state, service, stepExecutionRepository, workflowExecutionRepository };
}

/**
 * Convenience helper: seeds a COMPLETED step's metadata through state and
 * its output through the service. Mirrors the production split — state
 * owns lifecycle, service owns IO.
 */
function createCompletedStep(
  state: WorkflowExecutionState,
  service: StepIoService,
  id: string,
  stepId: string,
  output: JsonValue | null,
  stepType?: string
): void {
  state.upsertStep({
    id,
    stepId,
    stepType,
    status: ExecutionStatus.COMPLETED,
  });
  service.setStepOutput(id, output);
}

/**
 * Test helper that mirrors the production flow: state holds lifecycle
 * (status/stepId/stepType), the service holds IO (output + size). Use this
 * instead of `createCompletedStep + service.recordOutputSize(...)` so the
 * test seeds size through the supported `setStepOutput` API.
 */
function seedCompletedStepWithSize(
  state: WorkflowExecutionState,
  service: StepIoService,
  id: string,
  stepId: string,
  output: JsonValue | null,
  sizeBytes: number,
  stepType?: string
): void {
  state.upsertStep({
    id,
    stepId,
    stepType,
    status: ExecutionStatus.COMPLETED,
  } as Partial<EsWorkflowStepExecution>);
  service.setStepOutput(id, output, sizeBytes);
}

function makeSqliteLikeCacheTier(overrides?: Partial<CacheTier>): CacheTier {
  return {
    spills: true,
    put: jest.fn(),
    get: jest.fn().mockResolvedValue(new Map()),
    cleanup: jest.fn().mockResolvedValue(undefined),
    dispose: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  } as CacheTier;
}

describe('StepIoService', () => {
  describe('IO reads/writes', () => {
    it('returns step output via service when state owns the doc', () => {
      const { state, service } = buildHarness();
      createCompletedStep(state, service, 'step-1', 'myStep', { hello: 'world' }, 'connector');
      expect(service.getStepOutput('step-1')).toEqual({ hello: 'world' });
    });

    it('returns step input via service', () => {
      const { service } = buildHarness();
      service.setStepInput('step-1', { foo: 'bar' });
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
      expect(service.getStepInput('step-1')).toEqual({ foo: 'bar' });
    });

    it('returns step error via service when state holds the error', () => {
      const { state, service } = buildHarness();
      // The service no longer owns lifecycle metadata (status / error /
      // scopeStack) — that's the runtime's job now. The service still surfaces
      // the error through `getStepError` by reading current state.
      state.upsertStep({
        id: 'step-1',
        stepId: 'myStep',
        stepType: 'connector',
        status: ExecutionStatus.FAILED,
        error: { type: 'BadThing', message: 'boom' },
      } as Partial<EsWorkflowStepExecution>);
      expect(service.getStepError('step-1')).toEqual({ type: 'BadThing', message: 'boom' });
    });

    it('returns undefined for unknown step error', () => {
      const { service } = buildHarness();
      expect(service.getStepError('does-not-exist')).toBeUndefined();
    });

    it('getLatestStepIO returns input/output/error for the latest execution by stepId', () => {
      const { state, service } = buildHarness();
      state.upsertStep({
        id: 'exec-1',
        stepId: 'loopStep',
        stepType: 'connector',
        status: ExecutionStatus.COMPLETED,
      });
      service.setStepInput('exec-1', { i: 1 });
      service.setStepOutput('exec-1', { o: 'first' });
      state.upsertStep({
        id: 'exec-2',
        stepId: 'loopStep',
        stepType: 'connector',
        status: ExecutionStatus.COMPLETED,
      });
      service.setStepInput('exec-2', { i: 2 });
      service.setStepOutput('exec-2', { o: 'second' });

      expect(service.getLatestStepIO('loopStep')).toEqual({
        input: { i: 2 },
        output: { o: 'second' },
        error: undefined,
      });
    });

    it('getLatestStepIO returns undefined when no execution exists', () => {
      const { service } = buildHarness();
      expect(service.getLatestStepIO('never-ran')).toBeUndefined();
    });

    it('getDataSetVariables aggregates outputs from data.set steps in execution order', () => {
      const { state, service } = buildHarness();
      createCompletedStep(state, service, 'exec-1', 'setA', { foo: 1 }, 'data.set');
      createCompletedStep(state, service, 'exec-2', 'setB', { bar: 2 }, 'data.set');
      // Later data.set wins on conflict.
      createCompletedStep(state, service, 'exec-3', 'setA', { foo: 99 }, 'data.set');
      // Non-data.set should be ignored.
      createCompletedStep(state, service, 'exec-4', 'connector', { ignored: true }, 'connector');

      expect(service.getDataSetVariables()).toEqual({ foo: 99, bar: 2 });
    });

    it('getDataSetVariables ignores non-object data.set outputs', () => {
      const { state, service } = buildHarness();
      createCompletedStep(state, service, 'exec-1', 'setA', { foo: 1 }, 'data.set');
      createCompletedStep(state, service, 'exec-2', 'setB', ['arr'], 'data.set');
      createCompletedStep(state, service, 'exec-3', 'setC', null, 'data.set');

      expect(service.getDataSetVariables()).toEqual({ foo: 1 });
    });

    it('setStepOutput writes the output through state and records the size', () => {
      const { state, service } = buildHarness();
      // The runtime would write the lifecycle fields first; tests exercise
      // the IO half in isolation.
      state.upsertStep({
        id: 'step-1',
        stepId: 'myStep',
        stepType: 'connector',
        status: ExecutionStatus.COMPLETED,
      } as Partial<EsWorkflowStepExecution>);
      service.setStepOutput('step-1', { result: 'ok' }, 12);

      expect(service.getStepOutput('step-1')).toEqual({ result: 'ok' });
      expect(service.getOutputSizeStats()).toEqual({ totalBytes: 12, stepCount: 1 });
    });

    it('setStepOutput accepts the FAILED-step null sentinel', () => {
      const { state, service } = buildHarness();
      state.upsertStep({
        id: 'step-1',
        stepId: 'myStep',
        stepType: 'connector',
        status: ExecutionStatus.FAILED,
      } as Partial<EsWorkflowStepExecution>);
      service.setStepOutput('step-1', null);

      expect(service.getStepOutput('step-1')).toBeNull();
      // No size recorded for FAILED steps (the caller passed no sizeBytes).
      expect(service.getOutputSizeStats()).toEqual({ totalBytes: 0, stepCount: 0 });
    });

    it('setStepOutput ignores negative or non-finite sizeBytes', () => {
      const { state, service } = buildHarness();
      state.upsertStep({
        id: 'step-1',
        stepId: 'myStep',
        stepType: 'connector',
        status: ExecutionStatus.COMPLETED,
      } as Partial<EsWorkflowStepExecution>);
      service.setStepOutput('step-1', { ok: true }, -1);
      service.setStepOutput('step-1', { ok: true }, NaN);
      service.setStepOutput('step-1', { ok: true }, Infinity);

      expect(service.getOutputSizeStats()).toEqual({ totalBytes: 0, stepCount: 0 });
    });

    it('clears the evicted flag so rehydration does not overwrite fresh output', async () => {
      const { state, service, stepExecutionRepository } = buildHarness({
        cacheTier: makeSqliteLikeCacheTier(),
      });
      seedCompletedStepWithSize(
        state,
        service,
        'step-1',
        'run_health_check',
        { stale: true },
        1,
        'workflow.execute'
      );
      await service.flushStepChanges();
      expect(service.getStepOutput('step-1')).toBeUndefined();

      service.setStepOutput('step-1', { health: 'ok' });

      expect(service.getStepOutput('step-1')).toEqual({ health: 'ok' });

      stepExecutionRepository.getStepExecutionsByIds.mockResolvedValue([
        {
          id: 'step-1',
          output: { stale: true },
          workflowRunId: 'test-workflow-execution-id',
        } as unknown as EsWorkflowStepExecution,
      ]);

      await service.rehydrateOutputs(['step-1']);

      expect(service.getStepOutput('step-1')).toEqual({ health: 'ok' });
      expect(stepExecutionRepository.getStepExecutionsByIds).not.toHaveBeenCalled();
    });
  });

  describe('size threshold (driven through setStepOutput)', () => {
    it('RAM-only mode: outputs are retained regardless of size', async () => {
      const { state, service } = buildHarness(); // spills=false
      seedCompletedStepWithSize(
        state,
        service,
        'step-1',
        'myStep',
        { data: 'something' },
        50,
        'connector'
      );
      seedCompletedStepWithSize(
        state,
        service,
        'step-2',
        'myStep2',
        { data: 'large' },
        200,
        'connector'
      );

      await service.flushStepChanges();

      expect(service.getStepOutput('step-1')).toBeDefined();
      expect(service.getStepOutput('step-2')).toBeDefined();
    });

    it('SQLite spill mode: all completed non-pinned outputs are evicted after flush, regardless of size', async () => {
      const { state, service } = buildHarness({ cacheTier: makeSqliteLikeCacheTier() }); // spills=true
      seedCompletedStepWithSize(
        state,
        service,
        'step-1',
        'myStep',
        { data: 'something' },
        50,
        'connector'
      );
      seedCompletedStepWithSize(
        state,
        service,
        'step-2',
        'myStep2',
        { data: 'large' },
        200,
        'connector'
      );

      await service.flushStepChanges();

      expect(service.getStepOutput('step-1')).toBeUndefined();
      expect(service.getStepOutput('step-2')).toBeUndefined();
    });
  });

  describe('getOutputSizeStats', () => {
    it('returns zeros when nothing recorded', () => {
      const { service } = buildHarness();
      expect(service.getOutputSizeStats()).toEqual({ totalBytes: 0, stepCount: 0 });
    });

    it('sums sizes from non-evicted steps', () => {
      const { state, service } = buildHarness();
      seedCompletedStepWithSize(state, service, 'step-1', 's1', { data: 'a' }, 100, 'connector');
      seedCompletedStepWithSize(state, service, 'step-2', 's2', { data: 'b' }, 200, 'connector');

      expect(service.getOutputSizeStats()).toEqual({ totalBytes: 300, stepCount: 2 });
    });

    it('in RAM-only mode, all sizes remain after flush', async () => {
      const { state, service } = buildHarness(); // spills=false
      seedCompletedStepWithSize(state, service, 'step-1', 's1', { data: 'a' }, 150, 'connector');
      seedCompletedStepWithSize(state, service, 'step-2', 's2', { data: 'b' }, 250, 'connector');

      await service.flushStepChanges();

      const stats = service.getOutputSizeStats();
      expect(stats.totalBytes).toBe(400);
      expect(stats.stepCount).toBe(2);
    });

    it('in SQLite spill mode, evicted outputs are removed from size stats', async () => {
      const { state, service } = buildHarness({ cacheTier: makeSqliteLikeCacheTier() }); // spills=true
      seedCompletedStepWithSize(state, service, 'step-1', 's1', { data: 'a' }, 150, 'connector');
      seedCompletedStepWithSize(state, service, 'step-2', 's2', { data: 'b' }, 250, 'connector');

      await service.flushStepChanges();

      // Both completed non-pinned outputs evicted => size cleared
      const stats = service.getOutputSizeStats();
      expect(stats.totalBytes).toBe(0);
      expect(stats.stepCount).toBe(0);
    });
  });

  describe('RAM-only mode (spills=false)', () => {
    it('outputs remain in memory after flush', async () => {
      const { state, service } = buildHarness(); // spills=false
      seedCompletedStepWithSize(
        state,
        service,
        'step-1',
        'myStep',
        { data: 'large' },
        250,
        'connector'
      );

      await service.flushStepChanges();

      expect(service.getStepOutput('step-1')).toBeDefined();
    });

    it('cacheTier.put is never called in RAM-only mode', async () => {
      const cacheTier = makeSqliteLikeCacheTier({ spills: false });
      const { state, service } = buildHarness({ cacheTier });
      seedCompletedStepWithSize(
        state,
        service,
        'step-1',
        'myStep',
        { data: 'large' },
        250,
        'connector'
      );

      await service.flushStepChanges();

      expect(cacheTier.put).not.toHaveBeenCalled();
    });
  });

  describe('SQLite spill mode (spills=true)', () => {
    it('COMPLETED non-pinned outputs are dropped after flush', async () => {
      const { state, service } = buildHarness({ cacheTier: makeSqliteLikeCacheTier() });
      seedCompletedStepWithSize(
        state,
        service,
        'step-1',
        'myStep',
        { data: 'large' },
        250,
        'connector'
      );

      await service.flushStepChanges();

      expect(service.getStepOutput('step-1')).toBeUndefined();
    });

    it('FAILED step outputs (null) are NOT evicted', async () => {
      const { state, service } = buildHarness({ cacheTier: makeSqliteLikeCacheTier() });
      state.upsertStep({
        id: 'step-1',
        stepId: 'myStep',
        stepType: 'connector',
        status: ExecutionStatus.FAILED,
      } as Partial<EsWorkflowStepExecution>);
      service.setStepOutput('step-1', null, 250);

      await service.flushStepChanges();

      expect(service.getStepOutput('step-1')).toBeNull();
    });

    it('pinned types (data.set) are NOT evicted', async () => {
      const { state, service } = buildHarness({ cacheTier: makeSqliteLikeCacheTier() });
      seedCompletedStepWithSize(
        state,
        service,
        'step-1',
        'myDataSet',
        { largeData: 'x'.repeat(200) },
        250,
        'data.set'
      );

      await service.flushStepChanges();

      expect(service.getStepOutput('step-1')).toBeDefined();
    });

    it('pinned types (waitForInput) are NOT evicted', async () => {
      const { state, service } = buildHarness({ cacheTier: makeSqliteLikeCacheTier() });
      seedCompletedStepWithSize(
        state,
        service,
        'step-1',
        'wait',
        { answer: 'x'.repeat(200) },
        250,
        'waitForInput'
      );

      await service.flushStepChanges();

      expect(service.getStepOutput('step-1')).toBeDefined();
    });
  });

  describe('eviction policy', () => {
    it('evicts output from completed step after flush (SQLite spill mode)', async () => {
      const { state, service } = buildHarness({ cacheTier: makeSqliteLikeCacheTier() });
      seedCompletedStepWithSize(
        state,
        service,
        'step-1',
        'myStep',
        { largeData: 'x'.repeat(200) },
        250,
        'connector'
      );

      await service.flushStepChanges();

      expect(service.getStepOutput('step-1')).toBeUndefined();
    });

    it('evicts output of any size in SQLite spill mode', async () => {
      const { state, service } = buildHarness({ cacheTier: makeSqliteLikeCacheTier() });
      const smallOutput = { key: 'val' };
      seedCompletedStepWithSize(state, service, 'step-1', 'myStep', smallOutput, 10, 'connector');

      await service.flushStepChanges();

      expect(service.getStepOutput('step-1')).toBeUndefined();
    });

    it('retains output from running steps', async () => {
      const { state, service } = buildHarness({ cacheTier: makeSqliteLikeCacheTier() });
      state.upsertStep({
        id: 'step-1',
        stepId: 'myStep',
        stepType: 'connector',
        status: ExecutionStatus.RUNNING,
      } as Partial<EsWorkflowStepExecution>);
      service.setStepOutput('step-1', { data: 'x'.repeat(200) }, 250);

      await service.flushStepChanges();

      expect(service.getStepOutput('step-1')).toBeDefined();
    });

    it('retains output from data.set steps regardless of size (pinned)', async () => {
      const { state, service } = buildHarness({ cacheTier: makeSqliteLikeCacheTier() });
      seedCompletedStepWithSize(
        state,
        service,
        'step-1',
        'myDataSet',
        { largeData: 'x'.repeat(200) },
        250,
        'data.set'
      );

      await service.flushStepChanges();

      expect(service.getStepOutput('step-1')).toBeDefined();
    });

    it('retains output from waitForInput steps regardless of size (pinned)', async () => {
      const { state, service } = buildHarness({ cacheTier: makeSqliteLikeCacheTier() });
      seedCompletedStepWithSize(
        state,
        service,
        'step-1',
        'wait',
        { answer: 'x'.repeat(200) },
        250,
        'waitForInput'
      );

      await service.flushStepChanges();

      expect(service.getStepOutput('step-1')).toBeDefined();
    });

    it('skips steps with no recorded size (output still evicted if COMPLETED)', async () => {
      const { state, service } = buildHarness({ cacheTier: makeSqliteLikeCacheTier() });
      createCompletedStep(state, service, 'step-1', 'myStep', { data: 'something' }, 'connector');
      // No recordOutputSize call — output is still evicted because COMPLETED non-pinned

      await service.flushStepChanges();

      expect(service.getStepOutput('step-1')).toBeUndefined();
    });

    it('does not evict failed steps (output: null is semantic)', async () => {
      const { state, service } = buildHarness({ cacheTier: makeSqliteLikeCacheTier() });
      state.upsertStep({
        id: 'step-1',
        stepId: 'myStep',
        stepType: 'connector',
        status: ExecutionStatus.FAILED,
      } as Partial<EsWorkflowStepExecution>);
      // Even with a recorded size, the eviction predicate must keep null:
      // null is the FAILED-step sentinel, distinct from `undefined` (evicted).
      service.setStepOutput('step-1', null, 250);

      await service.flushStepChanges();

      expect(service.getStepOutput('step-1')).toBeNull();
    });

    it('does not add to stepDocumentsChanges when evicting', async () => {
      const { state, service, stepExecutionRepository } = buildHarness({
        cacheTier: makeSqliteLikeCacheTier(),
      });
      seedCompletedStepWithSize(
        state,
        service,
        'step-1',
        'myStep',
        { data: 'x'.repeat(200) },
        250,
        'connector'
      );

      // Flush persists + evicts in one cycle.
      await service.flushStepChanges();
      jest.clearAllMocks();

      // Second flush: no new changes, no upsert.
      await service.flushStepChanges();
      expect(stepExecutionRepository.bulkUpsert).not.toHaveBeenCalled();
    });
  });

  describe('rehydrateOutputs', () => {
    it('calls repository and restores output', async () => {
      const { state, service, stepExecutionRepository } = buildHarness({
        cacheTier: makeSqliteLikeCacheTier(),
      });
      const originalOutput = { restored: true, data: 'x'.repeat(200) };
      seedCompletedStepWithSize(
        state,
        service,
        'step-1',
        'myStep',
        originalOutput,
        250,
        'connector'
      );

      await service.flushStepChanges();
      expect(service.getStepOutput('step-1')).toBeUndefined();

      stepExecutionRepository.getStepExecutionsByIds.mockResolvedValue([
        {
          id: 'step-1',
          stepId: 'myStep',
          output: originalOutput,
          workflowRunId: 'test-workflow-execution-id',
        } as unknown as EsWorkflowStepExecution,
      ]);

      await service.rehydrateOutputs(['step-1']);

      expect(service.getStepOutput('step-1')).toEqual(originalOutput);
      expect(stepExecutionRepository.getStepExecutionsByIds).toHaveBeenCalledWith(
        ['step-1'],
        ['id', 'output', 'workflowRunId']
      );
    });

    it('is a no-op when no requested IDs are absent from outputs', async () => {
      const { state, service, stepExecutionRepository } = buildHarness();
      createCompletedStep(state, service, 'step-1', 'myStep', { data: 'small' }, 'connector');

      await service.rehydrateOutputs(['step-1']);

      expect(stepExecutionRepository.getStepExecutionsByIds).not.toHaveBeenCalled();
    });

    it('handles missing documents from ES gracefully', async () => {
      const { state, service, stepExecutionRepository } = buildHarness({
        cacheTier: makeSqliteLikeCacheTier(),
      });
      seedCompletedStepWithSize(
        state,
        service,
        'step-1',
        'myStep',
        { data: 'large' },
        250,
        'connector'
      );
      await service.flushStepChanges();

      stepExecutionRepository.getStepExecutionsByIds.mockResolvedValue([]);

      await service.rehydrateOutputs(['step-1']);

      expect(service.getStepOutput('step-1')).toBeUndefined();
    });

    it('drops cross-execution docs returned by mget instead of restoring foreign output', async () => {
      const { state, service, stepExecutionRepository } = buildHarness({
        cacheTier: makeSqliteLikeCacheTier(),
      });
      seedCompletedStepWithSize(
        state,
        service,
        'step-1',
        'myStep',
        { data: 'mine' },
        250,
        'connector'
      );
      await service.flushStepChanges();

      // ES returns a doc for the same `_id` but a different workflowRunId.
      // The service must refuse to restore it (defends against a custom
      // resume path with mis-typed IDs or a hash collision).
      stepExecutionRepository.getStepExecutionsByIds.mockResolvedValueOnce([
        {
          id: 'step-1',
          stepId: 'myStep',
          stepType: 'connector',
          workflowRunId: 'some-other-execution',
          output: { data: 'NOT MINE' },
        } as unknown as EsWorkflowStepExecution,
      ]);

      await service.rehydrateOutputs(['step-1']);

      expect(service.getStepOutput('step-1')).toBeUndefined();
    });

    it('logs missing-doc as warn (not error) when workflow is in a terminal status', async () => {
      const logger = loggerMock.create();
      const { state, service, stepExecutionRepository } = buildHarness({
        cacheTier: makeSqliteLikeCacheTier(),
        logger,
      });

      seedCompletedStepWithSize(
        state,
        service,
        'step-1',
        'myStep',
        { data: 'large' },
        250,
        'connector'
      );
      await service.flushStepChanges();

      stepExecutionRepository.getStepExecutionsByIds.mockResolvedValue([]);
      state.updateWorkflowExecution({ status: ExecutionStatus.COMPLETED });

      await service.rehydrateOutputs(['step-1']);

      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('not found in ES during rehydration')
      );
      expect(logger.error).not.toHaveBeenCalled();
    });

    it('logs missing-doc as error when workflow is still RUNNING (active data loss)', async () => {
      const logger = loggerMock.create();
      const { state, service, stepExecutionRepository } = buildHarness({
        cacheTier: makeSqliteLikeCacheTier(),
        logger,
      });

      seedCompletedStepWithSize(
        state,
        service,
        'step-1',
        'myStep',
        { data: 'large' },
        250,
        'connector'
      );
      await service.flushStepChanges();

      stepExecutionRepository.getStepExecutionsByIds.mockResolvedValue([]);
      // Workflow remains RUNNING — missing doc indicates active data loss.

      await service.rehydrateOutputs(['step-1']);

      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('not found in ES during rehydration')
      );
      expect(logger.warn).not.toHaveBeenCalled();
    });
  });

  describe('prepareForRead in SQLite spill mode', () => {
    it('fetches absent predecessors from cacheTier.get when spills=true', async () => {
      const { state, service, stepExecutionRepository } = buildHarness({
        cacheTier: makeSqliteLikeCacheTier({
          get: jest.fn().mockResolvedValue(new Map([['exec-b', { v: 'b' }]])),
        }),
      });
      const workflow = {
        name: 'Test',
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
      } as unknown as WorkflowYaml;
      const graph = WorkflowGraph.fromWorkflowDefinition(workflow);
      const stepCNode = graph.topologicalOrder
        .map((nodeId) => graph.getNode(nodeId))
        .find((n) => n.stepId === 'step_c')!;

      seedCompletedStepWithSize(state, service, 'exec-b', 'step_b', { v: 'b' }, 1, 'connector');
      await service.flushStepChanges(); // evicts exec-b immediately
      expect(service.getStepOutput('exec-b')).toBeUndefined();

      await service.prepareForRead({
        node: stepCNode,
        predecessorsResolver: (n) => graph.getAllPredecessors(n.id),
      });

      // Was found in cacheTier.get, not ES
      expect(service.getStepOutput('exec-b')).toEqual({ v: 'b' });
      expect(stepExecutionRepository.getStepExecutionsByIds).not.toHaveBeenCalled();
    });

    it('falls back to ES when cacheTier.get misses', async () => {
      const { state, service, stepExecutionRepository } = buildHarness({
        cacheTier: makeSqliteLikeCacheTier(),
      });
      const workflow = {
        name: 'Test',
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
        ],
      } as unknown as WorkflowYaml;
      const graph = WorkflowGraph.fromWorkflowDefinition(workflow);
      const stepBNode = graph.topologicalOrder
        .map((nodeId) => graph.getNode(nodeId))
        .find((n) => n.stepId === 'step_b')!;

      seedCompletedStepWithSize(state, service, 'exec-a', 'step_a', { v: 'a' }, 1, 'connector');
      await service.flushStepChanges(); // evicts exec-a
      expect(service.getStepOutput('exec-a')).toBeUndefined();

      stepExecutionRepository.getStepExecutionsByIds.mockResolvedValue([
        {
          id: 'exec-a',
          output: { v: 'a' },
          workflowRunId: 'test-workflow-execution-id',
        } as unknown as EsWorkflowStepExecution,
      ]);

      await service.prepareForRead({
        node: stepBNode,
        predecessorsResolver: (n) => graph.getAllPredecessors(n.id),
      });

      expect(service.getStepOutput('exec-a')).toEqual({ v: 'a' });
      expect(stepExecutionRepository.getStepExecutionsByIds).toHaveBeenCalledWith(
        ['exec-a'],
        ['id', 'output', 'workflowRunId']
      );
    });

    it('prepareForRead is a no-op in RAM-only mode (no cacheTier.get calls)', async () => {
      const { state, service, stepExecutionRepository } = buildHarness(); // spills=false
      const workflow = {
        name: 'Test',
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
        ],
      } as unknown as WorkflowYaml;
      const graph = WorkflowGraph.fromWorkflowDefinition(workflow);
      const stepBNode = graph.topologicalOrder
        .map((nodeId) => graph.getNode(nodeId))
        .find((n) => n.stepId === 'step_b')!;

      seedCompletedStepWithSize(state, service, 'exec-a', 'step_a', { v: 'a' }, 1, 'connector');
      await service.flushStepChanges(); // RAM-only: output still in memory

      expect(service.getStepOutput('exec-a')).toBeDefined(); // still in RAM

      await service.prepareForRead({
        node: stepBNode,
        predecessorsResolver: (n) => graph.getAllPredecessors(n.id),
      });

      // No ES call since it's RAM-only
      expect(stepExecutionRepository.getStepExecutionsByIds).not.toHaveBeenCalled();
    });
  });

  describe('output eviction via flushStepChanges', () => {
    it('evicts output on the FIRST flush (immediate, not deferred)', async () => {
      const { state, service } = buildHarness({ cacheTier: makeSqliteLikeCacheTier() });
      seedCompletedStepWithSize(
        state,
        service,
        'step-1',
        'myStep',
        { data: 'x'.repeat(200) },
        250,
        'connector'
      );

      await service.flushStepChanges();

      expect(service.getStepOutput('step-1')).toBeUndefined();
    });

    it('does NOT evict output in RAM-only mode even after multiple flushes', async () => {
      const { state, service } = buildHarness(); // spills=false
      const smallOutput = { key: 'val' };
      seedCompletedStepWithSize(state, service, 'step-1', 'myStep', smallOutput, 10, 'connector');

      await service.flushStepChanges();
      await service.flushStepChanges();

      expect(service.getStepOutput('step-1')).toEqual(smallOutput);
    });

    it('evicts successive batches on successive flushes', async () => {
      const { state, service } = buildHarness({ cacheTier: makeSqliteLikeCacheTier() });
      seedCompletedStepWithSize(
        state,
        service,
        'step-a',
        'sA',
        { data: 'a'.repeat(200) },
        250,
        'connector'
      );
      await service.flushStepChanges();
      expect(service.getStepOutput('step-a')).toBeUndefined();

      seedCompletedStepWithSize(
        state,
        service,
        'step-b',
        'sB',
        { data: 'b'.repeat(200) },
        300,
        'connector'
      );
      await service.flushStepChanges();
      expect(service.getStepOutput('step-b')).toBeUndefined();
    });

    it('does not evict data.set outputs even in SQLite spill mode', async () => {
      const { state, service } = buildHarness({ cacheTier: makeSqliteLikeCacheTier() });
      seedCompletedStepWithSize(
        state,
        service,
        'step-1',
        'myDataSet',
        { largeData: 'x'.repeat(200) },
        250,
        'data.set'
      );

      await service.flushStepChanges();

      expect(service.getStepOutput('step-1')).toBeDefined();
    });

    it('does NOT evict output that completed during the bulkUpsert async window (premature-eviction race)', async () => {
      // Regression test for: step completes DURING the bulkUpsert await, so its
      // output arrives in pendingIoChanges AFTER the drain. The output is in
      // this.outputs (in-memory) and the step is COMPLETED by the time
      // evictFlushedOutputs runs — but the ES doc only has the RUNNING lifecycle
      // write, not the output. Old code evicted by checking flushedIds (lifecycle-
      // flushed), causing the output to be removed from heap before reaching ES.
      // New code uses outputFlushedIds (IO-flushed) so only IDs whose output was
      // in the drained ioPartials batch are evicted.

      let resolveUpsert!: () => void;
      const { state, service, stepExecutionRepository } = buildHarness({
        cacheTier: makeSqliteLikeCacheTier(),
      });

      // Intercept bulkUpsert so we can simulate a step completing during the write.
      stepExecutionRepository.bulkUpsert.mockImplementation(
        () =>
          new Promise<void>((resolve) => {
            resolveUpsert = resolve;
          })
      );

      // Seed step as RUNNING + put a lifecycle change in pendingStepChanges.
      state.upsertStep({ id: 'step-x', stepId: 'sX', stepType: 'connector', status: ExecutionStatus.RUNNING });

      // Start a flush — this drains pendingStepChanges (RUNNING lifecycle only,
      // no IO yet) and calls bulkUpsert which is now blocked.
      const flushPromise = service.flushStepChanges();

      // While the upsert is in flight, the step completes and its output is written.
      state.upsertStep({ id: 'step-x', stepId: 'sX', status: ExecutionStatus.COMPLETED });
      service.setStepOutput('step-x', { result: 'value' });

      // Unblock the upsert.
      resolveUpsert();
      await flushPromise;

      // The output must still be in memory: it was NOT in the ioPartials that
      // were drained before the bulkUpsert, so eviction must not have fired.
      expect(service.getStepOutput('step-x')).toEqual({ result: 'value' });
    });

    it('evicts output that completed before the flush drain (no race)', async () => {
      // Complementary test: when the step completes BEFORE the drain, the output
      // IS in the ioPartials of that flush and SHOULD be evicted after the write.
      const { state, service } = buildHarness({ cacheTier: makeSqliteLikeCacheTier() });

      state.upsertStep({ id: 'step-y', stepId: 'sY', stepType: 'connector', status: ExecutionStatus.COMPLETED });
      service.setStepOutput('step-y', { result: 'value' });

      await service.flushStepChanges();

      expect(service.getStepOutput('step-y')).toBeUndefined();
    });
  });

  describe('input eviction', () => {
    it('evicts input from completed step after flush', async () => {
      const { state, service } = buildHarness();
      state.upsertStep({
        id: 'step-1',
        stepId: 'myStep',
        stepType: 'connector',
        status: ExecutionStatus.COMPLETED,
      });
      service.setStepInput('step-1', { message: 'hello' });
      service.setStepOutput('step-1', { result: 'ok' });

      await service.flushStepChanges();

      expect(service.getStepInput('step-1')).toBeUndefined();
    });

    it('evicts input from failed step after flush', async () => {
      const { state, service } = buildHarness();
      state.upsertStep({
        id: 'step-1',
        stepId: 'myStep',
        stepType: 'connector',
        status: ExecutionStatus.FAILED,
      });
      service.setStepInput('step-1', { message: 'hello' });
      service.setStepOutput('step-1', null);

      await service.flushStepChanges();

      expect(service.getStepInput('step-1')).toBeUndefined();
    });

    it('does NOT evict input from running step after flush', async () => {
      const { state, service } = buildHarness();
      const input = { foreach: '{{steps.data.output}}' };
      state.upsertStep({
        id: 'step-1',
        stepId: 'loopStep',
        stepType: 'foreach',
        status: ExecutionStatus.RUNNING,
      });
      service.setStepInput('step-1', input);

      await service.flushStepChanges();

      expect(service.getStepInput('step-1')).toEqual(input);
    });

    it('does NOT evict input from waiting step after flush', async () => {
      const { state, service } = buildHarness();
      const input = { duration: '20m' };
      state.upsertStep({
        id: 'step-1',
        stepId: 'waitStep',
        stepType: 'wait',
        status: ExecutionStatus.WAITING,
      });
      service.setStepInput('step-1', input);

      await service.flushStepChanges();

      expect(service.getStepInput('step-1')).toEqual(input);
    });

    it('does not cause stepDocumentsChanges on subsequent flush after input eviction', async () => {
      const { state, service, stepExecutionRepository } = buildHarness();
      state.upsertStep({
        id: 'step-1',
        stepId: 'myStep',
        stepType: 'connector',
        status: ExecutionStatus.COMPLETED,
      });
      service.setStepInput('step-1', { message: 'hello' });

      await service.flushStepChanges();
      jest.clearAllMocks();

      await service.flushStepChanges();
      expect(stepExecutionRepository.bulkUpsert).not.toHaveBeenCalled();
    });

    it('evicts input immediately and output on flush', async () => {
      const { state, service } = buildHarness({ cacheTier: makeSqliteLikeCacheTier() });
      state.upsertStep({
        id: 'step-1',
        stepId: 'myStep',
        stepType: 'connector',
        status: ExecutionStatus.COMPLETED,
      });
      service.setStepInput('step-1', { message: 'hello' });
      service.setStepOutput('step-1', { data: 'x'.repeat(200) }, 250);

      await service.flushStepChanges();
      expect(service.getStepInput('step-1')).toBeUndefined();
      expect(service.getStepOutput('step-1')).toBeUndefined();
    });
  });

  describe('interaction with evictStaleLoopOutputs', () => {
    it('handles both eviction systems acting on the same step', async () => {
      const { state, service, stepExecutionRepository } = buildHarness({
        cacheTier: makeSqliteLikeCacheTier(),
      });
      state.upsertStep({
        id: 'iter-1',
        stepId: 'loopStep',
        stepType: 'connector',
        status: ExecutionStatus.COMPLETED,
      } as Partial<EsWorkflowStepExecution>);
      service.setStepOutput('iter-1', { data: 'x'.repeat(200) }, 250);

      state.upsertStep({
        id: 'iter-2',
        stepId: 'loopStep',
        stepType: 'connector',
        status: ExecutionStatus.COMPLETED,
      } as Partial<EsWorkflowStepExecution>);
      service.setStepOutput('iter-2', { data: 'y'.repeat(200) }, 250);

      // Stale-loop eviction nullifies iter-1 (non-latest).
      service.evictStaleLoopOutputs(['loopStep']);
      expect(service.getStepOutput('iter-1')).toBeUndefined();
      expect(service.getStepOutput('iter-2')).toBeDefined();

      // First flush: iter-2 will be evicted immediately (SQLite spill mode).
      await service.flushStepChanges();
      expect(service.getStepOutput('iter-2')).toBeUndefined();

      // iter-2 can be rehydrated from ES.
      stepExecutionRepository.getStepExecutionsByIds.mockResolvedValue([
        { id: 'iter-2', output: { data: 'y'.repeat(200) } } as unknown as EsWorkflowStepExecution,
      ]);
      await service.rehydrateOutputs(['iter-2']);
      expect(service.getStepOutput('iter-2')).toBeDefined();
    });
  });

  describe('evictCompletedLoopsOnResume', () => {
    // Logic moved here from WorkflowExecutionRuntimeManager — see B.6 in the
    // review. The runtime manager test now only verifies delegation; the
    // behavioural assertions live next to the implementation.

    function makeGraph(innerStepIdsByLoop: Record<string, Set<string>>) {
      return {
        getInnerStepIds: jest.fn(
          (loopStepId: string) => innerStepIdsByLoop[loopStepId] ?? new Set()
        ),
      };
    }

    it('evicts inner step outputs for completed foreach loops', () => {
      const { state, service } = buildHarness();
      state.upsertStep({
        id: 'foreach-1',
        stepId: 'myForeach',
        stepType: 'foreach',
        status: ExecutionStatus.COMPLETED,
      } as Partial<EsWorkflowStepExecution>);
      const graph = makeGraph({ myForeach: new Set(['inner']) });

      service.evictCompletedLoopsOnResume(graph);

      expect(graph.getInnerStepIds).toHaveBeenCalledWith('myForeach');
    });

    it('evicts inner step outputs for completed while loops', () => {
      const { state, service } = buildHarness();
      state.upsertStep({
        id: 'while-1',
        stepId: 'myWhile',
        stepType: 'while',
        status: ExecutionStatus.COMPLETED,
      } as Partial<EsWorkflowStepExecution>);
      const graph = makeGraph({ myWhile: new Set(['body']) });

      service.evictCompletedLoopsOnResume(graph);

      expect(graph.getInnerStepIds).toHaveBeenCalledWith('myWhile');
    });

    it('skips loops still running at resume time', () => {
      const { state, service } = buildHarness();
      state.upsertStep({
        id: 'foreach-1',
        stepId: 'midForeach',
        stepType: 'foreach',
        status: ExecutionStatus.RUNNING,
      } as Partial<EsWorkflowStepExecution>);
      const graph = makeGraph({});

      service.evictCompletedLoopsOnResume(graph);

      expect(graph.getInnerStepIds).not.toHaveBeenCalled();
    });

    it('de-duplicates by stepId when a nested loop has multiple COMPLETED executions', () => {
      const { state, service } = buildHarness();
      // 3 executions of the same inner loop, all COMPLETED.
      state.upsertStep({
        id: 'inner-1',
        stepId: 'innerForeach',
        stepType: 'foreach',
        status: ExecutionStatus.COMPLETED,
      } as Partial<EsWorkflowStepExecution>);
      state.upsertStep({
        id: 'inner-2',
        stepId: 'innerForeach',
        stepType: 'foreach',
        status: ExecutionStatus.COMPLETED,
      } as Partial<EsWorkflowStepExecution>);
      state.upsertStep({
        id: 'inner-3',
        stepId: 'innerForeach',
        stepType: 'foreach',
        status: ExecutionStatus.COMPLETED,
      } as Partial<EsWorkflowStepExecution>);
      const graph = makeGraph({ innerForeach: new Set(['deepAction']) });

      service.evictCompletedLoopsOnResume(graph);

      expect(graph.getInnerStepIds).toHaveBeenCalledTimes(1);
    });

    it('is a no-op when there are no loop steps', () => {
      const { state, service } = buildHarness();
      state.upsertStep({
        id: 'a',
        stepId: 'action1',
        stepType: 'slack',
        status: ExecutionStatus.COMPLETED,
      } as Partial<EsWorkflowStepExecution>);
      const graph = makeGraph({});

      service.evictCompletedLoopsOnResume(graph);

      expect(graph.getInnerStepIds).not.toHaveBeenCalled();
    });
  });

  describe('load (resume-time deferred outputs)', () => {
    /**
     * Drives the public `service.load()` path with mocked repository
     * responses. In SQLite spill mode, non-pinned outputs stay absent
     * after load (deferred to on-demand rehydration). In RAM-only mode,
     * all outputs are eagerly loaded.
     */
    async function driveLoad(
      steps: EsWorkflowStepExecution[],
      pinnedOutputs: Array<{ id: string; output: unknown }> = [],
      cacheTier?: CacheTier
    ) {
      const harness = buildHarness({ cacheTier });
      harness.state.updateWorkflowExecution({ stepExecutionIds: steps.map((s) => s.id) });
      const calls = harness.stepExecutionRepository.getStepExecutionsByIds as jest.Mock;
      calls.mockReset();
      // First call: load without outputs.
      calls.mockResolvedValueOnce(steps);
      // Second call: eager output fetch. In SQLite spill mode only pinned steps
      // are fetched; in RAM-only mode all steps are fetched.
      calls.mockResolvedValueOnce(
        pinnedOutputs.map((p) => ({ id: p.id, output: p.output } as EsWorkflowStepExecution))
      );
      await harness.service.load();
      return harness;
    }

    it('marks non-pinned step outputs as absent (deferred) in SQLite spill mode', async () => {
      const { service } = await driveLoad(
        [
          {
            id: '11',
            stepId: 'connectorStep',
            stepType: 'connector',
            status: ExecutionStatus.COMPLETED,
          } as EsWorkflowStepExecution,
        ],
        [],
        makeSqliteLikeCacheTier()
      );
      expect(service.getStepOutput('11')).toBeUndefined();
    });

    it('eagerly fetches outputs for data.set step types', async () => {
      const { service, stepExecutionRepository } = await driveLoad(
        [
          {
            id: '11',
            stepId: 'setVar',
            stepType: 'data.set',
            status: ExecutionStatus.COMPLETED,
          } as EsWorkflowStepExecution,
        ],
        [{ id: '11', output: { v: 1 } }]
      );
      expect(service.getStepOutput('11')).not.toBeUndefined();
      expect(service.getStepOutput('11')).toEqual({ v: 1 });
      expect(stepExecutionRepository.getStepExecutionsByIds).toHaveBeenNthCalledWith(
        2,
        ['11'],
        ['id', 'output']
      );
    });

    it('eagerly fetches outputs for waitForInput step types', async () => {
      const { service } = await driveLoad(
        [
          {
            id: '11',
            stepId: 'wait',
            stepType: 'waitForInput',
            status: ExecutionStatus.COMPLETED,
          } as EsWorkflowStepExecution,
        ],
        [{ id: '11', output: { reply: 'ok' } }]
      );
      expect(service.getStepOutput('11')).not.toBeUndefined();
      expect(service.getStepOutput('11')).toEqual({ reply: 'ok' });
    });

    it('treats undefined stepType as non-pinned in SQLite spill mode', async () => {
      const { service } = await driveLoad(
        [
          {
            id: '11',
            stepId: 'legacyStep',
            status: ExecutionStatus.COMPLETED,
          } as EsWorkflowStepExecution,
        ],
        [],
        makeSqliteLikeCacheTier()
      );
      expect(service.getStepOutput('11')).toBeUndefined();
    });
  });

  describe('prepareForRead', () => {
    function buildGraphWorkflow() {
      const workflow = {
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
      } as unknown as WorkflowYaml;
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

    it('preserves fresh output when a deferred step completes on resume before flush', async () => {
      const { state, service, stepExecutionRepository } = buildHarness();
      state.updateWorkflowExecution({ stepExecutionIds: ['exec-child'] });

      stepExecutionRepository.getStepExecutionsByIds.mockResolvedValueOnce([
        {
          id: 'exec-child',
          stepId: 'run_health_check',
          stepType: 'workflow.execute',
          status: ExecutionStatus.WAITING_FOR_CHILD,
        } as EsWorkflowStepExecution,
      ]);
      // Provide second mock call for eager load (RAM-only mode loads all)
      stepExecutionRepository.getStepExecutionsByIds.mockResolvedValueOnce([]);
      await service.load();

      expect(service.getStepOutput('exec-child')).toBeUndefined();

      state.upsertStep({
        id: 'exec-child',
        stepId: 'run_health_check',
        stepType: 'workflow.execute',
        status: ExecutionStatus.COMPLETED,
      });
      const childOutput = { health: 'ok' };
      service.setStepOutput('exec-child', childOutput);

      const workflow = {
        name: 'Parent',
        version: '1',
        description: 'test',
        enabled: true,
        triggers: [],
        steps: [
          {
            name: 'run_health_check',
            type: 'workflow.execute',
            with: { 'workflow-id': 'child' },
          } as ConnectorStep,
          {
            name: 'log_result',
            type: 'console',
            with: { message: '{{steps.run_health_check.output | json}}' },
          } as ConnectorStep,
        ],
      } as unknown as WorkflowYaml;
      const graph = WorkflowGraph.fromWorkflowDefinition(workflow);
      const logResultNode = graph.topologicalOrder
        .map((nodeId) => graph.getNode(nodeId))
        .find((n) => n.stepId === 'log_result')!;

      stepExecutionRepository.getStepExecutionsByIds.mockClear();
      stepExecutionRepository.getStepExecutionsByIds.mockResolvedValue([
        {
          id: 'exec-child',
          output: null,
          workflowRunId: 'test-workflow-execution-id',
        } as unknown as EsWorkflowStepExecution,
      ]);

      await service.prepareForRead({
        node: logResultNode,
        predecessorsResolver: (n) => graph.getAllPredecessors(n.id),
      });

      expect(service.getStepOutput('exec-child')).toEqual(childOutput);
      expect(stepExecutionRepository.getStepExecutionsByIds).not.toHaveBeenCalled();
    });

    it('rehydrates all absent predecessor IDs (no template analysis in new prepareForRead)', async () => {
      const { state, service, stepExecutionRepository } = buildHarness({
        cacheTier: makeSqliteLikeCacheTier(),
      });
      const { graph, stepCNode } = buildGraphWorkflow();

      // Seed two completed predecessors and drive them through eviction.
      seedCompletedStepWithSize(state, service, 'exec-a', 'step_a', { v: 'a' }, 1, 'connector');
      seedCompletedStepWithSize(state, service, 'exec-b', 'step_b', { v: 'b' }, 1, 'connector');
      await service.flushStepChanges();
      expect(service.getStepOutput('exec-b')).toBeUndefined();
      stepExecutionRepository.bulkUpsert.mockClear();

      stepExecutionRepository.getStepExecutionsByIds.mockResolvedValue([
        {
          id: 'exec-a',
          output: { v: 'a' },
          workflowRunId: 'test-workflow-execution-id',
        } as unknown as EsWorkflowStepExecution,
        {
          id: 'exec-b',
          output: { v: 'b' },
          workflowRunId: 'test-workflow-execution-id',
        } as unknown as EsWorkflowStepExecution,
      ]);

      await service.prepareForRead({
        node: stepCNode,
        predecessorsResolver: (n) => graph.getAllPredecessors(n.id),
      });

      // Both predecessors are absent and fetched (new code fetches ALL absent predecessors)
      const rehydratedIds = stepExecutionRepository.getStepExecutionsByIds.mock.calls[0][0];
      expect(rehydratedIds).toEqual(expect.arrayContaining(['exec-a', 'exec-b']));
      expect(rehydratedIds).toHaveLength(2);
    });

    it('rehydrates outputs referenced by the active foreach source expression', async () => {
      const workflow: WorkflowYaml = {
        name: 'Foreach source dependency',
        version: '1',
        description: 'test',
        enabled: true,
        triggers: [],
        steps: [
          {
            name: 'get_active_alerts',
            type: 'console',
            with: { message: 'alerts' },
          } as ConnectorStep,
          {
            name: 'foreach_alert',
            type: 'foreach',
            foreach: '{{steps.get_active_alerts.output.hits.hits}}',
            steps: [
              {
                name: 'create_new_case',
                type: 'console',
                with: { message: 'case' },
              } as ConnectorStep,
              {
                name: 'add_alert_to_case',
                type: 'console',
                with: {
                  message: 'case={{steps.create_new_case.output.id}} alert={{foreach.item._id}}',
                },
              } as ConnectorStep,
            ],
          },
        ],
      };
      const graph = WorkflowGraph.fromWorkflowDefinition(workflow);
      const addAlertNode = graph.topologicalOrder
        .map((nodeId) => graph.getNode(nodeId))
        .find((n) => n.stepId === 'add_alert_to_case')!;

      const { state, service, stepExecutionRepository } = buildHarness({
        cacheTier: makeSqliteLikeCacheTier(),
      });
      const alertsOutput = { hits: { hits: [{ _id: 'alert-1' }] } };
      seedCompletedStepWithSize(
        state,
        service,
        'exec-alerts',
        'get_active_alerts',
        alertsOutput,
        1,
        'connector'
      );
      seedCompletedStepWithSize(
        state,
        service,
        'exec-case',
        'create_new_case',
        { id: 'case-1' },
        1,
        'connector'
      );
      await service.flushStepChanges();

      const scopeStack: StackFrame[] = [
        {
          stepId: 'foreach_alert',
          nestedScopes: [
            {
              nodeId: 'enterForeach_foreach_alert',
              nodeType: 'enter-foreach',
              scopeId: '0',
            },
          ],
        },
      ];
      const foreachExecutionId = buildStepExecutionId(
        state.getWorkflowExecutionId(),
        'foreach_alert',
        []
      );
      state.updateWorkflowExecution({ scopeStack });
      state.upsertStep({
        id: foreachExecutionId,
        stepId: 'foreach_alert',
        stepType: 'foreach',
        status: ExecutionStatus.RUNNING,
        state: { index: 0, total: 1 },
      } as Partial<EsWorkflowStepExecution>);
      service.setStepInput(foreachExecutionId, {
        foreach: '{{steps.get_active_alerts.output.hits.hits}}',
      });

      stepExecutionRepository.getStepExecutionsByIds.mockResolvedValue([
        {
          id: 'exec-alerts',
          output: alertsOutput,
          workflowRunId: 'test-workflow-execution-id',
        } as unknown as EsWorkflowStepExecution,
        {
          id: 'exec-case',
          output: { id: 'case-1' },
          workflowRunId: 'test-workflow-execution-id',
        } as unknown as EsWorkflowStepExecution,
      ]);

      await service.prepareForRead({
        node: addAlertNode,
        predecessorsResolver: (n) => graph.getAllPredecessors(n.id),
      });

      const rehydratedIds = stepExecutionRepository.getStepExecutionsByIds.mock.calls[0][0];
      // Both exec-alerts and exec-case are absent (evicted) and should be rehydrated
      expect(rehydratedIds).toEqual(expect.arrayContaining(['exec-alerts', 'exec-case']));
    });

    it('rehydrates outputs referenced by nested active foreach source expressions', async () => {
      const workflow = {
        name: 'Nested foreach source dependencies',
        version: '1',
        description: 'test',
        enabled: true,
        triggers: [],
        steps: [
          {
            name: 'get_outer_source',
            type: 'console',
            with: { message: 'outer' },
          } as ConnectorStep,
          {
            name: 'get_inner_source',
            type: 'console',
            with: { message: 'inner' },
          } as ConnectorStep,
          {
            name: 'outer_loop',
            type: 'foreach',
            foreach: '{{steps.get_outer_source.output.items}}',
            steps: [
              {
                name: 'create_new_case',
                type: 'console',
                with: { message: 'case' },
              } as ConnectorStep,
              {
                name: 'inner_loop',
                type: 'foreach',
                foreach: '{{steps.get_inner_source.output.items}}',
                steps: [
                  {
                    name: 'deep_step',
                    type: 'console',
                    with: {
                      message: 'case={{steps.create_new_case.output.id}} item={{foreach.item._id}}',
                    },
                  } as ConnectorStep,
                ],
              },
            ],
          },
        ],
      } as unknown as WorkflowYaml;
      const graph = WorkflowGraph.fromWorkflowDefinition(workflow);
      const deepStepNode = graph.topologicalOrder
        .map((nodeId) => graph.getNode(nodeId))
        .find((n) => n.stepId === 'deep_step')!;

      const { state, service, stepExecutionRepository } = buildHarness({
        cacheTier: makeSqliteLikeCacheTier(),
      });
      const outerOutput = { items: [{ group: 'a' }] };
      const innerOutput = { items: [{ _id: 'alert-1' }] };
      seedCompletedStepWithSize(
        state,
        service,
        'exec-outer-source',
        'get_outer_source',
        outerOutput,
        1,
        'connector'
      );
      seedCompletedStepWithSize(
        state,
        service,
        'exec-inner-source',
        'get_inner_source',
        innerOutput,
        1,
        'connector'
      );
      seedCompletedStepWithSize(
        state,
        service,
        'exec-case',
        'create_new_case',
        { id: 'case-1' },
        1,
        'connector'
      );
      await service.flushStepChanges();

      const outerFrame: StackFrame = {
        stepId: 'outer_loop',
        nestedScopes: [
          {
            nodeId: 'enterForeach_outer_loop',
            nodeType: 'enter-foreach',
            scopeId: '0',
          },
        ],
      };
      const innerFrame: StackFrame = {
        stepId: 'inner_loop',
        nestedScopes: [
          {
            nodeId: 'enterForeach_inner_loop',
            nodeType: 'enter-foreach',
            scopeId: '0',
          },
        ],
      };
      const outerExecutionId = buildStepExecutionId(
        state.getWorkflowExecutionId(),
        'outer_loop',
        []
      );
      const innerExecutionId = buildStepExecutionId(state.getWorkflowExecutionId(), 'inner_loop', [
        outerFrame,
      ]);
      state.updateWorkflowExecution({ scopeStack: [outerFrame, innerFrame] });
      state.upsertStep({
        id: outerExecutionId,
        stepId: 'outer_loop',
        stepType: 'foreach',
        status: ExecutionStatus.RUNNING,
        state: { index: 0, total: 1 },
      } as Partial<EsWorkflowStepExecution>);
      service.setStepInput(outerExecutionId, {
        foreach: '{{steps.get_outer_source.output.items}}',
      });
      state.upsertStep({
        id: innerExecutionId,
        stepId: 'inner_loop',
        stepType: 'foreach',
        status: ExecutionStatus.RUNNING,
        state: { index: 0, total: 1 },
      } as Partial<EsWorkflowStepExecution>);
      service.setStepInput(innerExecutionId, {
        foreach: '{{steps.get_inner_source.output.items}}',
      });

      stepExecutionRepository.getStepExecutionsByIds.mockResolvedValue([
        {
          id: 'exec-outer-source',
          output: outerOutput,
          workflowRunId: 'test-workflow-execution-id',
        } as unknown as EsWorkflowStepExecution,
        {
          id: 'exec-inner-source',
          output: innerOutput,
          workflowRunId: 'test-workflow-execution-id',
        } as unknown as EsWorkflowStepExecution,
        {
          id: 'exec-case',
          output: { id: 'case-1' },
          workflowRunId: 'test-workflow-execution-id',
        } as unknown as EsWorkflowStepExecution,
      ]);

      await service.prepareForRead({
        node: deepStepNode,
        predecessorsResolver: (n) => graph.getAllPredecessors(n.id),
      });

      const rehydratedIds = stepExecutionRepository.getStepExecutionsByIds.mock.calls[0][0];
      // All three evicted source steps should be rehydrated
      expect(rehydratedIds).toEqual(
        expect.arrayContaining(['exec-outer-source', 'exec-inner-source', 'exec-case'])
      );
    });

    it('rehydrates outputs referenced by switch case match templates', async () => {
      const workflow = {
        name: 'Switch match dependency',
        version: '1',
        description: 'test',
        enabled: true,
        triggers: [],
        steps: [
          {
            name: 'get_active_alerts',
            type: 'console',
            with: { message: 'alerts' },
          },
          {
            name: 'expected_relation',
            type: 'console',
            with: { message: 'eq' },
          },
          {
            name: 'choose_branch',
            type: 'switch',
            expression: '{{steps.expected_relation.output}}',
            cases: [
              {
                match: '{{steps.get_active_alerts.output.hits.total.relation}}',
                steps: [
                  {
                    name: 'matched_branch',
                    type: 'console',
                    with: { message: 'matched' },
                  },
                ],
              },
            ],
            default: [
              {
                name: 'default_branch',
                type: 'console',
                with: { message: 'default' },
              },
            ],
          },
        ],
      } as unknown as WorkflowYaml;
      const graph = WorkflowGraph.fromWorkflowDefinition(workflow);
      // In the current graph implementation, switch steps produce an atomic node.
      const switchNode = graph.topologicalOrder
        .map((nodeId) => graph.getNode(nodeId))
        .find((n) => n.stepId === 'choose_branch')!;

      const { state, service, stepExecutionRepository } = buildHarness({
        cacheTier: makeSqliteLikeCacheTier(),
      });
      const alertsOutput = { hits: { total: { relation: 'eq' } } };
      seedCompletedStepWithSize(
        state,
        service,
        'exec-alerts',
        'get_active_alerts',
        alertsOutput,
        1,
        'connector'
      );
      seedCompletedStepWithSize(
        state,
        service,
        'exec-relation',
        'expected_relation',
        'eq',
        1,
        'connector'
      );
      await service.flushStepChanges();

      stepExecutionRepository.getStepExecutionsByIds.mockResolvedValue([
        {
          id: 'exec-alerts',
          output: alertsOutput,
          workflowRunId: 'test-workflow-execution-id',
        } as unknown as EsWorkflowStepExecution,
        {
          id: 'exec-relation',
          output: 'eq',
          workflowRunId: 'test-workflow-execution-id',
        } as unknown as EsWorkflowStepExecution,
      ]);

      await service.prepareForRead({
        node: switchNode,
        predecessorsResolver: (n) => graph.getAllPredecessors(n.id),
      });

      const rehydratedIds = stepExecutionRepository.getStepExecutionsByIds.mock.calls[0][0];
      expect(rehydratedIds).toEqual(expect.arrayContaining(['exec-alerts', 'exec-relation']));
      expect(rehydratedIds).toHaveLength(2);
    });

    it('rehydrates outputs referenced by while exit conditions', async () => {
      const workflow = {
        name: 'While exit dependency',
        version: '1',
        description: 'test',
        enabled: true,
        triggers: [],
        steps: [
          {
            name: 'get_active_alerts',
            type: 'console',
            with: { message: 'alerts' },
          },
          {
            name: 'create_new_case',
            type: 'console',
            with: { message: 'case' },
          },
          {
            name: 'check_while',
            type: 'while',
            condition: '{{steps.get_active_alerts.output.hits.total.value}}',
            'max-iterations': 2,
            steps: [
              {
                name: 'while_log',
                type: 'console',
                with: { message: 'case={{steps.create_new_case.output.id}}' },
              },
            ],
          },
        ],
      } as unknown as WorkflowYaml;
      const graph = WorkflowGraph.fromWorkflowDefinition(workflow);
      // In the current graph implementation, while steps produce an atomic node.
      const whileNode = graph.topologicalOrder
        .map((nodeId) => graph.getNode(nodeId))
        .find((n) => n.stepId === 'check_while')!;

      const { state, service, stepExecutionRepository } = buildHarness({
        cacheTier: makeSqliteLikeCacheTier(),
      });
      const alertsOutput = { hits: { total: { value: 5 } } };
      seedCompletedStepWithSize(
        state,
        service,
        'exec-alerts',
        'get_active_alerts',
        alertsOutput,
        1,
        'connector'
      );
      seedCompletedStepWithSize(
        state,
        service,
        'exec-case',
        'create_new_case',
        { id: 'case-1' },
        1,
        'connector'
      );
      await service.flushStepChanges();

      stepExecutionRepository.getStepExecutionsByIds.mockResolvedValue([
        {
          id: 'exec-alerts',
          output: alertsOutput,
          workflowRunId: 'test-workflow-execution-id',
        } as unknown as EsWorkflowStepExecution,
      ]);

      await service.prepareForRead({
        node: whileNode,
        predecessorsResolver: (n) => graph.getAllPredecessors(n.id),
      });

      // Both exec-alerts and exec-case are predecessors of check_while;
      // the new prepareForRead fetches ALL absent predecessors.
      expect(stepExecutionRepository.getStepExecutionsByIds).toHaveBeenCalledWith(
        expect.arrayContaining(['exec-alerts']),
        ['id', 'output', 'workflowRunId']
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

      const { state, service, stepExecutionRepository } = buildHarness({
        cacheTier: makeSqliteLikeCacheTier(),
      });
      seedCompletedStepWithSize(state, service, 'exec-a', 'step_a', { v: 'a' }, 1, 'connector');
      await service.flushStepChanges();
      expect(service.getStepOutput('exec-a')).toBeUndefined();

      stepExecutionRepository.getStepExecutionsByIds.mockResolvedValue([
        {
          id: 'exec-a',
          output: { v: 'a' },
          workflowRunId: 'test-workflow-execution-id',
        } as unknown as EsWorkflowStepExecution,
      ]);

      await service.prepareForRead({
        node: stepBNode,
        predecessorsResolver: (n) => graph.getAllPredecessors(n.id),
      });

      expect(stepExecutionRepository.getStepExecutionsByIds).toHaveBeenCalledWith(
        ['exec-a'],
        ['id', 'output', 'workflowRunId']
      );
    });

    describe('deferred-release: keeps shared predecessors resident', () => {
      // Workflow: step_a -> step_b, step_c, step_d (fanout, all consume step_a)
      function buildFanoutWorkflow() {
        const workflow: WorkflowYaml = {
          name: 'Fanout',
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
              with: { message: '{{steps.step_a.output}}' },
            } as ConnectorStep,
            {
              name: 'step_d',
              type: 'console',
              with: { message: '{{steps.step_a.output}}' },
            } as ConnectorStep,
          ],
        };
        const graph = WorkflowGraph.fromWorkflowDefinition(workflow);
        const lookup = (stepId: string) =>
          graph.topologicalOrder
            .map((nodeId) => graph.getNode(nodeId))
            .find((n) => n.stepId === stepId)!;
        return {
          graph,
          stepBNode: lookup('step_b'),
          stepCNode: lookup('step_c'),
          stepDNode: lookup('step_d'),
        };
      }

      it('rehydrates a shared predecessor only on the first consumer', async () => {
        const { state, service, stepExecutionRepository } = buildHarness({
          cacheTier: makeSqliteLikeCacheTier(),
        });
        const { graph, stepBNode, stepCNode, stepDNode } = buildFanoutWorkflow();

        // Seed step_a, drive through eviction so it ends up absent from RAM.
        seedCompletedStepWithSize(state, service, 'exec-a', 'step_a', { v: 'a' }, 1, 'connector');
        await service.flushStepChanges();
        expect(service.getStepOutput('exec-a')).toBeUndefined();

        stepExecutionRepository.getStepExecutionsByIds.mockResolvedValue([
          {
            id: 'exec-a',
            output: { v: 'a' },
            workflowRunId: 'test-workflow-execution-id',
          } as unknown as EsWorkflowStepExecution,
        ]);

        // Step B reads step_a — first rehydration.
        await service.prepareForRead({
          node: stepBNode,
          predecessorsResolver: (n) => graph.getAllPredecessors(n.id),
        });
        expect(stepExecutionRepository.getStepExecutionsByIds).toHaveBeenCalledTimes(1);

        // Step C also reads step_a — should reuse the in-memory copy.
        await service.prepareForRead({
          node: stepCNode,
          predecessorsResolver: (n) => graph.getAllPredecessors(n.id),
        });
        expect(stepExecutionRepository.getStepExecutionsByIds).toHaveBeenCalledTimes(1);

        // Step D too.
        await service.prepareForRead({
          node: stepDNode,
          predecessorsResolver: (n) => graph.getAllPredecessors(n.id),
        });
        expect(stepExecutionRepository.getStepExecutionsByIds).toHaveBeenCalledTimes(1);
        expect(service.getStepOutput('exec-a')).toEqual({ v: 'a' });
      });

      it('rehydrated outputs remain resident until evicted by another mechanism', async () => {
        // In the new prepareForRead, there is no "transient release" mechanism.
        // Once an output is rehydrated, it stays in memory.
        const workflow: WorkflowYaml = {
          name: 'Selective release',
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
              with: { message: 'static text' },
            } as ConnectorStep,
          ],
        };
        const graph = WorkflowGraph.fromWorkflowDefinition(workflow);
        const stepBNode = graph.topologicalOrder
          .map((nodeId) => graph.getNode(nodeId))
          .find((n) => n.stepId === 'step_b')!;
        const stepCNode = graph.topologicalOrder
          .map((nodeId) => graph.getNode(nodeId))
          .find((n) => n.stepId === 'step_c')!;

        const { state, service, stepExecutionRepository } = buildHarness({
          cacheTier: makeSqliteLikeCacheTier(),
        });
        seedCompletedStepWithSize(state, service, 'exec-a', 'step_a', { v: 'a' }, 1, 'connector');
        await service.flushStepChanges();

        stepExecutionRepository.getStepExecutionsByIds.mockResolvedValue([
          {
            id: 'exec-a',
            output: { v: 'a' },
            workflowRunId: 'test-workflow-execution-id',
          } as unknown as EsWorkflowStepExecution,
        ]);

        // step_b rehydrates step_a.
        await service.prepareForRead({
          node: stepBNode,
          predecessorsResolver: (n) => graph.getAllPredecessors(n.id),
        });
        expect(service.getStepOutput('exec-a')).toEqual({ v: 'a' });

        stepExecutionRepository.getStepExecutionsByIds.mockClear();
        // step_c does not reference step_a, but exec-a IS in memory now.
        // The new prepareForRead does NOT release it — it stays resident.
        await service.prepareForRead({
          node: stepCNode,
          predecessorsResolver: (n) => graph.getAllPredecessors(n.id),
        });

        // exec-a is still in memory (no transient release in new code)
        expect(service.getStepOutput('exec-a')).toEqual({ v: 'a' });
        // step_c has no absent predecessors, so no ES call
        expect(stepExecutionRepository.getStepExecutionsByIds).not.toHaveBeenCalled();
      });

      it('does not refetch on a retry attempt of the same step', async () => {
        // Retry semantics: when a step fails and retries, its predecessors are
        // already resident from the first attempt's prepareForRead. The second
        // call must compute the same neededIds, not re-evict-then-rehydrate.
        const { state, service, stepExecutionRepository } = buildHarness({
          cacheTier: makeSqliteLikeCacheTier(),
        });
        const { graph, stepBNode } = buildFanoutWorkflow();

        seedCompletedStepWithSize(state, service, 'exec-a', 'step_a', { v: 'a' }, 1, 'connector');
        await service.flushStepChanges();

        stepExecutionRepository.getStepExecutionsByIds.mockResolvedValue([
          {
            id: 'exec-a',
            output: { v: 'a' },
            workflowRunId: 'test-workflow-execution-id',
          } as unknown as EsWorkflowStepExecution,
        ]);

        // Attempt 1.
        await service.prepareForRead({
          node: stepBNode,
          predecessorsResolver: (n) => graph.getAllPredecessors(n.id),
        });
        expect(stepExecutionRepository.getStepExecutionsByIds).toHaveBeenCalledTimes(1);

        // Attempt 2 (retry) — same node, same predecessors. No second ES hit.
        await service.prepareForRead({
          node: stepBNode,
          predecessorsResolver: (n) => graph.getAllPredecessors(n.id),
        });
        expect(stepExecutionRepository.getStepExecutionsByIds).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('flush-time transient eviction', () => {
    it('evicts a rehydrated output on the next flush, not immediately after the step', async () => {
      const { state, service, stepExecutionRepository } = buildHarness({
        cacheTier: makeSqliteLikeCacheTier(),
      });

      seedCompletedStepWithSize(state, service, 'exec-a', 'step_a', { v: 'a' }, 100, 'connector');
      await service.flushStepChanges(); // evicts exec-a from outputs (evictFlushedOutputs)
      expect(service.getStepOutput('exec-a')).toBeUndefined();

      // Simulate prepareForRead rehydrating exec-a for the next step
      stepExecutionRepository.getStepExecutionsByIds.mockResolvedValue([
        {
          id: 'exec-a',
          output: { v: 'a' },
          workflowRunId: 'test-workflow-execution-id',
        } as unknown as EsWorkflowStepExecution,
      ]);
      await service.rehydrateOutputs(['exec-a']);
      expect(service.getStepOutput('exec-a')).toEqual({ v: 'a' }); // back in memory

      // exec-a is NOT evicted yet — it stays until the next flush
      expect(service.getStepOutput('exec-a')).toEqual({ v: 'a' });

      // Next flush sweeps out the transient snapshot taken at flush start
      createCompletedStep(state, service, 'exec-b', 'step_b', { v: 'b' }, 'connector');
      await service.flushStepChanges();

      expect(service.getStepOutput('exec-a')).toBeUndefined(); // transient swept out
    });

    it('rehydrated output is reusable by multiple steps within the same flush window', async () => {
      const { state, service, stepExecutionRepository } = buildHarness({
        cacheTier: makeSqliteLikeCacheTier(),
      });

      seedCompletedStepWithSize(state, service, 'exec-a', 'step_a', { v: 'a' }, 100, 'connector');
      await service.flushStepChanges();

      stepExecutionRepository.getStepExecutionsByIds.mockResolvedValue([
        {
          id: 'exec-a',
          output: { v: 'a' },
          workflowRunId: 'test-workflow-execution-id',
        } as unknown as EsWorkflowStepExecution,
      ]);
      await service.rehydrateOutputs(['exec-a']); // first step loads it

      // Second step in the same flush window calls rehydrateOutputs for the same ID
      stepExecutionRepository.getStepExecutionsByIds.mockClear();
      await service.rehydrateOutputs(['exec-a']); // exec-a already in outputs — no IPC needed

      expect(stepExecutionRepository.getStepExecutionsByIds).not.toHaveBeenCalled();
      expect(service.getStepOutput('exec-a')).toEqual({ v: 'a' });
    });

    it('is a no-op in RAM-only mode (spills=false) — outputs are never evicted', async () => {
      const { state, service } = buildHarness(); // no cacheTier → spills=false

      createCompletedStep(state, service, 'exec-a', 'step_a', { v: 'a' }, 'connector');
      await service.flushStepChanges(); // eviction block is skipped in RAM-only mode

      // In RAM-only mode outputs stay resident for the entire workflow run
      expect(service.getStepOutput('exec-a')).toEqual({ v: 'a' });
    });

    it('updates size stats when a transient output is evicted at flush', async () => {
      const { state, service, stepExecutionRepository } = buildHarness({
        cacheTier: makeSqliteLikeCacheTier(),
      });

      seedCompletedStepWithSize(state, service, 'exec-a', 'step_a', { v: 'a' }, 500, 'connector');
      await service.flushStepChanges(); // exec-a evicted; size cleared

      stepExecutionRepository.getStepExecutionsByIds.mockResolvedValue([
        {
          id: 'exec-a',
          output: { v: 'a' },
          workflowRunId: 'test-workflow-execution-id',
        } as unknown as EsWorkflowStepExecution,
      ]);
      await service.rehydrateOutputs(['exec-a']);
      const rehydratedSize = service.getOutputSizeStats().totalBytes;
      expect(rehydratedSize).toBeGreaterThan(0); // size recomputed on rehydration

      // Next flush evicts the transient and clears its size
      createCompletedStep(state, service, 'exec-b', 'step_b', { v: 'b' }, 'connector');
      await service.flushStepChanges();

      expect(service.getOutputSizeStats().totalBytes).toBe(0);
      expect(service.getOutputSizeStats().stepCount).toBe(0);
    });

    it('allows re-rehydration after the transient is swept — shared predecessor across flush boundaries', async () => {
      const { state, service, stepExecutionRepository } = buildHarness({
        cacheTier: makeSqliteLikeCacheTier(),
      });

      seedCompletedStepWithSize(state, service, 'exec-a', 'step_a', { v: 'a' }, 100, 'connector');
      await service.flushStepChanges();

      const rehydrateA = () =>
        stepExecutionRepository.getStepExecutionsByIds.mockResolvedValue([
          {
            id: 'exec-a',
            output: { v: 'a' },
            workflowRunId: 'test-workflow-execution-id',
          } as unknown as EsWorkflowStepExecution,
        ]);

      // First flush window: rehydrate and sweep
      rehydrateA();
      await service.rehydrateOutputs(['exec-a']);
      expect(service.getStepOutput('exec-a')).toEqual({ v: 'a' });
      createCompletedStep(state, service, 'exec-b', 'step_b', { v: 'b' }, 'connector');
      await service.flushStepChanges(); // exec-a swept out
      expect(service.getStepOutput('exec-a')).toBeUndefined();

      // Second flush window: exec-a must be re-rehydratable
      rehydrateA();
      await service.rehydrateOutputs(['exec-a']);
      expect(service.getStepOutput('exec-a')).toEqual({ v: 'a' });
    });
  });

  describe('scope-frame rehydration guard', () => {
    it('does NOT fetch scope-frame IDs when no step execution exists (timeout zone pattern)', async () => {
      // Regression: enterTimeoutZone nodes never call startStep/finishStep so their
      // step execution is never recorded in state. The scope-frame path in
      // prepareForRead must not add those IDs to idsToFetch — doing so causes
      // spurious ES round-trips and ERROR log noise.
      const { state, service, stepExecutionRepository } = buildHarness({
        cacheTier: makeSqliteLikeCacheTier(),
      });

      // Simulate a workflow_level_timeout scope frame (as enterTimeoutZone pushes onto scope)
      const timeoutScopeFrame: StackFrame = {
        stepId: 'workflow_level_timeout',
        nestedScopes: [
          { nodeId: 'enterTimeoutZone_workflow_level_timeout', nodeType: 'enter-timeout-zone', scopeId: '' },
        ],
      };
      state.updateWorkflowExecution({ scopeStack: [timeoutScopeFrame] });

      // No step execution is registered for the timeout node (it never calls startStep)

      const fakeNode = { id: 'some_step', stepId: 'some_step', stepType: 'connector' };

      await service.prepareForRead({
        node: fakeNode as Parameters<typeof service.prepareForRead>[0]['node'],
        predecessorsResolver: () => [],
      });

      // No ES fetch should have been made — the timeout-zone scope frame had no
      // step execution in state so it must be silently skipped.
      expect(stepExecutionRepository.getStepExecutionsByIds).not.toHaveBeenCalled();
    });

    it('DOES fetch scope-frame IDs when a step execution exists and output was evicted (foreach pattern)', async () => {
      const { state, service, stepExecutionRepository } = buildHarness({
        cacheTier: makeSqliteLikeCacheTier(),
      });

      const foreachScopeFrame: StackFrame = {
        stepId: 'my_loop',
        nestedScopes: [
          { nodeId: 'enterForeach_my_loop', nodeType: 'enter-foreach', scopeId: '0' },
        ],
      };
      state.updateWorkflowExecution({ scopeStack: [foreachScopeFrame] });

      const foreachExecId = buildStepExecutionId(state.getWorkflowExecutionId(), 'my_loop', []);
      // Register the step execution (startStep equivalent)
      state.upsertStep({
        id: foreachExecId,
        stepId: 'my_loop',
        stepType: 'foreach',
        status: ExecutionStatus.RUNNING,
      } as Partial<EsWorkflowStepExecution>);
      // Output is absent from this.outputs (no setStepOutput call) → should be fetched

      const fakeNode = { id: 'inner_step', stepId: 'inner_step', stepType: 'connector' };
      await service.prepareForRead({
        node: fakeNode as Parameters<typeof service.prepareForRead>[0]['node'],
        predecessorsResolver: () => [],
      });

      // The foreach scope frame SHOULD be fetched because its step execution exists
      expect(stepExecutionRepository.getStepExecutionsByIds).toHaveBeenCalledWith(
        expect.arrayContaining([foreachExecId]),
        expect.arrayContaining(['output'])
      );
    });
  });
});
