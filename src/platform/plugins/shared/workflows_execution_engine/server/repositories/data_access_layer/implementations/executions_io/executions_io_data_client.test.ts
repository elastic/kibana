/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';

import { EXECUTION_IO_FALLBACK_INDEXES, WORKFLOWS_EXECUTIONS_IO_DATA_STREAM } from './constants';
import { ExecutionsIoDataClient } from './executions_io_data_client';
import type { DataStreamMetadataManager } from '../data_stream/data_stream_metadata_manager';

const NEWER_INDEX = '.ds-workflows-executions-io-000002';
const OLDER_INDEX = '.ds-workflows-executions-io-000001';

describe('ExecutionsIoDataClient', () => {
  const logger = loggerMock.create();
  let esClient: ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>;
  let client: ExecutionsIoDataClient;

  beforeEach(() => {
    logger.warn.mockClear();
    esClient = elasticsearchServiceMock.createElasticsearchClient();
    const metadataManager = {
      getMeta: () => ({
        retentionTime: undefined,
        backingIndexes: [OLDER_INDEX, NEWER_INDEX],
        writableIndex: NEWER_INDEX,
      }),
    } as unknown as DataStreamMetadataManager;
    client = new ExecutionsIoDataClient({ esClient, metadataManager, logger });
    esClient.search.mockResolvedValue({ hits: { hits: [] } } as never);
  });

  it('returns an empty result without reading Elasticsearch', async () => {
    await expect(client.getByIds([])).resolves.toEqual({ items: [], missing: [] });
    expect(esClient.mget).not.toHaveBeenCalled();
  });

  it('reads the newer backing index first and defaults a missing size to 0', async () => {
    esClient.mget.mockResolvedValue({
      docs: [
        {
          _index: NEWER_INDEX,
          _id: 'input:step-1',
          found: true,
          _source: {
            id: 'input:step-1',
            type: 'input',
            value: { a: 1 },
            '@timestamp': '2026-01-01T00:00:00.000Z',
          },
          _seq_no: 3,
          _primary_term: 1,
        },
        {
          _index: OLDER_INDEX,
          _id: 'input:step-1',
          found: true,
          _source: {
            id: 'input:step-1',
            type: 'input',
            value: { stale: true },
            size: 9,
            '@timestamp': '2025-01-01T00:00:00.000Z',
          },
        },
      ],
    } as never);

    const result = await client.getByIds(['input:step-1']);

    expect(esClient.mget).toHaveBeenCalledTimes(1);
    expect(esClient.search).not.toHaveBeenCalled();
    expect(esClient.mget).toHaveBeenCalledWith({
      docs: [
        { _index: NEWER_INDEX, _id: 'input:step-1' },
        { _index: OLDER_INDEX, _id: 'input:step-1' },
      ],
    });
    expect(result.missing).toEqual([]);
    expect(result.items).toEqual([
      {
        document: {
          id: 'input:step-1',
          executionId: 'step-1',
          type: 'input',
          value: { a: 1 },
          size: 0,
          '@timestamp': '2026-01-01T00:00:00.000Z',
        },
        index: NEWER_INDEX,
        seqNo: 3,
        primaryTerm: 1,
      },
    ]);
  });

  it('searches the IO data stream when the recent backing indexes miss', async () => {
    esClient.mget.mockResolvedValue({
      docs: [
        { _index: NEWER_INDEX, _id: 'output:step-1', found: false },
        { _index: OLDER_INDEX, _id: 'output:step-1', found: false },
      ],
    } as never);
    esClient.search.mockResolvedValue({
      hits: {
        hits: [
          {
            _index: '.ds-workflows-executions-io-000000',
            _id: 'output:step-1',
            _seq_no: 8,
            _primary_term: 1,
            _source: {
              id: 'output:step-1',
              executionId: 'step-1',
              type: 'output',
              value: { result: 1 },
              '@timestamp': '2026-01-02T00:00:00.000Z',
            },
          },
        ],
      },
    } as never);

    const result = await client.getByIds(['output:step-1']);

    expect(esClient.search).toHaveBeenCalledWith({
      index: WORKFLOWS_EXECUTIONS_IO_DATA_STREAM,
      ignore_unavailable: true,
      size: 1,
      seq_no_primary_term: true,
      query: { ids: { values: ['output:step-1'] } },
    });
    expect(esClient.mget).toHaveBeenCalledTimes(1);
    expect(result.missing).toEqual([]);
    expect(result.items).toEqual([
      {
        document: {
          id: 'output:step-1',
          executionId: 'step-1',
          type: 'output',
          value: { result: 1 },
          size: 0,
          '@timestamp': '2026-01-02T00:00:00.000Z',
        },
        index: '.ds-workflows-executions-io-000000',
        seqNo: 8,
        primaryTerm: 1,
      },
    ]);
  });

  it('mgets plain execution indexes when the backing indexes miss', async () => {
    const [workflowIndex, stepIndex] = EXECUTION_IO_FALLBACK_INDEXES;
    esClient.mget
      .mockResolvedValueOnce({
        docs: [
          { _index: NEWER_INDEX, _id: 'output:step-1', found: false },
          { _index: OLDER_INDEX, _id: 'output:step-1', found: false },
          { _index: NEWER_INDEX, _id: 'input:run-1', found: false },
          { _index: OLDER_INDEX, _id: 'input:run-1', found: false },
        ],
      } as never)
      .mockResolvedValueOnce({
        docs: [
          { _index: workflowIndex, _id: 'step-1', found: false },
          {
            _index: stepIndex,
            _id: 'step-1',
            found: true,
            _source: { output: { result: 1 }, input: { old: true } },
            _seq_no: 4,
            _primary_term: 2,
          },
          {
            _index: workflowIndex,
            _id: 'run-1',
            found: true,
            _source: { input: { workflow: true } },
          },
          { _index: stepIndex, _id: 'run-1', found: false },
        ],
      } as never);

    const result = await client.getByIds(['output:step-1', 'input:run-1']);

    expect(esClient.mget).toHaveBeenNthCalledWith(2, {
      docs: [
        { _index: workflowIndex, _id: 'step-1', _source: { includes: ['output'] } },
        { _index: stepIndex, _id: 'step-1', _source: { includes: ['output'] } },
        { _index: workflowIndex, _id: 'run-1', _source: { includes: ['input'] } },
        { _index: stepIndex, _id: 'run-1', _source: { includes: ['input'] } },
      ],
    });
    expect(result.missing).toEqual([]);
    expect(result.items).toEqual([
      {
        document: {
          id: 'output:step-1',
          executionId: 'step-1',
          type: 'output',
          value: { result: 1 },
          size: 0,
          '@timestamp': '',
        },
        index: stepIndex,
        seqNo: 4,
        primaryTerm: 2,
      },
      {
        document: {
          id: 'input:run-1',
          executionId: 'run-1',
          type: 'input',
          value: { workflow: true },
          size: 0,
          '@timestamp': '',
        },
        index: workflowIndex,
        seqNo: undefined,
        primaryTerm: undefined,
      },
    ]);
  });

  it('requests both fields when one execution asks for input and output', async () => {
    const [workflowIndex, stepIndex] = EXECUTION_IO_FALLBACK_INDEXES;
    esClient.mget
      .mockResolvedValueOnce({
        docs: [
          { _index: NEWER_INDEX, _id: 'input:step-1', found: false },
          { _index: OLDER_INDEX, _id: 'input:step-1', found: false },
          { _index: NEWER_INDEX, _id: 'output:step-1', found: false },
          { _index: OLDER_INDEX, _id: 'output:step-1', found: false },
          { _index: NEWER_INDEX, _id: 'output:run-1', found: false },
          { _index: OLDER_INDEX, _id: 'output:run-1', found: false },
        ],
      } as never)
      .mockResolvedValueOnce({
        docs: [
          { _index: workflowIndex, _id: 'step-1', found: false },
          {
            _index: stepIndex,
            _id: 'step-1',
            found: true,
            _source: { input: { a: 1 }, output: { b: 2 } },
          },
          {
            _index: workflowIndex,
            _id: 'run-1',
            found: true,
            _source: { output: { done: true } },
          },
          { _index: stepIndex, _id: 'run-1', found: false },
        ],
      } as never);

    const result = await client.getByIds(['input:step-1', 'output:step-1', 'output:run-1']);

    expect(esClient.mget).toHaveBeenNthCalledWith(2, {
      docs: [
        {
          _index: workflowIndex,
          _id: 'step-1',
          _source: { includes: ['input', 'output'] },
        },
        { _index: stepIndex, _id: 'step-1', _source: { includes: ['input', 'output'] } },
        { _index: workflowIndex, _id: 'run-1', _source: { includes: ['output'] } },
        { _index: stepIndex, _id: 'run-1', _source: { includes: ['output'] } },
      ],
    });
    expect(result.missing).toEqual([]);
    expect(result.items.map((item) => item.document)).toEqual([
      expect.objectContaining({ id: 'input:step-1', type: 'input', value: { a: 1 } }),
      expect.objectContaining({ id: 'output:step-1', type: 'output', value: { b: 2 } }),
      expect.objectContaining({ id: 'output:run-1', type: 'output', value: { done: true } }),
    ]);
  });

  it('keeps backing-index hits when the plain-index read fails', async () => {
    esClient.mget
      .mockResolvedValueOnce({
        docs: [
          {
            _index: NEWER_INDEX,
            _id: 'input:step-1',
            found: true,
            _source: {
              type: 'input',
              value: { a: 1 },
              size: 4,
              '@timestamp': '2026-01-01T00:00:00.000Z',
            },
          },
          { _index: OLDER_INDEX, _id: 'input:step-1', found: false },
          { _index: NEWER_INDEX, _id: 'output:step-2', found: false },
          { _index: OLDER_INDEX, _id: 'output:step-2', found: false },
        ],
      } as never)
      .mockRejectedValueOnce(new Error('index unavailable'));

    const result = await client.getByIds(['input:step-1', 'output:step-2']);

    expect(result.items).toEqual([
      expect.objectContaining({
        document: expect.objectContaining({ id: 'input:step-1', size: 4 }),
      }),
    ]);
    expect(result.missing).toEqual(['output:step-2']);
    expect(logger.warn).toHaveBeenCalledWith(
      'Failed to read legacy execution IO: index unavailable'
    );
  });

  it('returns an empty bulk response without writing', async () => {
    await expect(client.bulkCreate({ documents: [] })).resolves.toEqual({
      items: [],
      errors: false,
    });
    expect(esClient.bulk).not.toHaveBeenCalled();
  });

  it('creates documents on the IO data stream', async () => {
    esClient.bulk.mockResolvedValue({
      errors: false,
      took: 1,
      items: [
        {
          create: {
            _id: 'input:step-1',
            _index: NEWER_INDEX,
            result: 'created',
            status: 201,
            _seq_no: 1,
            _primary_term: 1,
          },
        },
      ],
    } as never);

    const result = await client.bulkCreate({
      refresh: 'wait_for',
      documents: [
        {
          executionId: 'step-1',
          type: 'input',
          value: { a: 1 },
          size: 8,
          '@timestamp': '2026-01-01T00:00:00.000Z',
        },
      ],
    });

    expect(esClient.bulk).toHaveBeenCalledWith({
      refresh: 'wait_for',
      operations: [
        {
          create: {
            _index: WORKFLOWS_EXECUTIONS_IO_DATA_STREAM,
            _id: 'input:step-1',
          },
        },
        {
          id: 'input:step-1',
          executionId: 'step-1',
          type: 'input',
          value: { a: 1 },
          size: 8,
          '@timestamp': '2026-01-01T00:00:00.000Z',
        },
      ],
    });
    expect(result).toEqual({
      errors: false,
      items: [
        {
          id: 'input:step-1',
          index: NEWER_INDEX,
          error: undefined,
          seqNo: 1,
          primaryTerm: 1,
          result: 'created',
        },
      ],
    });
  });

  it('reports a conflict for an id that exists in an older backing index without writing it', async () => {
    esClient.search.mockResolvedValueOnce({
      hits: { hits: [{ _id: 'output:step-1', _index: OLDER_INDEX }] },
    } as never);

    const result = await client.bulkCreate({
      documents: [
        {
          executionId: 'step-1',
          type: 'output',
          value: { done: true },
          size: 2,
          '@timestamp': '2026-01-01T00:00:00.000Z',
        },
      ],
    });

    expect(esClient.bulk).not.toHaveBeenCalled();
    expect(result.errors).toBe(true);
    expect(result.items[0]).toEqual(
      expect.objectContaining({
        id: 'output:step-1',
        error: expect.objectContaining({ type: 'version_conflict_engine_exception' }),
      })
    );
  });

  it('reports a write-index conflict per item instead of throwing', async () => {
    esClient.bulk.mockResolvedValue({
      errors: true,
      items: [
        {
          create: {
            _id: 'output:step-1',
            _index: NEWER_INDEX,
            status: 409,
            error: {
              type: 'version_conflict_engine_exception',
              reason: 'document already exists',
            },
          },
        },
      ],
    } as never);

    const result = await client.bulkCreate({
      documents: [
        {
          executionId: 'step-1',
          type: 'output',
          value: { done: true },
          size: 2,
          '@timestamp': '2026-01-01T00:00:00.000Z',
        },
      ],
    });
    expect(result.errors).toBe(true);
    expect(result.items[0].error?.type).toBe('version_conflict_engine_exception');
    expect(esClient.bulk).toHaveBeenCalledTimes(1);
  });

  it('stamps @timestamp when the document does not have one', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-03-03T00:00:00.000Z'));
    try {
      esClient.bulk.mockResolvedValue({
        errors: false,
        took: 1,
        items: [
          {
            create: {
              _id: 'output:step-1',
              _index: NEWER_INDEX,
              result: 'created',
              status: 201,
            },
          },
        ],
      } as never);

      await client.bulkCreate({
        documents: [
          {
            executionId: 'step-1',
            type: 'output',
            value: { done: true },
            size: 2,
            '@timestamp': '',
          },
        ],
      });

      expect(esClient.bulk.mock.calls[0][0].operations?.[1]).toEqual({
        id: 'output:step-1',
        executionId: 'step-1',
        type: 'output',
        value: { done: true },
        size: 2,
        '@timestamp': '2026-03-03T00:00:00.000Z',
      });
    } finally {
      jest.useRealTimers();
    }
  });
});
