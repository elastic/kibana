/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  CountResponse,
  GetResponse,
  IndexResponse,
  SearchResponse,
  UpdateResponse,
} from '@elastic/elasticsearch/lib/api/types';
import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import type { NewComment } from '../common';
import { CommentsClient, RESERVATION_GRACE_MS } from './comments_client';
import { COMMENTS_INDEX } from './ensure_index';
import { CommentsLimitError } from './limit_error';
import { MAX_COMMENTS, QUOTA_ID, REPLIES_MAX } from './schemas';

const shards = { total: 1, successful: 1, failed: 0 };
const writeBase = { _id: 'x', _index: COMMENTS_INDEX, _version: 1, _shards: shards };

const updateResponse = (
  result: UpdateResponse['result'],
  source?: Record<string, unknown>
): UpdateResponse => ({
  ...writeBase,
  result,
  ...(source ? { get: { found: true, _source: source } } : {}),
});

const indexResponse: IndexResponse = { ...writeBase, result: 'created' };

const countResponse = (count: number): CountResponse => ({ count, _shards: shards });

const quotaResponse: GetResponse = {
  _index: COMMENTS_INDEX,
  _id: QUOTA_ID,
  found: true,
  _seq_no: 7,
  _primary_term: 2,
  _source: { count: MAX_COMMENTS },
};

const searchResponse = (hits: Array<{ _id: string; _source: object }>): SearchResponse => ({
  took: 1,
  timed_out: false,
  _shards: { ...shards, skipped: 0 },
  hits: { hits: hits.map((hit) => ({ _index: COMMENTS_INDEX, ...hit })) },
});

const input: NewComment = {
  author: { username: 'dana', displayName: 'Dana' },
  text: 'Hello',
  resolved: false,
  replies: [],
  route: { pageKey: '/app/one', path: '/app/one' },
  anchor: { locators: [{ type: 'id', value: 'x' }], relativeX: 0.5, relativeY: 0.5 },
  trail: [],
};

/** A comment as the first version of the layer stored it: legacy route, no trail, with a screenshot. */
const legacyStored = {
  ...input,
  trail: undefined,
  route: { pathname: '/app/x', url: 'http://host/kbn/app/x?q=1#/view/y?_g=(a:b)' },
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  snapshot: { mimeType: 'image/jpeg', width: 1, height: 1, image: 'AAAA' },
};

