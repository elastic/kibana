/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { SOURCES_TYPES } from '@kbn/esql-types';
import { EsqlService } from './esql_service';

const makeClient = (resolveIndexMock: jest.Mock) =>
  ({ indices: { resolveIndex: resolveIndexMock } } as unknown as ElasticsearchClient);

const emptyResponse = { indices: [], aliases: [], data_streams: [] };

describe('EsqlService.getAllIndices', () => {
  it('passes filter_path to limit response payload on both resolveIndex calls', async () => {
    const resolveIndex = jest.fn().mockResolvedValue(emptyResponse);
    const service = new EsqlService({ client: makeClient(resolveIndex) });

    await service.getAllIndices('local');

    expect(resolveIndex).toHaveBeenCalledTimes(2);
    expect(resolveIndex).toHaveBeenCalledWith(
      expect.objectContaining({
        expand_wildcards: 'all',
        filter_path: ['indices.name', 'indices.mode'],
      })
    );
    expect(resolveIndex).toHaveBeenCalledWith(
      expect.objectContaining({
        expand_wildcards: 'open',
        filter_path: [
          'indices.name',
          'indices.mode',
          'aliases.name',
          'data_streams.name',
          'data_streams.backing_indices',
        ],
      })
    );
  });

  it('correctly identifies time_series data streams via the hidden backing index mode map', async () => {
    const resolveIndex = jest
      .fn()
      .mockResolvedValueOnce({
        indices: [
          { name: '.ds-metrics-001', mode: 'time_series' },
          { name: 'logs-000001', mode: undefined },
        ],
        aliases: [],
        data_streams: [],
      })
      .mockResolvedValueOnce({
        indices: [],
        aliases: [],
        data_streams: [
          { name: 'metrics', backing_indices: ['.ds-metrics-001'] },
          { name: 'logs', backing_indices: ['logs-000001'] },
        ],
      });

    const service = new EsqlService({ client: makeClient(resolveIndex) });
    const result = await service.getAllIndices('local');

    expect(result.find((r) => r.name === 'metrics')?.type).toBe(SOURCES_TYPES.TIMESERIES);
    expect(result.find((r) => r.name === 'logs')?.type).toBe(SOURCES_TYPES.DATA_STREAM);
  });

  it('forwards projectRouting to both resolveIndex calls when provided', async () => {
    const resolveIndex = jest.fn().mockResolvedValue(emptyResponse);
    const service = new EsqlService({ client: makeClient(resolveIndex) });

    await service.getAllIndices('local', 'my-project');

    expect(resolveIndex).toHaveBeenCalledTimes(2);
    expect(resolveIndex).toHaveBeenCalledWith(
      expect.objectContaining({ project_routing: 'my-project' })
    );
    expect(resolveIndex).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ project_routing: 'my-project' })
    );
  });

  it('queries remote clusters when scope is all', async () => {
    const resolveIndex = jest.fn().mockResolvedValue(emptyResponse);
    const service = new EsqlService({ client: makeClient(resolveIndex) });

    await service.getAllIndices('all');

    expect(resolveIndex).toHaveBeenCalledWith(expect.objectContaining({ name: ['*', '*:*'] }));
  });
});
