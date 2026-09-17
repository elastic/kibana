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
      }),
      { signal: undefined }
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
      }),
      { signal: undefined }
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
      expect.objectContaining({ project_routing: 'my-project' }),
      { signal: undefined }
    );
    expect(resolveIndex).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ project_routing: 'my-project' }),
      { signal: undefined }
    );
  });

  it('forwards the abort signal to both resolveIndex calls when provided', async () => {
    const resolveIndex = jest.fn().mockResolvedValue(emptyResponse);
    const service = new EsqlService({ client: makeClient(resolveIndex) });
    const signal = new AbortController().signal;

    await service.getAllIndices('local', undefined, signal);

    expect(resolveIndex).toHaveBeenCalledTimes(2);
    expect(resolveIndex).toHaveBeenNthCalledWith(1, expect.anything(), { signal });
    expect(resolveIndex).toHaveBeenNthCalledWith(2, expect.anything(), { signal });
  });

  it('queries remote clusters when scope is all', async () => {
    const resolveIndex = jest.fn().mockResolvedValue(emptyResponse);
    const service = new EsqlService({ client: makeClient(resolveIndex) });

    await service.getAllIndices('all');

    expect(resolveIndex).toHaveBeenCalledWith(expect.objectContaining({ name: ['*', '*:*'] }), {
      signal: undefined,
    });
  });
});

describe('EsqlService ES|QL views', () => {
  const makeViewsClient = (esql: {
    getView?: jest.Mock;
    putView?: jest.Mock;
    deleteView?: jest.Mock;
  }) => ({ esql } as unknown as ElasticsearchClient);

  it('gets all views through the generated Elasticsearch client', async () => {
    const response = {
      views: [{ name: 'my-view', query: 'FROM logs-*', description: 'Logs' }],
    };
    const getView = jest.fn().mockResolvedValue(response);
    const service = new EsqlService({ client: makeViewsClient({ getView }) });

    await expect(service.getViews()).resolves.toEqual(response);
    expect(getView).toHaveBeenCalledWith();
  });

  it('gets one view by name', async () => {
    const view = { name: 'my-view', query: 'FROM logs-*' };
    const getView = jest.fn().mockResolvedValue({ views: [view] });
    const service = new EsqlService({ client: makeViewsClient({ getView }) });

    await expect(service.getView('my-view')).resolves.toEqual(view);
    expect(getView).toHaveBeenCalledWith({ name: 'my-view' });
  });

  it('returns undefined when an exact-name response has no views', async () => {
    const getView = jest.fn().mockResolvedValue({ views: [] });
    const service = new EsqlService({ client: makeViewsClient({ getView }) });

    await expect(service.getView('missing-view')).resolves.toBeUndefined();
  });

  it('upserts a view with its description', async () => {
    const response = { acknowledged: true };
    const putView = jest.fn().mockResolvedValue(response);
    const service = new EsqlService({ client: makeViewsClient({ putView }) });

    await expect(
      service.upsertView({
        name: 'my-view',
        query: 'FROM logs-*',
        description: 'Logs',
      })
    ).resolves.toEqual(response);
    expect(putView).toHaveBeenCalledWith({
      name: 'my-view',
      query: 'FROM logs-*',
      body: { description: 'Logs' },
    });
  });

  it('omits the optional description body when upserting', async () => {
    const putView = jest.fn().mockResolvedValue({ acknowledged: true });
    const service = new EsqlService({ client: makeViewsClient({ putView }) });

    await service.upsertView({ name: 'my-view', query: 'FROM logs-*' });

    expect(putView).toHaveBeenCalledWith({
      name: 'my-view',
      query: 'FROM logs-*',
    });
  });

  it('deletes multiple views in one Elasticsearch request', async () => {
    const response = { acknowledged: true };
    const deleteView = jest.fn().mockResolvedValue(response);
    const service = new EsqlService({ client: makeViewsClient({ deleteView }) });

    await expect(service.deleteViews(['first-view', 'second-view'])).resolves.toEqual(response);
    expect(deleteView).toHaveBeenCalledWith({
      name: ['first-view', 'second-view'],
    });
  });

  it('propagates Elasticsearch errors', async () => {
    const error = new Error('Elasticsearch unavailable');
    const getView = jest.fn().mockRejectedValue(error);
    const service = new EsqlService({ client: makeViewsClient({ getView }) });

    await expect(service.getViews()).rejects.toBe(error);
  });
});