describe('CommentsClient', () => {
  const esClient = elasticsearchServiceMock.createElasticsearchClient();
  const logger = loggingSystemMock.createLogger();
  const client = () => new CommentsClient(esClient, logger);

  const quotaCalls = () =>
    esClient.update.mock.calls
      .filter(([request]) => request.id === QUOTA_ID)
      .map(([{ script }]) =>
        typeof script === 'object' && 'params' in script ? script.params?.increment : undefined
      );

  beforeEach(() => {
    jest.clearAllMocks();
    esClient.indices.exists.mockResponse(true);
    esClient.update.mockResponse(updateResponse('updated'));
    esClient.index.mockResponse(indexResponse);
    esClient.get.mockResponse(quotaResponse);
  });

  describe('create', () => {
    it('claims a slot before indexing and gives it back when the comment was not written', async () => {
      const created = await client().create(input);
      expect(created).toEqual(expect.objectContaining({ ...input, id: expect.any(String) }));
      expect(quotaCalls()).toEqual([1]);
      expect(esClient.update.mock.invocationCallOrder[0]).toBeLessThan(
        esClient.index.mock.invocationCallOrder[0]
      );
      expect(esClient.update).toHaveBeenCalledWith(
        expect.objectContaining({
          id: QUOTA_ID,
          retry_on_conflict: 5,
          script: expect.objectContaining({
            params: { increment: 1, max: MAX_COMMENTS, now: expect.any(String) },
          }),
        }),
        { ignore: [404], meta: true }
      );

      esClient.index.mockRejectedValueOnce(new Error('boom'));
      esClient.exists.mockResponseOnce(false);
      await expect(client().create(input)).rejects.toThrow('boom');
      expect(esClient.exists).toHaveBeenCalledWith({
        index: COMMENTS_INDEX,
        id: esClient.index.mock.calls[1][0].id,
      });
      expect(quotaCalls()).toEqual([1, 1, -1]);
    });

    it('keeps the slot when the comment was written despite the error, or when that cannot be told', async () => {
      // Elasticsearch can commit the document and still fail the request, e.g. by timing out on the refresh.
      esClient.index.mockRejectedValueOnce(new Error('timeout'));
      esClient.exists.mockResponseOnce(true);
      const created = await client().create(input);
      expect(created).toEqual(expect.objectContaining({ ...input, id: expect.any(String) }));
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('was stored although'));

      esClient.index.mockRejectedValueOnce(new Error('boom'));
      esClient.exists.mockRejectedValueOnce(new Error('unreachable'));
      await expect(client().create(input)).rejects.toThrow('boom');

      expect(quotaCalls()).toEqual([1, 1]);
    });

    it('creates a missing quota document from the comments already stored', async () => {
      esClient.update.mockResponseOnce(updateResponse('noop'), { statusCode: 404 });
      esClient.count.mockResponseOnce(countResponse(500));

      await client().create(input);

      expect(esClient.index).toHaveBeenNthCalledWith(
        1,
        { index: COMMENTS_INDEX, id: QUOTA_ID, document: { count: 500 }, op_type: 'create' },
        { ignore: [409] }
      );
      expect(quotaCalls()).toEqual([1, 1]);
      expect(esClient.index).toHaveBeenCalledTimes(2);
    });

    it('recounts when the quota says the store is full, then refuses or corrects the count', async () => {
      esClient.update.mockResponseOnce(updateResponse('noop'));
      esClient.count.mockResponseOnce(countResponse(MAX_COMMENTS));
      await expect(client().create(input)).rejects.toThrow(CommentsLimitError);
      expect(esClient.index).not.toHaveBeenCalled();

      esClient.update.mockResponseOnce(updateResponse('noop'));
      esClient.count.mockResponseOnce(countResponse(3));
      await client().create(input);
      expect(esClient.index).toHaveBeenNthCalledWith(
        1,
        {
          index: COMMENTS_INDEX,
          id: QUOTA_ID,
          document: { count: 4, reservedAt: expect.any(String) },
          if_seq_no: 7,
          if_primary_term: 2,
        },
        { ignore: [409], meta: true }
      );
      expect(esClient.index).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          index: COMMENTS_INDEX,
          document: expect.objectContaining(input),
        })
      );
    });

    it('does not recount while room claimed moments ago may still be unwritten', async () => {
      // Another writer claimed the last slot and has not indexed its comment yet: the
      // count would not include it, and correcting the quota from it would hand out its room.
      const claimedAt = (msAgo: number) => new Date(Date.now() - msAgo).toISOString();
      esClient.update.mockResponseOnce(updateResponse('noop'));
      esClient.count.mockResponseOnce(countResponse(MAX_COMMENTS - 1));
      esClient.get.mockResponseOnce({
        ...quotaResponse,
        _source: { count: MAX_COMMENTS, reservedAt: claimedAt(RESERVATION_GRACE_MS / 2) },
      });
      await expect(client().create(input)).rejects.toThrow(CommentsLimitError);
      expect(esClient.index).not.toHaveBeenCalled();

      // Once every claim is old enough to have been written or given up, the count is trusted.
      esClient.update.mockResponseOnce(updateResponse('noop'));
      esClient.count.mockResponseOnce(countResponse(MAX_COMMENTS - 1));
      esClient.get.mockResponseOnce({
        ...quotaResponse,
        _source: { count: MAX_COMMENTS, reservedAt: claimedAt(RESERVATION_GRACE_MS) },
      });
      await client().create(input);
      expect(esClient.index).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          id: QUOTA_ID,
          document: { count: MAX_COMMENTS, reservedAt: expect.any(String) },
        }),
        expect.anything()
      );
      expect(esClient.index).toHaveBeenCalledTimes(2);
    });

    it('claims again when another writer corrected the quota first', async () => {
      esClient.update.mockResponseOnce(updateResponse('noop'));
      esClient.count.mockResponseOnce(countResponse(3));
      esClient.index.mockResponseOnce(indexResponse, { statusCode: 409 });

      await client().create(input);

      expect(quotaCalls()).toEqual([1, 1]);
      expect(esClient.index).toHaveBeenCalledTimes(2);
      expect(esClient.index).toHaveBeenLastCalledWith(
        expect.objectContaining({ document: expect.objectContaining(input) })
      );
    });
  });

  describe('update', () => {
    it('appends replies in Elasticsearch and returns the updated comment', async () => {
      esClient.update.mockResponseOnce(
        updateResponse('updated', { ...legacyStored, resolved: true })
      );

      const updated = await client().update('a', {
        resolved: true,
        reply: { author: input.author, text: 'Reply' },
      });

      expect(esClient.update).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'a',
          retry_on_conflict: 5,
          refresh: 'wait_for',
          _source_excludes: ['snapshot.image'],
          script: expect.objectContaining({
            params: {
              now: expect.any(String),
              maxReplies: REPLIES_MAX,
              resolved: true,
              reply: expect.objectContaining({
                id: expect.any(String),
                createdAt: expect.any(String),
                text: 'Reply',
              }),
            },
          }),
        }),
        { ignore: [404] }
      );
      expect(esClient.get).not.toHaveBeenCalled();
      expect(updated).toEqual(
        expect.objectContaining({
          id: 'a',
          resolved: true,
          trail: [],
          route: { pageKey: '/app/x#/view/y', path: '/app/x?q=1#/view/y?_g=(a:b)' },
          snapshot: expect.objectContaining({ image: undefined }),
        })
      );
    });

    it('reports the reply limit and unknown comments', async () => {
      esClient.update.mockResponseOnce(updateResponse('noop'));
      await expect(
        client().update('a', { reply: { author: input.author, text: 'One too many' } })
      ).rejects.toThrow(CommentsLimitError);

      esClient.update.mockResponseOnce(updateResponse('not_found'));
      expect(await client().update('missing', { resolved: true })).toBeUndefined();
    });
  });

  describe('list and exportAll', () => {
    it('reads comments without the quota document, rewriting first-version records; only the export has the screenshot images', async () => {
      esClient.search.mockResponse(searchResponse([{ _id: 'a', _source: legacyStored }]));

      const [listed] = await client().list();
      const exported = await client().exportAll();

      const query = { bool: { must_not: { ids: { values: [QUOTA_ID] } } } };
      expect(esClient.search).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          size: MAX_COMMENTS,
          query,
          _source_excludes: ['snapshot.image'],
        })
      );
      expect(esClient.search).toHaveBeenNthCalledWith(
        2,
        expect.not.objectContaining({ _source_excludes: expect.anything() })
      );
      expect(esClient.search).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ size: MAX_COMMENTS, query })
      );
      expect(listed).toEqual(
        expect.objectContaining({
          id: 'a',
          trail: [],
          route: { pageKey: '/app/x#/view/y', path: '/app/x?q=1#/view/y?_g=(a:b)' },
        })
      );
      expect(exported.version).toBe(2);
      expect(exported.comments[0]).toEqual(
        expect.objectContaining({
          id: 'a',
          route: { pageKey: '/app/x#/view/y', path: '/app/x?q=1#/view/y?_g=(a:b)' },
          snapshot: legacyStored.snapshot,
        })
      );
    });
  });
});
