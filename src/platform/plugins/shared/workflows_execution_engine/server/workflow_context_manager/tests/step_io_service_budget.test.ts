/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { StepExecutionRepository } from '../../repositories/step_execution_repository';
import { StepIoService } from '../step_io_service';
import type { WorkflowExecutionState } from '../workflow_execution_state';

const buildService = (maxBytes: number, docs: Array<{ id: string; output: unknown }>) => {
  const stepRepository = {
    getStepExecutionsByIds: jest.fn().mockResolvedValue(docs),
  } as unknown as jest.Mocked<StepExecutionRepository>;
  const state = {
    setStepIo: jest.fn(),
    getStepIo: jest.fn().mockReturnValue(undefined),
  } as unknown as jest.Mocked<WorkflowExecutionState>;
  return { service: new StepIoService({ stepRepository, state, maxBytes }), stepRepository };
};

describe('StepIoService cache budget', () => {
  it('returns every output and keeps only what fits in the LRU', async () => {
    const docs = [
      { id: 'a', output: { v: 'a'.repeat(50) } },
      { id: 'b', output: { v: 'b'.repeat(50) } },
      { id: 'c', output: { v: 'c'.repeat(50) } },
    ];
    const { service, stepRepository } = buildService(80, docs);

    const batch = await service.readBatch(['a', 'b', 'c'], 'output');

    expect(batch.get('a')).toEqual(docs[0].output);
    expect(batch.get('b')).toEqual(docs[1].output);
    expect(batch.get('c')).toEqual(docs[2].output);

    stepRepository.getStepExecutionsByIds.mockClear();
    await service.readBatch(['a', 'b', 'c'], 'output');
    const refetched = stepRepository.getStepExecutionsByIds.mock.calls[0]?.[0] ?? [];
    expect(refetched.length).toBeLessThan(3);
  });

  it('returns an output that cannot fit and fetches it again afterwards', async () => {
    const { service, stepRepository } = buildService(0, [{ id: 'a', output: { v: 1 } }]);

    expect((await service.readBatch(['a'], 'output')).get('a')).toEqual({ v: 1 });

    stepRepository.getStepExecutionsByIds.mockClear();
    await service.readBatch(['a'], 'output');

    expect(stepRepository.getStepExecutionsByIds).toHaveBeenCalledWith(['a'], ['id', 'output']);
  });

  it('keeps an empty output that fits the budget', async () => {
    const { service, stepRepository } = buildService(100, [{ id: 'a', output: null }]);

    expect((await service.readBatch(['a'], 'output')).get('a')).toBeNull();

    stepRepository.getStepExecutionsByIds.mockClear();
    expect((await service.readBatch(['a'], 'output')).get('a')).toBeNull();
    expect(stepRepository.getStepExecutionsByIds).not.toHaveBeenCalled();
  });

  it('reports execution-wide output sizes regardless of eviction', () => {
    const { service } = buildService(100, []);

    service.write('a', 'output', { v: 1 }, 90);
    service.write('b', 'output', { v: 2 }, 90);
    service.write('c', 'output', { v: 3 });

    expect(service.getOutputSizeStats()).toEqual({ totalBytes: 180, stepCount: 2 });
  });
});
