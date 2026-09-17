/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { loggerMock } from '@kbn/logging-mocks';
import {
  fetchAlertsByQuery,
  fetchDocumentsByIds,
  fetchDocumentsByQuery,
  MAX_TRIGGER_EVENT_BYTES,
  MAX_TRIGGER_EVENT_DOCS,
} from './fetch_event_documents';

describe('fetch_event_documents', () => {
  let mockEsClient: {
    mget: jest.Mock;
    openPointInTime: jest.Mock;
    search: jest.Mock;
    closePointInTime: jest.Mock;
  };
  let mockAlertsClient: { find: jest.Mock };
  let logger: ReturnType<typeof loggerMock.create>;

  const asEsClient = () => mockEsClient as unknown as ElasticsearchClient;

  beforeEach(() => {
    mockEsClient = {
      mget: jest.fn(),
      openPointInTime: jest.fn().mockResolvedValue({ id: 'pit-1' }),
      search: jest.fn(),
      closePointInTime: jest.fn().mockResolvedValue({ succeeded: true }),
    };
    mockAlertsClient = { find: jest.fn() };
    logger = loggerMock.create();
  });

  describe('fetchDocumentsByIds', () => {
    it('returns an empty array without calling mget when there are no ids', async () => {
      const hits = await fetchDocumentsByIds([], asEsClient(), logger);
      expect(hits).toEqual([]);
      expect(mockEsClient.mget).not.toHaveBeenCalled();
    });

    it('returns found documents and warns for missing ones', async () => {
      mockEsClient.mget.mockResolvedValue({
        docs: [
          { found: true, _id: 'a', _index: 'idx', _source: { foo: 'bar' } },
          { found: false, _id: 'b', _index: 'idx' },
        ],
      });

      const hits = await fetchDocumentsByIds(
        [
          { _id: 'a', _index: 'idx' },
          { _id: 'b', _index: 'idx' },
        ],
        asEsClient(),
        logger
      );

      expect(mockEsClient.mget).toHaveBeenCalledWith(
        {
          docs: [
            { _id: 'a', _index: 'idx' },
            { _id: 'b', _index: 'idx' },
          ],
        },
        { maxResponseSize: MAX_TRIGGER_EVENT_BYTES }
      );
      expect(hits).toEqual([{ _id: 'a', _index: 'idx', _source: { foo: 'bar' } }]);
      expect(logger.warn).toHaveBeenCalledWith('Document not found: b in index idx');
    });

    it('rejects an explicit selection larger than MAX_TRIGGER_EVENT_DOCS', async () => {
      const ids = Array.from({ length: MAX_TRIGGER_EVENT_DOCS + 1 }, (_, index) => ({
        _id: `doc-${index}`,
        _index: 'idx',
      }));

      await expect(fetchDocumentsByIds(ids, asEsClient(), logger)).rejects.toThrow(
        `cannot contain more than ${MAX_TRIGGER_EVENT_DOCS} document IDs`
      );
      expect(mockEsClient.mget).not.toHaveBeenCalled();
    });

    it('rethrows and logs on mget failure', async () => {
      mockEsClient.mget.mockRejectedValue(new Error('boom'));
      await expect(
        fetchDocumentsByIds([{ _id: 'a', _index: 'idx' }], asEsClient(), logger)
      ).rejects.toThrow('boom');
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to fetch documents by ids')
      );
    });
  });

  describe('fetchDocumentsByQuery', () => {
    const page = (ids: string[], total: number) => ({
      pit_id: 'pit-1',
      hits: {
        total: { value: total, relation: 'eq' },
        hits: ids.map((id) => ({ _id: id, _index: 'idx', _source: { id }, sort: [id] })),
      },
    });

    it('pages through results with search_after and closes the point in time', async () => {
      mockEsClient.search
        .mockResolvedValueOnce(page(['a', 'b'], 3))
        .mockResolvedValueOnce(page(['c'], 3))
        .mockResolvedValueOnce(page([], 3));

      const result = await fetchDocumentsByQuery(
        { query: { match_all: {} }, index: 'idx', maxDocs: 1000, pageSize: 2 },
        asEsClient(),
        logger
      );

      expect(mockEsClient.openPointInTime).toHaveBeenCalledWith(
        expect.objectContaining({ index: 'idx' })
      );
      expect(mockEsClient.search.mock.calls[0][0].sort).toEqual([
        { '@timestamp': { order: 'desc', unmapped_type: 'date' } },
        { _shard_doc: 'asc' },
      ]);
      expect(mockEsClient.search.mock.calls[0][0].allow_partial_search_results).toBe(false);
      expect(mockEsClient.search.mock.calls[0][0].track_total_hits).toBe(1001);
      expect(mockEsClient.search.mock.calls[1][0].track_total_hits).toBe(false);
      expect(mockEsClient.search.mock.calls[0][1]).toEqual({
        maxResponseSize: MAX_TRIGGER_EVENT_BYTES,
      });
      // First call has no search_after, subsequent calls do.
      expect(mockEsClient.search.mock.calls[0][0].search_after).toBeUndefined();
      expect(mockEsClient.search.mock.calls[1][0].search_after).toEqual(['b']);
      expect(result.hits.map((h) => h._id)).toEqual(['a', 'b', 'c']);
      expect(result.total).toBe(3);
      expect(result.totalRelation).toBe('eq');
      expect(result.truncated).toBe(false);
      expect(mockEsClient.closePointInTime).toHaveBeenCalledWith({ id: 'pit-1' });
    });

    it('stops at maxDocs and reports truncation', async () => {
      mockEsClient.search.mockResolvedValueOnce(page(['a', 'b'], 10));

      const result = await fetchDocumentsByQuery(
        { query: { match_all: {} }, index: 'idx', maxDocs: 2 },
        asEsClient(),
        logger
      );

      expect(mockEsClient.search).toHaveBeenCalledTimes(1);
      expect(mockEsClient.search.mock.calls[0][0].size).toBe(2);
      expect(mockEsClient.search.mock.calls[0][0].track_total_hits).toBe(3);
      expect(result.hits).toHaveLength(2);
      expect(result.total).toBe(10);
      expect(result.totalRelation).toBe('eq');
      expect(result.truncated).toBe(true);
      expect(mockEsClient.closePointInTime).toHaveBeenCalled();
    });

    it('preserves an inexact tracked total when reporting truncation', async () => {
      mockEsClient.search.mockResolvedValueOnce({
        ...page(['a', 'b'], 3),
        hits: {
          ...page(['a', 'b'], 3).hits,
          total: { value: 3, relation: 'gte' },
        },
      });

      const result = await fetchDocumentsByQuery(
        { query: { match_all: {} }, index: 'idx', maxDocs: 2 },
        asEsClient(),
        logger
      );

      expect(result).toEqual({
        hits: [
          { _id: 'a', _index: 'idx', _source: { id: 'a' } },
          { _id: 'b', _index: 'idx', _source: { id: 'b' } },
        ],
        total: 3,
        totalRelation: 'gte',
        truncated: true,
      });
    });

    it('counts source-less search hits toward maxDocs', async () => {
      mockEsClient.search.mockResolvedValueOnce({
        pit_id: 'pit-1',
        hits: {
          total: { value: 10, relation: 'eq' },
          hits: [
            { _id: 'a', _index: 'idx', sort: ['a'] },
            { _id: 'b', _index: 'idx', sort: ['b'] },
          ],
        },
      });

      const result = await fetchDocumentsByQuery(
        { query: { match_all: {} }, index: 'idx', maxDocs: 2 },
        asEsClient(),
        logger
      );

      expect(mockEsClient.search).toHaveBeenCalledTimes(1);
      expect(result).toEqual({
        hits: [],
        total: 10,
        totalRelation: 'eq',
        truncated: true,
      });
    });

    it('rejects accumulated document sources that exceed maxBytes', async () => {
      mockEsClient.search.mockResolvedValueOnce(page(['a', 'b'], 2));

      await expect(
        fetchDocumentsByQuery(
          { query: { match_all: {} }, index: 'idx', maxBytes: 10 },
          asEsClient(),
          logger
        )
      ).rejects.toThrow('Trigger event document sources exceed the 10 byte limit');
      expect(mockEsClient.search.mock.calls[0][1]).toEqual({ maxResponseSize: 10 });
      expect(mockEsClient.closePointInTime).toHaveBeenCalled();
    });

    it.each([
      ['times out', { timed_out: true }],
      ['has failed shards', { _shards: { failed: 1 } }],
    ])('rejects an incomplete response that %s', async (_description, incompleteResponse) => {
      mockEsClient.search.mockResolvedValueOnce({
        ...page(['a'], 1),
        ...incompleteResponse,
        pit_id: 'pit-2',
      });

      await expect(
        fetchDocumentsByQuery({ query: { match_all: {} }, index: 'idx' }, asEsClient(), logger)
      ).rejects.toThrow('Incomplete document query response');
      expect(mockEsClient.closePointInTime).toHaveBeenCalledWith({ id: 'pit-2' });
    });

    it('defaults to MAX_TRIGGER_EVENT_DOCS when maxDocs is not provided', async () => {
      mockEsClient.search.mockResolvedValueOnce(page([], 0));

      await fetchDocumentsByQuery({ query: { match_all: {} }, index: 'idx' }, asEsClient(), logger);

      expect(mockEsClient.search.mock.calls[0][0].size).toBe(
        Math.min(1000, MAX_TRIGGER_EVENT_DOCS)
      );
    });

    it('closes the point in time even when search throws', async () => {
      mockEsClient.search.mockRejectedValue(new Error('search failed'));

      await expect(
        fetchDocumentsByQuery({ query: { match_all: {} }, index: 'idx' }, asEsClient(), logger)
      ).rejects.toThrow('search failed');
      expect(mockEsClient.closePointInTime).toHaveBeenCalledWith({ id: 'pit-1' });
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to fetch documents by query')
      );
    });
  });

  describe('fetchAlertsByQuery', () => {
    const page = (ids: string[], total: number, relation: 'eq' | 'gte' = 'eq') => ({
      hits: {
        total: { value: total, relation },
        hits: ids.map((id) => ({
          _id: id,
          _index: '.alerts-test-default',
          _source: { id },
          sort: [`2026-01-01T00:00:00.000Z`, id],
        })),
      },
    });

    it('pages through the authorized alerts client with bounded total tracking', async () => {
      mockAlertsClient.find
        .mockResolvedValueOnce(page(['a', 'b'], 3))
        .mockResolvedValueOnce(page(['c'], 3));

      const result = await fetchAlertsByQuery(
        {
          query: { match_all: {} },
          index: ['.alerts-test-default', '.alerts-observability-default'],
          maxDocs: 1000,
          pageSize: 2,
        },
        mockAlertsClient,
        logger
      );

      expect(mockAlertsClient.find.mock.calls[0][0]).toEqual(
        expect.objectContaining({
          query: { match_all: {} },
          index: '.alerts-test-default,.alerts-observability-default',
          size: 2,
          track_total_hits: 1001,
          search_after: undefined,
        })
      );
      expect(mockAlertsClient.find.mock.calls[1][0]).toEqual(
        expect.objectContaining({
          track_total_hits: false,
          search_after: ['2026-01-01T00:00:00.000Z', 'b'],
        })
      );
      expect(result).toEqual({
        hits: [
          { _id: 'a', _index: '.alerts-test-default', _source: { id: 'a' } },
          { _id: 'b', _index: '.alerts-test-default', _source: { id: 'b' } },
          { _id: 'c', _index: '.alerts-test-default', _source: { id: 'c' } },
        ],
        total: 3,
        totalRelation: 'eq',
        truncated: false,
      });
    });

    it('preserves the lower-bound relation when the authorized result is capped', async () => {
      mockAlertsClient.find.mockResolvedValueOnce(page(['a', 'b'], 3, 'gte'));

      const result = await fetchAlertsByQuery(
        { query: { match_all: {} }, index: '.alerts-test-default', maxDocs: 2 },
        mockAlertsClient,
        logger
      );

      expect(mockAlertsClient.find.mock.calls[0][0].track_total_hits).toBe(3);
      expect(result.total).toBe(3);
      expect(result.totalRelation).toBe('gte');
      expect(result.truncated).toBe(true);
    });
  });
});
