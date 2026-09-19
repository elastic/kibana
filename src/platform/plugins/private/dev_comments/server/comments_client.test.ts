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
import { CommentsClient } from './comments_client';
import { COMMENTS_INDEX } from './ensure_index';
import { CommentsLimitError } from './limit_error';
import { MAX_COMMENTS, REPLIES_MAX } from './schemas';

const shards = { total: 1, successful: 1, failed: 0 };
const writeBase = { _id: 'x', _index: COMMENTS_INDEX, _version: 1, _shards: shards };

const updateResponse: UpdateResponse = { ...writeBase, result: 'updated' };
const indexResponse: IndexResponse = { ...writeBase, result: 'created' };
const countResponse = (count: number): CountResponse => ({ count, _shards: shards });

const getResponse = (id: string, source: object | undefined): GetResponse => ({
  _index: COMMENTS_INDEX,
  _id: id,
  found: source !== undefined,
  ...(source ? { _seq_no: 7, _primary_term: 2, _source: source } : {}),
});

const searchResponse = (hits: Array<{ _id: string; _source: object }>): SearchResponse => ({
  took: 1,
  timed_out: false,
  _shards: { ...shards, skipped: 0 },
  hits: { hits: hits.map((hit) => ({ _index: COMMENTS_INDEX, ...hit })) },
});

const input: NewComment = {
  author: { username: 'capybara', displayName: 'Capybara' },
  text: 'Hello',
  resolved: false,
  replies: [],
  route: { pageKey: '/app/one', path: '/app/one' },
  anchor: { locators: [{ type: 'id', value: 'x' }], relativeX: 0.5, relativeY: 0.5 },
  trail: [],
};

const stored = {
  ...input,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  snapshot: { mimeType: 'image/jpeg', width: 1, height: 1, image: 'AAAA' },
};

/** The same comment as `list` and `update` read it: without the image. */
const { image, ...snapshotWithoutImage } = stored.snapshot;
const storedRead = { ...stored, snapshot: snapshotWithoutImage };

const reply = { author: input.author, text: 'Reply' };

describe('CommentsClient', () => {
  const esClient = elasticsearchServiceMock.createElasticsearchClient();
  const logger = loggingSystemMock.createLogger();
  const client = () => new CommentsClient(esClient, logger);

  beforeEach(() => {
    jest.clearAllMocks();
    esClient.indices.exists.mockResponse(true);
    esClient.count.mockResponse(countResponse(3));
    esClient.index.mockResponse(indexResponse);
    esClient.get.mockResponse(getResponse('a', storedRead));
    esClient.update.mockResponse(updateResponse);
  });

  describe('create', () => {
    it('stores the comment unless the store is full', async () => {
      const created = await client().create(input);

      expect(created).toEqual(
        expect.objectContaining({ ...input, id: expect.any(String), createdAt: expect.any(String) })
      );
      expect(esClient.index).toHaveBeenCalledWith({
        index: COMMENTS_INDEX,
        id: created.id,
        document: { ...input, createdAt: created.createdAt, updatedAt: created.createdAt },
        refresh: 'wait_for',
      });

      esClient.count.mockResponseOnce(countResponse(MAX_COMMENTS));
      await expect(client().create(input)).rejects.toThrow(CommentsLimitError);
      expect(esClient.index).toHaveBeenCalledTimes(1);
    });
  });

  describe('update', () => {
    it('writes the changed fields back only if the comment is still as it was read', async () => {
      const updated = await client().update('a', { resolved: true, reply });

      expect(esClient.update).toHaveBeenCalledWith(
        {
          index: COMMENTS_INDEX,
          id: 'a',
          doc: {
            updatedAt: expect.any(String),
            resolved: true,
            replies: [{ id: expect.any(String), ...reply, createdAt: expect.any(String) }],
          },
          if_seq_no: 7,
          if_primary_term: 2,
          refresh: 'wait_for',
        },
        { ignore: [404, 409], meta: true }
      );
      expect(updated).toEqual({
        ...storedRead,
        id: 'a',
        updatedAt: expect.any(String),
        resolved: true,
        replies: [expect.objectContaining(reply)],
      });
      // The image is neither read nor written back: only the changed fields are.
      expect(esClient.get).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'a', _source_excludes: ['snapshot.image'] }),
        { ignore: [404] }
      );
    });

    it('reads the comment again when it changed under the update, until it gives up', async () => {
      const changed = { ...storedRead, replies: [{ id: 'first', createdAt: '', ...reply }] };
      esClient.update.mockResponseOnce(updateResponse, { statusCode: 409 });
      esClient.get.mockResponseOnce(getResponse('a', storedRead)).mockResponseOnce({
        ...getResponse('a', changed),
        _seq_no: 8,
      });

      const updated = await client().update('a', { reply });

      expect(esClient.update).toHaveBeenCalledTimes(2);
      expect(esClient.update).toHaveBeenLastCalledWith(
        expect.objectContaining({
          if_seq_no: 8,
          doc: expect.objectContaining({
            replies: [changed.replies[0], expect.objectContaining(reply)],
          }),
        }),
        expect.anything()
      );
      expect(updated?.replies).toHaveLength(2);

      esClient.update.mockResponse(updateResponse, { statusCode: 409 });
      await expect(client().update('a', { reply })).rejects.toThrow('kept changing');
    });

    it('reports the reply limit and unknown comments', async () => {
      const full = { ...storedRead, replies: Array.from({ length: REPLIES_MAX }, () => reply) };
      esClient.get.mockResponseOnce(getResponse('a', full));
      await expect(client().update('a', { reply })).rejects.toThrow(CommentsLimitError);
      expect(esClient.update).not.toHaveBeenCalled();

      esClient.get.mockResponseOnce(getResponse('missing', undefined));
      expect(await client().update('missing', { resolved: true })).toBeUndefined();
    });
  });

  describe('list', () => {
    it('reads every comment, oldest first, without screenshot images', async () => {
      esClient.search.mockResponse(searchResponse([{ _id: 'a', _source: storedRead }]));

      expect(await client().list()).toEqual([{ ...storedRead, id: 'a' }]);
      expect(esClient.search).toHaveBeenCalledWith(
        expect.objectContaining({
          size: MAX_COMMENTS,
          sort: [{ createdAt: 'asc' }],
          _source_excludes: ['snapshot.image'],
        })
      );
    });
  });
});
