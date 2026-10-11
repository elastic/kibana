/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ExecutionStatus } from '@kbn/workflows';
import type { EsWorkflowExecution, EsWorkflowStepExecution } from '@kbn/workflows';
import type { StepExecutionRepository } from '../../repositories/step_execution_repository';
import type { WorkflowExecutionRepository } from '../../repositories/workflow_execution_repository';
import { StepIoService } from '../step_io_service';
import { WorkflowExecutionState } from '../workflow_execution_state';

/**
 * Builds a state + service pair backed by jest-mock repositories. Returns
 * the service under test plus the state so suites can seed step docs via
 * the existing `upsertStep` API.
 */
function buildHarness(opts: { maxBytes?: number } = {}) {
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
  const service = new StepIoService({
    stepRepository: stepExecutionRepository,
    state,
    maxBytes: opts.maxBytes ?? Infinity,
  });

  return { state, service, stepExecutionRepository, workflowExecutionRepository };
}

describe('StepIoService', () => {
  describe('IO reads/writes', () => {
    it('returns a written output', () => {
      const { service } = buildHarness();
      service.write('step-1', 'output', { hello: 'world' });
      expect(service.read('step-1', 'output')).toEqual({ hello: 'world' });
    });

    it('returns a written input', () => {
      const { service } = buildHarness();
      service.write('step-1', 'input', { foo: 'bar' });
      expect(service.read('step-1', 'input')).toEqual({ foo: 'bar' });
    });

    it('routes outputs to both the cache and state, and inputs to state only', () => {
      const { state, service } = buildHarness();
      service.write('step-1', 'input', { foo: 'bar' });
      service.write('step-1', 'output', { result: 'ok' });

      expect(state.getStepIo('step-1', 'input')).toEqual({ foo: 'bar' });
      expect(state.getStepIo('step-1', 'output')).toEqual({ result: 'ok' });
    });

    it('returns undefined for IO that was never written', () => {
      const { service } = buildHarness();
      expect(service.read('missing', 'output')).toBeUndefined();
      expect(service.read('missing', 'input')).toBeUndefined();
    });

    it('distinguishes a null output from a missing output', () => {
      const { service } = buildHarness();
      service.write('step-1', 'output', null);
      expect(service.read('step-1', 'output')).toBeNull();
    });

    it('falls back to state when the cache cannot retain the output', () => {
      const { service } = buildHarness({ maxBytes: 0 });
      service.write('step-1', 'output', { big: 'x'.repeat(100) });
      // Not flushed yet, so state still holds the output.
      expect(service.read('step-1', 'output')).toEqual({ big: 'x'.repeat(100) });
    });

    it('returns step error via service when state holds the error', () => {
      const { state, service } = buildHarness();
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
      service.write('exec-1', 'input', { i: 1 });
      service.write('exec-1', 'output', { o: 'first' });
      state.upsertStep({
        id: 'exec-2',
        stepId: 'loopStep',
        stepType: 'connector',
        status: ExecutionStatus.COMPLETED,
      });
      service.write('exec-2', 'input', { i: 2 });
      service.write('exec-2', 'output', { o: 'second' });

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
  });

  describe('getOutputSizeStats', () => {
    it('records the measured size of written outputs', () => {
      const { service } = buildHarness();
      service.write('step-1', 'output', { result: 'ok' }, 12);

      expect(service.getOutputSizeStats()).toEqual({ totalBytes: 12, stepCount: 1 });
    });

    it('does not record a size when the caller measured none', () => {
      const { service } = buildHarness();
      service.write('step-1', 'output', null);

      expect(service.getOutputSizeStats()).toEqual({ totalBytes: 0, stepCount: 0 });
    });

    it('replaces the recorded size when an output is rewritten', () => {
      const { service } = buildHarness();
      service.write('step-1', 'output', { v: 1 }, 10);
      service.write('step-1', 'output', { v: 2 }, 25);

      expect(service.getOutputSizeStats()).toEqual({ totalBytes: 25, stepCount: 1 });
    });

    it('ignores negative or non-finite sizes', () => {
      const { service } = buildHarness();
      service.write('step-1', 'output', { ok: true }, -1);
      service.write('step-1', 'output', { ok: true }, NaN);
      service.write('step-1', 'output', { ok: true }, Infinity);

      expect(service.getOutputSizeStats()).toEqual({ totalBytes: 0, stepCount: 0 });
    });

    it('does not record input sizes', () => {
      const { service } = buildHarness();
      service.write('step-1', 'input', { in: true }, 50);

      expect(service.getOutputSizeStats()).toEqual({ totalBytes: 0, stepCount: 0 });
    });
  });

  describe('rehydrate', () => {
    it('fetches uncached outputs from the repository and makes them readable', async () => {
      const { service, stepExecutionRepository } = buildHarness();
      stepExecutionRepository.getStepExecutionsByIds.mockResolvedValue([
        { id: 'a', output: { v: 1 } } as unknown as EsWorkflowStepExecution,
      ]);

      await service.rehydrate(['a']);

      expect(stepExecutionRepository.getStepExecutionsByIds).toHaveBeenCalledWith(
        ['a'],
        ['id', 'output']
      );
      expect(service.read('a', 'output')).toEqual({ v: 1 });
    });

    it('is a no-op when every requested output is already cached', async () => {
      const { service, state, stepExecutionRepository } = buildHarness();
      service.write('a', 'output', { v: 1 });
      // Simulate a flush: the output lives only in the cache now.
      state.clearFlushedOutputs(['a']);

      await service.rehydrate(['a']);

      expect(stepExecutionRepository.getStepExecutionsByIds).not.toHaveBeenCalled();
      expect(service.read('a', 'output')).toEqual({ v: 1 });
    });

    it('skips outputs that are still held in state because they were not flushed yet', async () => {
      const { service, state, stepExecutionRepository } = buildHarness();
      state.setStepIo('a', { output: { v: 1 } });

      await service.rehydrate(['a']);

      expect(stepExecutionRepository.getStepExecutionsByIds).not.toHaveBeenCalled();
      expect(service.read('a', 'output')).toEqual({ v: 1 });
    });

    it('does not call the repository for an empty id list', async () => {
      const { service, stepExecutionRepository } = buildHarness();

      await service.rehydrate([]);

      expect(stepExecutionRepository.getStepExecutionsByIds).not.toHaveBeenCalled();
    });

    it('restores a document without output as null', async () => {
      const { service, stepExecutionRepository } = buildHarness();
      stepExecutionRepository.getStepExecutionsByIds.mockResolvedValue([
        { id: 'a' } as unknown as EsWorkflowStepExecution,
      ]);

      await service.rehydrate(['a']);

      expect(service.read('a', 'output')).toBeNull();
    });

    it('handles missing documents gracefully', async () => {
      const { service } = buildHarness();

      await expect(service.rehydrate(['ghost'])).resolves.toBeUndefined();
      expect(service.read('ghost', 'output')).toBeUndefined();
    });

    it('does not overwrite an output that was written while the fetch was in flight', async () => {
      const { service, stepExecutionRepository } = buildHarness();
      stepExecutionRepository.getStepExecutionsByIds.mockImplementation(async () => {
        service.write('a', 'output', { fresh: true });
        return [{ id: 'a', output: { stale: true } } as unknown as EsWorkflowStepExecution];
      });

      await service.rehydrate(['a']);

      expect(service.read('a', 'output')).toEqual({ fresh: true });
    });

    it('keeps outputs readable when the budget cannot hold them', async () => {
      const { service, stepExecutionRepository } = buildHarness({ maxBytes: 0 });
      stepExecutionRepository.getStepExecutionsByIds.mockResolvedValue([
        { id: 'a', output: { v: 'a' } } as unknown as EsWorkflowStepExecution,
      ]);

      await service.rehydrate(['a']);

      expect(service.read('a', 'output')).toEqual({ v: 'a' });
    });

    it('drops read-scoped overflow once a later rehydrate no longer requests it', async () => {
      const { service, stepExecutionRepository } = buildHarness({ maxBytes: 0 });
      stepExecutionRepository.getStepExecutionsByIds
        .mockResolvedValueOnce([
          { id: 'a', output: { v: 'a' } } as unknown as EsWorkflowStepExecution,
        ])
        .mockResolvedValueOnce([
          { id: 'b', output: { v: 'b' } } as unknown as EsWorkflowStepExecution,
        ]);

      await service.rehydrate(['a']);
      await service.rehydrate(['b']);

      expect(service.read('b', 'output')).toEqual({ v: 'b' });
      expect(service.read('a', 'output')).toBeUndefined();
    });

    it('re-fetches requested outputs that were evicted by the inserts of the same call', async () => {
      const { service, state, stepExecutionRepository } = buildHarness({ maxBytes: 100 });
      // `a` is resident and already flushed, so only the cache holds it.
      service.write('a', 'output', { v: 'a' }, 95);
      state.clearFlushedOutputs(['a']);
      stepExecutionRepository.getStepExecutionsByIds
        // First fetch: `b` is the only cache miss. Inserting it pushes `a` out of the budget.
        .mockResolvedValueOnce([
          { id: 'b', output: { v: 'b' } } as unknown as EsWorkflowStepExecution,
        ])
        // Second fetch: the evicted resident `a`.
        .mockResolvedValueOnce([
          { id: 'a', output: { v: 'a' } } as unknown as EsWorkflowStepExecution,
        ]);

      await service.rehydrate(['a', 'b']);

      expect(stepExecutionRepository.getStepExecutionsByIds).toHaveBeenNthCalledWith(
        1,
        ['b'],
        ['id', 'output']
      );
      expect(stepExecutionRepository.getStepExecutionsByIds).toHaveBeenNthCalledWith(
        2,
        ['a'],
        ['id', 'output']
      );
      expect(service.read('a', 'output')).toEqual({ v: 'a' });
      expect(service.read('b', 'output')).toEqual({ v: 'b' });
    });
  });
});
