/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { errors as esErrors } from '@elastic/elasticsearch';
import type { ElasticsearchClient } from '@kbn/core/server';
import { buildCheckpointId, dataLoadCheckpointStepDefinition } from './data_load_checkpoint_step';
import type { StepHandlerContext } from '../../step_registry/types';

const input = {
  index: 'github-intel-sync-state',
  source: 'github-catalog-repos',
  entity_type: 'repo',
  org: 'elastic/security',
};

const createContext = (get: jest.Mock): StepHandlerContext<any, any> => ({
  input,
  config: {},
  rawInput: input,
  contextManager: {
    getContext: jest.fn(),
    getFakeRequest: jest.fn(),
    getScopedEsClient: jest.fn(() => ({ get } as unknown as ElasticsearchClient)),
    renderInputTemplate: jest.fn((value) => value),
    callKibanaApi: jest.fn(),
  },
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
  abortSignal: new AbortController().signal,
  stepId: 'checkpoint',
  stepType: 'data.loadCheckpoint',
});

describe('dataLoadCheckpointStepDefinition', () => {
  it('builds a deterministic path-safe id from the checkpoint identity', () => {
    expect(buildCheckpointId(input)).toBe('github-catalog-repos:repo:elastic%2Fsecurity');
    expect(buildCheckpointId(input)).toBe(buildCheckpointId({ ...input }));
  });

  it('loads the checkpoint and exposes its source fields directly', async () => {
    const get = jest.fn().mockResolvedValue({
      _source: { cursor: 'cursor-42', updated_at: '2026-08-13T00:00:00Z' },
    });

    const result = await dataLoadCheckpointStepDefinition.handler(createContext(get));

    expect(get).toHaveBeenCalledWith({
      index: 'github-intel-sync-state',
      id: 'github-catalog-repos:repo:elastic%2Fsecurity',
    });
    expect(result).toEqual({
      output: { cursor: 'cursor-42', updated_at: '2026-08-13T00:00:00Z' },
    });
  });

  it('returns an empty first-run state when the checkpoint does not exist', async () => {
    const error = new esErrors.ResponseError({
      body: { found: false },
      statusCode: 404,
      headers: {},
      warnings: null,
      meta: {} as never,
    });
    const result = await dataLoadCheckpointStepDefinition.handler(
      createContext(jest.fn().mockRejectedValue(error))
    );

    expect(result).toEqual({ output: {} });
  });

  it.each([null, 'bad', [], 42])('fails when _source is malformed: %p', async (_source) => {
    const result = await dataLoadCheckpointStepDefinition.handler(
      createContext(jest.fn().mockResolvedValue({ _source }))
    );

    expect(result.error?.message).toContain('malformed _source');
  });

  it('surfaces non-404 Elasticsearch errors', async () => {
    const result = await dataLoadCheckpointStepDefinition.handler(
      createContext(jest.fn().mockRejectedValue(new Error('cluster unavailable')))
    );

    expect(result.error?.message).toBe('cluster unavailable');
  });
});
