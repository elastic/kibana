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

import { DataStreamDataClient } from './data_stream_data_client';
import type { DataStreamMetadataManager } from './data_stream_metadata_manager';
import type { DocumentVersionManager } from './document_version_manager';

describe('DataStreamDataClient', () => {
  const DATA_STREAM = '.workflows-executions-ds';
  const BACKING_INDEX = '.ds-.workflows-executions-ds-000001';
  const LEGACY_INDEX = '.workflows-executions';
  const CREATED_AT = '2024-01-01T00:00:00.000Z';

  const createClient = (additionalIndexesToQuery: string[] = []) => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    const versionManager = {
      bulkGetVersions: jest.fn().mockResolvedValue({}),
      bulkGetCachedVersions: jest.fn().mockReturnValue({}),
      setVersion: jest.fn(),
    };
    const meta = {
      retentionTime: '90d',
      backingIndexes: [BACKING_INDEX],
      writableIndex: BACKING_INDEX,
    };
    const metadataManager = {
      getMeta: () => meta,
      getMetaOrLoad: () => Promise.resolve(meta),
    };
    const dataAccess = new DataStreamDataClient<{
      id: string;
      createdAt: string;
      status?: string;
      deleted?: boolean;
    }>({
      esClient,
      dataStreamName: DATA_STREAM,
      versionManager: versionManager as unknown as DocumentVersionManager,
      metadataManager: metadataManager as unknown as DataStreamMetadataManager,
      additionalIndexesToQuery,
      dateField: 'createdAt',
      logger: loggerMock.create(),
    });
    return { esClient, versionManager, dataAccess };
  };

  const excludeDeletedQuery = (query: Record<string, unknown>) => ({
    bool: {
      must: [query],
      must_not: [{ term: { deleted: true } }],
    },
  });

  const updatedBulkItem = (id: string, seqNo: number) => ({
    update: {
      _id: id,
      _index: BACKING_INDEX,
      result: 'updated',
      _seq_no: seqNo,
      _primary_term: 1,
    },
  });

  it('retries a version-miss upsert create 409 as an update on the backing index', async () => {
    const { esClient, dataAccess } = createClient();

    esClient.bulk
      .mockResolvedValueOnce({
        errors: true,
        items: [
          {
            create: {
              _id: 'a',
              _index: BACKING_INDEX,
              error: {
                type: 'version_conflict_engine_exception',
                reason: 'document already exists (current version [1])',
              },
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
              _index: BACKING_INDEX,
              result: 'updated',
              _seq_no: 1,
              _primary_term: 1,
            },
          },
        ],
      } as never);

    const result = await dataAccess.bulk({
      items: [
        {
          operation: 'upsert',
          document: { id: 'a', createdAt: CREATED_AT, status: 'running' },
        },
      ],
    });

    expect(result.errors).toBe(false);
    expect(result.items).toEqual([
      expect.objectContaining({ id: 'a', result: 'updated', error: undefined }),
    ]);
    expect(esClient.bulk).toHaveBeenCalledTimes(2);
    expect(esClient.bulk).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        operations: [
          { create: { _id: 'a', _index: DATA_STREAM } },
          { id: 'a', createdAt: CREATED_AT, status: 'running', '@timestamp': CREATED_AT },
        ],
      })
    );
    expect(esClient.bulk).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        operations: [
          { update: { _id: 'a', _index: BACKING_INDEX, retry_on_conflict: 3 } },
          { doc: { id: 'a', createdAt: CREATED_AT, status: 'running' } },
        ],
      })
    );
  });

  it('does not rewrite a true create 409 into an update', async () => {
    const { esClient, dataAccess } = createClient();

    esClient.bulk.mockResolvedValue({
      errors: true,
      items: [
        {
          create: {
            _id: 'a',
            _index: BACKING_INDEX,
            error: {
              type: 'version_conflict_engine_exception',
              reason: 'document already exists',
            },
          },
        },
      ],
    } as never);

    const result = await dataAccess.bulk({
      items: [{ operation: 'create', document: { id: 'a', createdAt: CREATED_AT } }],
    });

    expect(result.errors).toBe(true);
    expect(result.items[0].error?.type).toBe('version_conflict_engine_exception');
    expect(esClient.bulk).toHaveBeenCalledTimes(1);
  });

  it('preserves request order when recovering one upsert among other items', async () => {
    const { esClient, dataAccess } = createClient();

    esClient.bulk
      .mockResolvedValueOnce({
        errors: true,
        items: [
          {
            create: {
              _id: 'a',
              _index: BACKING_INDEX,
              result: 'created',
              _seq_no: 0,
              _primary_term: 1,
            },
          },
          {
            create: {
              _id: 'b',
              _index: BACKING_INDEX,
              error: {
                type: 'version_conflict_engine_exception',
                reason: 'document already exists',
              },
            },
          },
        ],
      } as never)
      .mockResolvedValueOnce({
        errors: false,
        items: [
          {
            update: {
              _id: 'b',
              _index: BACKING_INDEX,
              result: 'updated',
              _seq_no: 2,
              _primary_term: 1,
            },
          },
        ],
      } as never);

    const result = await dataAccess.bulk({
      items: [
        { operation: 'create', document: { id: 'a', createdAt: CREATED_AT } },
        {
          operation: 'upsert',
          document: { id: 'b', createdAt: CREATED_AT, status: 'running' },
        },
      ],
    });

    expect(result.errors).toBe(false);
    expect(result.items.map((item) => item.id)).toEqual(['a', 'b']);
    expect(result.items[0].result).toBe('created');
    expect(result.items[1].result).toBe('updated');
  });

  it('keeps a response for every update of the same id', async () => {
    const { esClient, versionManager, dataAccess } = createClient();
    versionManager.bulkGetVersions.mockResolvedValue({
      a: { index: BACKING_INDEX, seqNo: 4, primaryTerm: 1 },
    });
    esClient.bulk.mockResolvedValue({
      errors: false,
      items: [updatedBulkItem('a', 5), updatedBulkItem('a', 6)],
    } as never);

    const result = await dataAccess.bulk({
      items: [
        { operation: 'update', document: { id: 'a', status: 'running' } },
        { operation: 'update', document: { id: 'a', status: 'completed' } },
      ],
    });

    expect(versionManager.bulkGetVersions).toHaveBeenCalledWith(['a']);
    expect(result.errors).toBe(false);
    expect(result.items).toHaveLength(2);
    expect(result.items.map((item) => item.result)).toEqual(['updated', 'updated']);
    expect(esClient.bulk.mock.calls[0][0].operations).toEqual([
      { update: { _id: 'a', _index: BACKING_INDEX, if_seq_no: 4, if_primary_term: 1 } },
      { doc: { id: 'a', status: 'running' } },
      { update: { _id: 'a', _index: BACKING_INDEX, if_seq_no: 4, if_primary_term: 1 } },
      { doc: { id: 'a', status: 'completed' } },
    ]);
  });

  it('fills every slot when repeated updates of the same id are missing', async () => {
    const { esClient, dataAccess } = createClient();
    esClient.bulk.mockResolvedValue({
      errors: false,
      items: [
        {
          create: {
            _id: 'b',
            _index: BACKING_INDEX,
            result: 'created',
            _seq_no: 0,
            _primary_term: 1,
          },
        },
      ],
    } as never);

    const result = await dataAccess.bulk({
      items: [
        { operation: 'update', document: { id: 'a', status: 'running' } },
        { operation: 'create', document: { id: 'b', createdAt: CREATED_AT } },
        { operation: 'update', document: { id: 'a', status: 'completed' } },
      ],
    });

    expect(esClient.bulk).toHaveBeenCalledTimes(1);
    expect(result.items).toHaveLength(3);
    expect(result.items[0].error?.type).toBe('document_missing_exception');
    expect(result.items[1].result).toBe('created');
    expect(result.items[2].error?.type).toBe('document_missing_exception');
    expect(result.items.map((item) => item.id)).toEqual(['a', 'b', 'a']);
  });

  it('creates every upsert of the same id when version lookup finds nothing', async () => {
    const { esClient, dataAccess } = createClient();
    esClient.bulk.mockResolvedValue({
      errors: false,
      items: [
        {
          create: {
            _id: 'a',
            _index: BACKING_INDEX,
            result: 'created',
            _seq_no: 0,
            _primary_term: 1,
          },
        },
        {
          create: {
            _id: 'a',
            _index: BACKING_INDEX,
            result: 'created',
            _seq_no: 1,
            _primary_term: 1,
          },
        },
      ],
    } as never);

    const result = await dataAccess.bulk({
      items: [
        { operation: 'upsert', document: { id: 'a', createdAt: CREATED_AT, status: 'running' } },
        { operation: 'upsert', document: { id: 'a', createdAt: CREATED_AT, status: 'completed' } },
      ],
    });

    expect(result.errors).toBe(false);
    expect(result.items).toHaveLength(2);
    expect(result.items.map((item) => item.result)).toEqual(['created', 'created']);
    expect(esClient.bulk.mock.calls[0][0].operations).toEqual([
      { create: { _id: 'a', _index: DATA_STREAM } },
      { id: 'a', createdAt: CREATED_AT, status: 'running', '@timestamp': CREATED_AT },
      { create: { _id: 'a', _index: DATA_STREAM } },
      { id: 'a', createdAt: CREATED_AT, status: 'completed', '@timestamp': CREATED_AT },
    ]);
  });

  it('treats a soft-deleted mget hit as missing, including a narrow projection', async () => {
    const { esClient, dataAccess } = createClient();
    esClient.mget.mockResolvedValue({
      docs: [
        {
          _id: 'deleted-id',
          _index: BACKING_INDEX,
          found: true,
          _source: { status: 'running', deleted: true },
          _seq_no: 1,
          _primary_term: 1,
        },
      ],
    } as never);
    esClient.search.mockResolvedValue({ hits: { hits: [] } } as never);

    const result = await dataAccess.getByIds(['deleted-id'], { sourceIncludes: ['status'] });

    expect(result.items).toEqual([]);
    expect(result.missing).toEqual(['deleted-id']);
    expect(esClient.mget).toHaveBeenCalledWith({
      docs: [{ _index: BACKING_INDEX, _id: 'deleted-id' }],
      _source_includes: ['status', 'deleted'],
    });
    expect(esClient.search).toHaveBeenCalledWith(
      expect.objectContaining({
        query: excludeDeletedQuery({ ids: { values: ['deleted-id'] } }),
        _source_includes: ['status'],
      })
    );
  });

  it('drops a soft-deleted search fallback hit from getByIds', async () => {
    const { esClient, dataAccess } = createClient();
    esClient.mget.mockResolvedValue({
      docs: [
        { _id: 'live-id', _index: BACKING_INDEX, found: false },
        { _id: 'deleted-id', _index: BACKING_INDEX, found: false },
      ],
    } as never);
    esClient.search.mockResolvedValue({
      hits: {
        hits: [
          {
            _id: 'live-id',
            _index: BACKING_INDEX,
            _source: { id: 'live-id', status: 'running' },
            _seq_no: 2,
            _primary_term: 1,
          },
          {
            _id: 'deleted-id',
            _index: BACKING_INDEX,
            _source: { id: 'deleted-id', status: 'running', deleted: true },
            _seq_no: 3,
            _primary_term: 1,
          },
        ],
      },
    } as never);

    const result = await dataAccess.getByIds(['live-id', 'deleted-id'], {
      sourceIncludes: ['status'],
    });

    expect(result.items.map((item) => item.document.id)).toEqual(['live-id']);
    expect(result.missing).toEqual(['deleted-id']);
    expect(esClient.search).toHaveBeenCalledWith(
      expect.objectContaining({
        query: excludeDeletedQuery({ ids: { values: ['live-id', 'deleted-id'] } }),
      })
    );
  });

  it('does not run an updater when mget returns a soft-deleted document', async () => {
    const { esClient, dataAccess } = createClient();
    const updater = jest.fn(() => ({ status: 'pending' }));
    esClient.mget.mockResolvedValue({
      docs: [
        {
          _id: 'a',
          _index: BACKING_INDEX,
          found: true,
          _source: { status: 'queued', deleted: true },
          _seq_no: 1,
          _primary_term: 1,
        },
      ],
    } as never);
    esClient.search.mockResolvedValue({ hits: { hits: [] } } as never);

    const result = await dataAccess.bulk({
      items: [
        {
          operation: 'update',
          documentId: 'a',
          sourceFields: ['status'],
          updater,
        },
      ],
    });

    expect(updater).not.toHaveBeenCalled();
    expect(esClient.bulk).not.toHaveBeenCalled();
    expect(result.items[0].error?.type).toBe('document_missing_exception');
    expect(esClient.mget).toHaveBeenCalledWith({
      docs: [
        {
          _id: 'a',
          _index: BACKING_INDEX,
          _source: { includes: ['status', 'deleted'] },
        },
      ],
    });
  });

  it('does not run an updater when only the search fallback finds a soft-deleted document', async () => {
    const { esClient, dataAccess } = createClient();
    const updater = jest.fn(() => ({ status: 'pending' }));
    esClient.mget.mockResolvedValue({
      docs: [{ _id: 'a', _index: BACKING_INDEX, found: false }],
    } as never);
    esClient.search.mockResolvedValue({
      hits: {
        hits: [
          {
            _id: 'a',
            _index: BACKING_INDEX,
            _source: { status: 'queued', deleted: true },
            _seq_no: 1,
            _primary_term: 1,
          },
        ],
      },
    } as never);

    const result = await dataAccess.bulk({
      items: [
        {
          operation: 'update',
          documentId: 'a',
          sourceFields: ['status'],
          updater,
        },
      ],
    });

    expect(updater).not.toHaveBeenCalled();
    expect(esClient.bulk).not.toHaveBeenCalled();
    expect(result.items[0].error?.type).toBe('document_missing_exception');
    expect(esClient.search).toHaveBeenCalledWith(
      expect.objectContaining({
        index: [DATA_STREAM],
        _source: { includes: ['status', 'deleted'] },
      })
    );
    expect(esClient.mget).toHaveBeenCalledTimes(1);
  });

  describe('refresh', () => {
    it('refreshes the data stream and ignores a missing legacy index', async () => {
      const { esClient, dataAccess } = createClient([LEGACY_INDEX]);

      await dataAccess.refresh();

      expect(esClient.indices.refresh).toHaveBeenNthCalledWith(1, { index: DATA_STREAM });
      expect(esClient.indices.refresh).toHaveBeenNthCalledWith(2, {
        index: [LEGACY_INDEX],
        ignore_unavailable: true,
      });
    });

    it('refreshes only the data stream when no legacy index is configured', async () => {
      const { esClient, dataAccess } = createClient();

      await dataAccess.refresh();

      expect(esClient.indices.refresh).toHaveBeenCalledTimes(1);
      expect(esClient.indices.refresh).toHaveBeenCalledWith({ index: DATA_STREAM });
    });
  });

  describe('deleteByQuery', () => {
    const query = { term: { workflowId: 'wf-1' } };

    const searchPage = (count: number, timedOut = false) =>
      ({
        timed_out: timedOut,
        hits: {
          hits: Array.from({ length: count }, (_, i) => ({
            _id: `id-${i}`,
            _index: BACKING_INDEX,
          })),
        },
      } as never);

    const bulkPage = (count: number) =>
      ({
        errors: false,
        items: Array.from({ length: count }, (_, i) => updatedBulkItem(`doc-${i}`, i)),
      } as never);

    it('pages until a short page and hard-deletes the legacy index', async () => {
      const { esClient, versionManager, dataAccess } = createClient([LEGACY_INDEX]);
      versionManager.bulkGetVersions.mockImplementation(async (ids: string[]) =>
        Object.fromEntries(
          ids.map((id) => [id, { index: BACKING_INDEX, seqNo: 1, primaryTerm: 1 }])
        )
      );
      esClient.search.mockResolvedValueOnce(searchPage(1000)).mockResolvedValueOnce(searchPage(1));
      esClient.bulk.mockResolvedValueOnce(bulkPage(1000)).mockResolvedValueOnce(bulkPage(1));
      esClient.deleteByQuery.mockResolvedValue({
        deleted: 4,
        batches: 1,
        version_conflicts: 2,
        failures: [{ id: 'legacy-fail', index: LEGACY_INDEX, status: 409 }],
        timed_out: false,
      } as never);

      const result = await dataAccess.deleteByQuery({ query, refresh: true });

      expect(esClient.search).toHaveBeenCalledTimes(2);
      expect(esClient.search).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          index: DATA_STREAM,
          size: 1000,
          query: excludeDeletedQuery(query),
        })
      );
      expect(esClient.bulk).toHaveBeenCalledTimes(2);
      expect(esClient.deleteByQuery).toHaveBeenCalledWith({
        query,
        refresh: true,
        index: [LEGACY_INDEX],
        ignore_unavailable: true,
      });
      expect(result.deleted).toBe(1000 + 1 + 4);
      expect(result.batches).toBe(3);
      expect(result.version_conflicts).toBe(2);
      expect(result.failures).toEqual([
        expect.objectContaining({ id: 'legacy-fail', index: LEGACY_INDEX }),
      ]);
      expect(result.timed_out).toBe(false);
    });

    it('propagates a timed-out legacy cleanup', async () => {
      const { esClient, dataAccess } = createClient([LEGACY_INDEX]);
      esClient.search.mockResolvedValueOnce(searchPage(0));
      esClient.deleteByQuery.mockResolvedValue({
        deleted: 0,
        batches: 1,
        version_conflicts: 0,
        failures: [],
        timed_out: true,
      } as never);

      const result = await dataAccess.deleteByQuery({ query });

      expect(result.timed_out).toBe(true);
      expect(result.deleted).toBe(0);
    });

    it('stops paging when a data stream search times out', async () => {
      const { esClient, versionManager, dataAccess } = createClient([LEGACY_INDEX]);
      versionManager.bulkGetVersions.mockImplementation(async (ids: string[]) =>
        Object.fromEntries(
          ids.map((id) => [id, { index: BACKING_INDEX, seqNo: 1, primaryTerm: 1 }])
        )
      );
      esClient.search
        .mockResolvedValueOnce(searchPage(1000, true))
        .mockResolvedValueOnce(searchPage(1000));
      esClient.bulk.mockResolvedValueOnce(bulkPage(1000));
      esClient.deleteByQuery.mockResolvedValue({
        deleted: 1,
        batches: 1,
        version_conflicts: 0,
        failures: [],
        timed_out: false,
      } as never);

      const result = await dataAccess.deleteByQuery({ query });

      expect(esClient.search).toHaveBeenCalledTimes(1);
      expect(result.timed_out).toBe(true);
      expect(result.deleted).toBe(1000 + 1);
    });
  });
});
