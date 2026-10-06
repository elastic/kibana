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
  it('keeps every rehydrated output readable when the set exceeds the budget', async () => {
    const docs = [
      { id: 'a', output: { v: 'a'.repeat(50) } },
      { id: 'b', output: { v: 'b'.repeat(50) } },
      { id: 'c', output: { v: 'c'.repeat(50) } },
    ];
    const { service } = buildService(80, docs);

    await service.rehydrate(['a', 'b', 'c']);

    expect(service.read('a', 'output')).toEqual(docs[0].output);
    expect(service.read('b', 'output')).toEqual(docs[1].output);
    expect(service.read('c', 'output')).toEqual(docs[2].output);
  });

  it('keeps outputs readable with a zero budget', async () => {
    const { service } = buildService(0, [{ id: 'a', output: { v: 1 } }]);

    await service.rehydrate(['a']);

    expect(service.read('a', 'output')).toEqual({ v: 1 });
  });

  it('does not throw for empty outputs', async () => {
    const { service } = buildService(100, [{ id: 'a', output: null }]);

    await expect(service.rehydrate(['a'])).resolves.toBeUndefined();
    expect(service.read('a', 'output')).toBeNull();
  });

  it('reports execution-wide output sizes regardless of eviction', () => {
    const { service } = buildService(100, []);

    service.write('a', 'output', { v: 1 }, 90);
    service.write('b', 'output', { v: 2 }, 90);
    service.write('c', 'output', { v: 3 });

    expect(service.getOutputSizeStats()).toEqual({ totalBytes: 180, stepCount: 2 });
  });
});
