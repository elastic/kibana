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
    getWorkflowExecutionCancelState: jest.fn().mockResolvedValue(undefined),
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
    it('returns a written output', async () => {
      const { service } = buildHarness();
      service.write('step-1', 'output', { hello: 'world' });
      expect((await service.readBatch(['step-1'], 'output')).get('step-1')).toEqual({
        hello: 'world',
      });
    });

    it('returns a written input', async () => {
      const { service } = buildHarness();
      service.write('step-1', 'input', { foo: 'bar' });
      expect((await service.readBatch(['step-1'], 'input')).get('step-1')).toEqual({ foo: 'bar' });
    });

    it('routes outputs to both the cache and state, and inputs to state only', () => {
      const { state, service } = buildHarness();
      service.write('step-1', 'input', { foo: 'bar' });
      service.write('step-1', 'output', { result: 'ok' });

      expect(state.getStepIo('step-1', 'input')).toEqual({ foo: 'bar' });
      expect(state.getStepIo('step-1', 'output')).toEqual({ result: 'ok' });
    });

    it('omits IO that was never written', async () => {
      const { service } = buildHarness();
      expect((await service.readBatch(['missing'], 'output')).has('missing')).toBe(false);
      expect((await service.readBatch(['missing'], 'input')).has('missing')).toBe(false);
    });

    it('distinguishes a null output from a missing output', async () => {
      const { service } = buildHarness();
      service.write('step-1', 'output', null);
      expect((await service.readBatch(['step-1'], 'output')).get('step-1')).toBeNull();
    });

    it('returns a state output the LRU refused without fetching', async () => {
      const { service, stepExecutionRepository } = buildHarness({ maxBytes: 0 });
      service.write('step-1', 'output', { big: 'x'.repeat(100) });
      // Not flushed yet, so state still holds the output.
      expect((await service.readBatch(['step-1'], 'output')).get('step-1')).toEqual({
        big: 'x'.repeat(100),
      });
      expect(stepExecutionRepository.getStepExecutionsByIds).not.toHaveBeenCalled();
    });

    it('returns a step error from the loaded execution without fetching', async () => {
      const { state, service, stepExecutionRepository } = buildHarness();
      state.upsertStep({
        id: 'step-1',
        stepId: 'myStep',
        stepType: 'connector',
        status: ExecutionStatus.FAILED,
        error: { type: 'BadThing', message: 'boom' },
      } as Partial<EsWorkflowStepExecution>);
      expect((await service.readBatch(['step-1'], 'error')).get('step-1')).toEqual({
        type: 'BadThing',
        message: 'boom',
      });
      expect(stepExecutionRepository.getStepExecutionsByIds).not.toHaveBeenCalled();
    });

    it('fetches an error for a step execution that is not loaded', async () => {
      const { service, stepExecutionRepository } = buildHarness();
      stepExecutionRepository.getStepExecutionsByIds.mockResolvedValue([
        { id: 'step-1', error: { type: 'BadThing', message: 'boom' } } as EsWorkflowStepExecution,
      ]);

      expect((await service.readBatch(['step-1'], 'error')).get('step-1')).toEqual({
        type: 'BadThing',
        message: 'boom',
      });
      expect(stepExecutionRepository.getStepExecutionsByIds).toHaveBeenCalledWith(
        ['step-1'],
        ['id', 'error']
      );
    });

    it('omits an error when the step execution does not exist', async () => {
      const { service } = buildHarness();
      expect((await service.readBatch(['does-not-exist'], 'error')).has('does-not-exist')).toBe(
        false
      );
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

  describe('readBatch', () => {
    it('fetches uncached outputs and keeps a fitting output in the LRU', async () => {
      const { service, stepExecutionRepository } = buildHarness();
      stepExecutionRepository.getStepExecutionsByIds.mockResolvedValue([
        { id: 'a', output: { v: 1 } } as unknown as EsWorkflowStepExecution,
      ]);

      expect((await service.readBatch(['a'], 'output')).get('a')).toEqual({ v: 1 });
      expect(stepExecutionRepository.getStepExecutionsByIds).toHaveBeenCalledWith(
        ['a'],
        ['id', 'output']
      );

      stepExecutionRepository.getStepExecutionsByIds.mockClear();
      expect((await service.readBatch(['a'], 'output')).get('a')).toEqual({ v: 1 });
      expect(stepExecutionRepository.getStepExecutionsByIds).not.toHaveBeenCalled();
    });

    it('does not fetch an output that is already cached', async () => {
      const { service, state, stepExecutionRepository } = buildHarness();
      service.write('a', 'output', { v: 1 });
      // Simulate a flush: the output lives only in the cache now.
      state.clearFlushedOutputs(['a']);

      expect((await service.readBatch(['a'], 'output')).get('a')).toEqual({ v: 1 });
      expect(stepExecutionRepository.getStepExecutionsByIds).not.toHaveBeenCalled();
    });

    it('does not fetch an output that is still held in state', async () => {
      const { service, state, stepExecutionRepository } = buildHarness();
      state.setStepIo('a', { output: { v: 1 } });

      expect((await service.readBatch(['a'], 'output')).get('a')).toEqual({ v: 1 });
      expect(stepExecutionRepository.getStepExecutionsByIds).not.toHaveBeenCalled();
    });

    it('does not call the repository for an empty id list', async () => {
      const { service, stepExecutionRepository } = buildHarness();

      await service.readBatch([], 'output');

      expect(stepExecutionRepository.getStepExecutionsByIds).not.toHaveBeenCalled();
    });

    it('returns a document without output as null and keeps that null cached', async () => {
      const { service, stepExecutionRepository } = buildHarness();
      stepExecutionRepository.getStepExecutionsByIds.mockResolvedValue([
        { id: 'a' } as unknown as EsWorkflowStepExecution,
      ]);

      expect((await service.readBatch(['a'], 'output')).get('a')).toBeNull();

      stepExecutionRepository.getStepExecutionsByIds.mockClear();
      expect((await service.readBatch(['a'], 'output')).get('a')).toBeNull();
      expect(stepExecutionRepository.getStepExecutionsByIds).not.toHaveBeenCalled();
    });

    it('omits documents the repository does not return', async () => {
      const { service } = buildHarness();

      expect((await service.readBatch(['ghost'], 'output')).has('ghost')).toBe(false);
    });

    it('does not overwrite an output that was written while the fetch was in flight', async () => {
      const { service, stepExecutionRepository } = buildHarness();
      stepExecutionRepository.getStepExecutionsByIds.mockImplementation(async () => {
        service.write('a', 'output', { fresh: true });
        return [{ id: 'a', output: { stale: true } } as unknown as EsWorkflowStepExecution];
      });

      expect((await service.readBatch(['a'], 'output')).get('a')).toEqual({ fresh: true });
    });

    it('returns an oversized output in the map and leaves it out of the LRU', async () => {
      const { service, stepExecutionRepository } = buildHarness({ maxBytes: 0 });
      stepExecutionRepository.getStepExecutionsByIds.mockResolvedValue([
        { id: 'a', output: { v: 'a' } } as unknown as EsWorkflowStepExecution,
      ]);

      expect((await service.readBatch(['a'], 'output')).get('a')).toEqual({ v: 'a' });

      stepExecutionRepository.getStepExecutionsByIds.mockClear();
      await service.readBatch(['a'], 'output');
      expect(stepExecutionRepository.getStepExecutionsByIds).toHaveBeenCalledWith(
        ['a'],
        ['id', 'output']
      );
    });

    it('keeps a resident output in the returned map when the same batch evicts it', async () => {
      const { service, state, stepExecutionRepository } = buildHarness({ maxBytes: 100 });
      service.write('a', 'output', { v: 'a' }, 95);
      state.clearFlushedOutputs(['a']);
      stepExecutionRepository.getStepExecutionsByIds.mockResolvedValue([
        { id: 'b', output: { v: 'b' } } as unknown as EsWorkflowStepExecution,
      ]);

      const batch = await service.readBatch(['a', 'b'], 'output');

      expect(stepExecutionRepository.getStepExecutionsByIds).toHaveBeenCalledTimes(1);
      expect(batch.get('a')).toEqual({ v: 'a' });
      expect(batch.get('b')).toEqual({ v: 'b' });

      stepExecutionRepository.getStepExecutionsByIds.mockClear();
      const again = await service.readBatch(['a', 'b'], 'output');
      expect(again.get('b')).toEqual({ v: 'b' });
      expect(stepExecutionRepository.getStepExecutionsByIds).toHaveBeenCalledWith(
        ['a'],
        ['id', 'output']
      );
    });

    it('fetches an input that state dropped after the step finished', async () => {
      const { service, state, stepExecutionRepository } = buildHarness();
      state.upsertStep({
        id: 'a',
        stepId: 'foreach',
        stepType: 'foreach',
        status: ExecutionStatus.COMPLETED,
      } as Partial<EsWorkflowStepExecution>);
      service.write('a', 'input', { items: [1] });
      state.clearFlushedOutputs(['a']);
      stepExecutionRepository.getStepExecutionsByIds.mockResolvedValue([
        { id: 'a', input: { items: [1] } } as unknown as EsWorkflowStepExecution,
      ]);

      expect((await service.readBatch(['a'], 'input')).get('a')).toEqual({ items: [1] });
      expect(stepExecutionRepository.getStepExecutionsByIds).toHaveBeenCalledWith(
        ['a'],
        ['id', 'input']
      );
    });
  });
});
