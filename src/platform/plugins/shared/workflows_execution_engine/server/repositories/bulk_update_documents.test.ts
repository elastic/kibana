/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { DocumentWrite } from './bulk_update_documents';
import { bulkUpdateDocuments } from './bulk_update_documents';
import type { EsDocumentVersion } from './document_version';

const DATA_STREAM = '.test-stream';
const WRITE_INDEX = '.ds-.test-stream-000001';

type TestDoc = { id?: string; value?: number };

const createEsClientMock = () => ({
  indices: { getDataStream: jest.fn() },
  mget: jest.fn(),
  search: jest.fn(),
  bulk: jest.fn(),
});

type EsClientMock = ReturnType<typeof createEsClientMock>;

const version = (seqNo: number, primaryTerm: number): EsDocumentVersion => ({
  index: WRITE_INDEX,
  seqNo,
  primaryTerm,
});

const updateWrite = (id: string, occ?: EsDocumentVersion): DocumentWrite<TestDoc> => ({
  doc: { id, value: 1 },
  operation: 'update',
  version: occ,
});

const mockWriteIndex = (esClient: EsClientMock) => {
  esClient.indices.getDataStream.mockResolvedValue({
    data_streams: [{ indices: [{ index_name: WRITE_INDEX }] }],
  });
};

const mockMgetVersions = (
  esClient: EsClientMock,
  versions: Array<{ id: string; seqNo: number; primaryTerm: number }>
) => {
  esClient.mget.mockResolvedValue({
    docs: versions.map(({ id, seqNo, primaryTerm }) => ({
      _id: id,
      found: true,
      _source: { id },
      _index: WRITE_INDEX,
      _seq_no: seqNo,
      _primary_term: primaryTerm,
    })),
  });
};

const okItem = (id: string, seqNo: number, primaryTerm: number, index = WRITE_INDEX) => ({
  update: { _id: id, _index: index, _seq_no: seqNo, _primary_term: primaryTerm, status: 200 },
});

const conflictItem = (id: string) => ({
  update: { _id: id, status: 409, error: { type: 'version_conflict_engine_exception' } },
});

const missingItem = (id: string) => ({
  update: { _id: id, status: 404, error: { type: 'document_missing_exception' } },
});

const run = (esClient: EsClientMock, writes: Array<DocumentWrite<TestDoc>>) =>
  bulkUpdateDocuments<TestDoc>({
    esClient: esClient as unknown as ElasticsearchClient,
    dataStreamName: DATA_STREAM,
    entityName: 'thing',
    refresh: false,
    retryBaseDelayMs: 0,
    writes,
  });

describe('bulkUpdateDocuments', () => {
  let esClient: EsClientMock;

  beforeEach(() => {
    esClient = createEsClientMock();
    mockWriteIndex(esClient);
  });

  it('uses per-write versions and skips the getDataStream + mget lookups', async () => {
    esClient.bulk.mockResolvedValue({ errors: false, items: [okItem('a', 6, 2)] });

    const result = await run(esClient, [updateWrite('a', version(5, 2))]);

    expect(esClient.indices.getDataStream).not.toHaveBeenCalled();
    expect(esClient.mget).not.toHaveBeenCalled();
    expect(esClient.bulk).toHaveBeenCalledTimes(1);

    const { operations } = esClient.bulk.mock.calls[0][0];
    expect(operations[0].update).toMatchObject({
      _id: 'a',
      _index: WRITE_INDEX,
      if_seq_no: 5,
      if_primary_term: 2,
    });

    // Returns the fresh version from the write response.
    expect(result).toEqual({ a: version(6, 2) });
  });

  it('re-resolves fresh versions after a version conflict and retries', async () => {
    mockMgetVersions(esClient, [{ id: 'a', seqNo: 9, primaryTerm: 3 }]);
    esClient.bulk
      .mockResolvedValueOnce({ errors: true, items: [conflictItem('a')] })
      .mockResolvedValueOnce({ errors: false, items: [okItem('a', 10, 3)] });

    const result = await run(esClient, [updateWrite('a', version(5, 2))]);

    // First attempt trusted the stale version; the retry resolved fresh.
    expect(esClient.mget).toHaveBeenCalledTimes(1);
    expect(esClient.bulk).toHaveBeenCalledTimes(2);
    expect(esClient.bulk.mock.calls[1][0].operations[0].update).toMatchObject({
      if_seq_no: 9,
      if_primary_term: 3,
    });
    expect(result).toEqual({ a: version(10, 3) });
  });

  it('treats a document_missing (404) on a provided version as a retriable miss', async () => {
    mockMgetVersions(esClient, [{ id: 'a', seqNo: 9, primaryTerm: 3 }]);
    esClient.bulk
      .mockResolvedValueOnce({ errors: true, items: [missingItem('a')] })
      .mockResolvedValueOnce({ errors: false, items: [okItem('a', 10, 3)] });

    const result = await run(esClient, [updateWrite('a', version(5, 2))]);

    expect(esClient.bulk).toHaveBeenCalledTimes(2);
    expect(result).toEqual({ a: version(10, 3) });
  });

  it('resolves only the ids missing a version', async () => {
    mockMgetVersions(esClient, [{ id: 'b', seqNo: 1, primaryTerm: 1 }]);
    esClient.bulk.mockResolvedValue({
      errors: false,
      items: [okItem('a', 2, 1), okItem('b', 2, 1)],
    });

    await run(esClient, [updateWrite('a', version(1, 1)), updateWrite('b')]);

    expect(esClient.mget).toHaveBeenCalledTimes(1);
    expect(esClient.mget.mock.calls[0][0].ids).toEqual(['b']);
  });

  it('throws on a non-retriable (fatal) item error', async () => {
    esClient.bulk.mockResolvedValue({
      errors: true,
      items: [{ update: { _id: 'a', status: 400, error: { type: 'mapper_parsing_exception' } } }],
    });

    await expect(run(esClient, [updateWrite('a', version(1, 1))])).rejects.toThrow(
      /Failed to update 1 things/
    );
    expect(esClient.bulk).toHaveBeenCalledTimes(1);
  });

  it('resolves versions via getDataStream + mget when a write has none', async () => {
    mockMgetVersions(esClient, [{ id: 'a', seqNo: 4, primaryTerm: 1 }]);
    esClient.bulk.mockResolvedValue({ errors: false, items: [okItem('a', 5, 1)] });

    const result = await run(esClient, [updateWrite('a')]);

    expect(esClient.indices.getDataStream).toHaveBeenCalledTimes(1);
    expect(esClient.mget).toHaveBeenCalledTimes(1);
    expect(esClient.bulk.mock.calls[0][0].operations[0].update).toMatchObject({
      if_seq_no: 4,
      if_primary_term: 1,
    });
    expect(result).toEqual({ a: version(5, 1) });
  });

  it('returns an empty version map for an empty writes array', async () => {
    const result = await run(esClient, []);
    expect(result).toEqual({});
    expect(esClient.bulk).not.toHaveBeenCalled();
  });
});
