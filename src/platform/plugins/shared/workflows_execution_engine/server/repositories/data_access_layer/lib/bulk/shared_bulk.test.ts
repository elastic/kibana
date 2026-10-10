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

import { sharedBulk } from './shared_bulk';

describe('sharedBulk', () => {
  const INDEX = '.workflows-executions';

  const createSetup = () => ({
    esClient: elasticsearchServiceMock.createElasticsearchClient(),
    logger: loggerMock.create(),
  });

  it('returns empty items without calling ES for an empty request', async () => {
    const { esClient, logger } = createSetup();

    const result = await sharedBulk({
      esClient,
      request: { items: [] },
      logger,
      fallbackIndexes: [],
    });

    expect(result.items).toHaveLength(0);
    expect(result.errors).toBe(false);
    expect(esClient.bulk).not.toHaveBeenCalled();
  });

  it('response items length and order match the request (1:1 alignment)', async () => {
    const { esClient, logger } = createSetup();
    esClient.bulk.mockResolvedValue({
      errors: false,
      items: [
        { create: { _id: 'a', _index: INDEX, result: 'created', _seq_no: 0, _primary_term: 1 } },
        { create: { _id: 'b', _index: INDEX, result: 'created', _seq_no: 1, _primary_term: 1 } },
        { create: { _id: 'c', _index: INDEX, result: 'created', _seq_no: 2, _primary_term: 1 } },
      ],
    } as never);

    const result = await sharedBulk<{ id: string }>({
      esClient,
      request: {
        items: [
          { operation: 'create', document: { id: 'a' }, index: INDEX },
          { operation: 'create', document: { id: 'b' }, index: INDEX },
          { operation: 'create', document: { id: 'c' }, index: INDEX },
        ],
      },
      logger,
      fallbackIndexes: [],
    });

    expect(result.items).toHaveLength(3);
    expect(result.items.map((i) => i.id)).toEqual(['a', 'b', 'c']);
  });

  it('surfaces per-item errors in the response without throwing', async () => {
    const { esClient, logger } = createSetup();
    esClient.bulk.mockResolvedValue({
      errors: true,
      items: [
        { create: { _id: 'a', _index: INDEX, result: 'created' } },
        {
          create: {
            _id: 'b',
            _index: INDEX,
            error: { type: 'version_conflict_engine_exception', reason: 'document already exists' },
          },
        },
      ],
    } as never);

    const result = await sharedBulk<{ id: string }>({
      esClient,
      request: {
        items: [
          { operation: 'create', document: { id: 'a' }, index: INDEX },
          { operation: 'create', document: { id: 'b' }, index: INDEX },
        ],
      },
      logger,
      fallbackIndexes: [],
    });

    expect(result.errors).toBe(true);
    expect(result.items).toHaveLength(2);
    expect(result.items[0].error).toBeUndefined();
    expect(result.items[1].error?.type).toBe('version_conflict_engine_exception');
  });

  it('forwards wait_for on every ES bulk including OCC retries', async () => {
    const { esClient, logger } = createSetup();

    esClient.mget
      .mockResolvedValueOnce({
        docs: [
          {
            _id: 'a',
            _index: INDEX,
            found: true,
            _source: { id: 'a', status: 'queued' },
            _seq_no: 0,
            _primary_term: 1,
          },
        ],
      } as never)
      .mockResolvedValueOnce({
        docs: [
          {
            _id: 'a',
            _index: INDEX,
            found: true,
            _source: { id: 'a', status: 'queued' },
            _seq_no: 1,
            _primary_term: 1,
          },
        ],
      } as never);

    esClient.bulk
      .mockResolvedValueOnce({
        errors: true,
        items: [
          {
            update: {
              _id: 'a',
              _index: INDEX,
              error: { type: 'version_conflict_engine_exception', reason: 'version conflict' },
            },
          },
        ],
      } as never)
      .mockResolvedValueOnce({
        errors: false,
        items: [
          {
            update: {
              _id: 'a',
              _index: INDEX,
              result: 'updated',
              _seq_no: 2,
              _primary_term: 1,
            },
          },
        ],
      } as never);

    const result = await sharedBulk<{ id: string; status: string }>({
      esClient,
      request: {
        refresh: 'wait_for',
        items: [
          {
            operation: 'update',
            documentId: 'a',
            sourceFields: ['status'],
            retryOnConflict: 1,
            updater: (current) => (current.status === 'queued' ? { status: 'pending' } : 'noop'),
          },
        ],
      },
      logger,
      fallbackIndexes: [INDEX],
    });

    expect(result.errors).toBe(false);
    expect(result.items[0].result).toBe('updated');
    expect(esClient.bulk).toHaveBeenCalledTimes(2);
    expect(esClient.bulk.mock.calls[0][0].refresh).toBe('wait_for');
    expect(esClient.bulk.mock.calls[1][0].refresh).toBe('wait_for');
    expect(esClient.indices.refresh).not.toHaveBeenCalled();
  });

  it('forwards wait_for on a successful first write', async () => {
    const { esClient, logger } = createSetup();

    esClient.mget.mockResolvedValue({
      docs: [
        {
          _id: 'a',
          _index: INDEX,
          found: true,
          _source: { id: 'a', status: 'queued' },
          _seq_no: 0,
          _primary_term: 1,
        },
      ],
    } as never);

    esClient.bulk.mockResolvedValue({
      errors: false,
      items: [
        {
          update: {
            _id: 'a',
            _index: INDEX,
            result: 'updated',
            _seq_no: 1,
            _primary_term: 1,
          },
        },
      ],
    } as never);

    const result = await sharedBulk<{ id: string; status: string }>({
      esClient,
      request: {
        refresh: 'wait_for',
        items: [
          {
            operation: 'update',
            documentId: 'a',
            sourceFields: ['status'],
            retryOnConflict: 3,
            updater: (current) => (current.status === 'queued' ? { status: 'pending' } : 'noop'),
          },
        ],
      },
      logger,
      fallbackIndexes: [INDEX],
    });

    expect(result.items[0].result).toBe('updated');
    expect(esClient.mget).toHaveBeenCalledWith({
      docs: [
        {
          _id: 'a',
          _index: INDEX,
          _source: { includes: ['status', 'deleted'] },
        },
      ],
    });
    expect(esClient.bulk).toHaveBeenCalledTimes(1);
    expect(esClient.bulk.mock.calls[0][0].refresh).toBe('wait_for');
    expect(esClient.indices.refresh).not.toHaveBeenCalled();
  });

  it('defers refresh: true to one indices.refresh after OCC retries', async () => {
    const { esClient, logger } = createSetup();

    esClient.mget.mockResolvedValue({
      docs: [
        {
          _id: 'a',
          _index: INDEX,
          found: true,
          _source: { id: 'a', status: 'queued' },
          _seq_no: 0,
          _primary_term: 1,
        },
      ],
    } as never);

    esClient.bulk.mockResolvedValue({
      errors: false,
      items: [
        {
          update: {
            _id: 'a',
            _index: INDEX,
            result: 'updated',
            _seq_no: 1,
            _primary_term: 1,
          },
        },
      ],
    } as never);

    const result = await sharedBulk<{ id: string; status: string }>({
      esClient,
      request: {
        refresh: true,
        items: [
          {
            operation: 'update',
            documentId: 'a',
            sourceFields: ['status'],
            retryOnConflict: 3,
            updater: (current) => (current.status === 'queued' ? { status: 'pending' } : 'noop'),
          },
        ],
      },
      logger,
      fallbackIndexes: [INDEX],
    });

    expect(result.items[0].result).toBe('updated');
    expect(esClient.bulk).toHaveBeenCalledTimes(1);
    expect(esClient.bulk.mock.calls[0][0].refresh).toBeUndefined();
    expect(esClient.indices.refresh).toHaveBeenCalledWith({ index: [INDEX] });
  });

  it('sends retry_on_conflict once and does not requeue a plain upsert conflict', async () => {
    const { esClient, logger } = createSetup();
    esClient.bulk.mockResolvedValue({
      errors: true,
      items: [
        {
          update: {
            _id: 'a',
            _index: INDEX,
            error: { type: 'version_conflict_engine_exception', reason: 'version conflict' },
          },
        },
      ],
    } as never);

    const result = await sharedBulk<{ id: string; status: string }>({
      esClient,
      request: {
        items: [
          {
            operation: 'upsert',
            document: { id: 'a', status: 'completed' },
            index: INDEX,
            retryOnConflict: 3,
          },
        ],
      },
      logger,
      fallbackIndexes: [INDEX],
    });

    expect(esClient.bulk).toHaveBeenCalledTimes(1);
    expect(esClient.mget).not.toHaveBeenCalled();
    expect(esClient.bulk.mock.calls[0][0].operations).toEqual([
      { update: { _id: 'a', _index: INDEX, retry_on_conflict: 3 } },
      { doc: { id: 'a', status: 'completed' }, doc_as_upsert: true },
    ]);
    expect(result.errors).toBe(true);
    expect(result.items[0].error?.type).toBe('version_conflict_engine_exception');
  });

  it('stamps id from _id when updater source projection omits it', async () => {
    const { esClient, logger } = createSetup();
    const updater = jest.fn((current: { id: string; status: string }) =>
      current.status === 'queued' ? { status: 'pending' } : 'noop'
    );

    esClient.mget.mockResolvedValue({
      docs: [
        {
          _id: 'a',
          _index: INDEX,
          found: true,
          _source: { status: 'queued' },
          _seq_no: 0,
          _primary_term: 1,
        },
      ],
    } as never);
    esClient.bulk.mockResolvedValue({
      errors: false,
      items: [
        {
          update: {
            _id: 'a',
            _index: INDEX,
            result: 'updated',
            _seq_no: 1,
            _primary_term: 1,
          },
        },
      ],
    } as never);

    await sharedBulk<{ id: string; status: string }>({
      esClient,
      request: {
        items: [
          {
            operation: 'update',
            documentId: 'a',
            sourceFields: ['id', 'status'],
            updater,
          },
        ],
      },
      logger,
      fallbackIndexes: [INDEX],
    });

    expect(updater).toHaveBeenCalledWith({ id: 'a', status: 'queued' });
  });

  it('throws when a response item has no _id', async () => {
    const { esClient, logger } = createSetup();
    esClient.bulk.mockResolvedValue({
      errors: false,
      items: [{ create: { _index: INDEX, result: 'created' } }],
    } as never);

    await expect(
      sharedBulk<{ id: string }>({
        esClient,
        request: { items: [{ operation: 'create', document: { id: 'a' }, index: INDEX }] },
        logger,
        fallbackIndexes: [],
      })
    ).rejects.toThrow('Unexpected bulk response item without _id');
  });
});
