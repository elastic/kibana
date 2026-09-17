/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  BulkResponse,
  CountResponse,
  MgetResponse,
  SearchResponse,
  UpdateResponse,
} from '@elastic/elasticsearch/lib/api/types';
import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import type { NewAnnotation } from '../../common/annotations';
import { AnnotationsClient } from './annotations_client';
import { ANNOTATIONS_INDEX } from './ensure_index';
import { AnnotationsLimitError } from './limit_error';
import { MAX_ANNOTATIONS, QUOTA_ID, REPLIES_MAX } from './schemas';

const shards = { total: 1, successful: 1, failed: 0 };
const writeBase = { _id: 'x', _index: ANNOTATIONS_INDEX, _version: 1, _shards: shards };

const updateResponse = (
  result: UpdateResponse['result'],
  source?: Record<string, unknown>
): UpdateResponse => ({
  ...writeBase,
  result,
  ...(source ? { get: { found: true, _source: source } } : {}),
});

const countResponse = (count: number): CountResponse => ({ count, _shards: shards });

const searchResponse = (hits: Array<{ _id: string; _source: object }>): SearchResponse => ({
  took: 1,
  timed_out: false,
  _shards: { ...shards, skipped: 0 },
  hits: { hits: hits.map((hit) => ({ _index: ANNOTATIONS_INDEX, ...hit })) },
});

const input: NewAnnotation = {
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

describe('AnnotationsClient', () => {
  const esClient = elasticsearchServiceMock.createElasticsearchClient();
  const logger = loggingSystemMock.createLogger();
  const client = () => new AnnotationsClient(esClient, logger);

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
  });

  describe('create', () => {
    it('claims a slot before indexing and gives it back when indexing fails', async () => {
      const created = await client().create(input);
      expect(created).toEqual(expect.objectContaining({ ...input, id: expect.any(String) }));
      expect(quotaCalls()).toEqual([1]);
      expect(esClient.update.mock.invocationCallOrder[0]).toBeLessThan(
        esClient.index.mock.invocationCallOrder[0]
      );
      expect(esClient.update).toHaveBeenCalledWith(
        expect.objectContaining({
          id: QUOTA_ID,
          upsert: { count: 0 },
          scripted_upsert: true,
          retry_on_conflict: 5,
          script: expect.objectContaining({ params: { increment: 1, max: MAX_ANNOTATIONS } }),
        })
      );

      esClient.index.mockRejectedValueOnce(new Error('boom'));
      await expect(client().create(input)).rejects.toThrow('boom');
      expect(quotaCalls()).toEqual([1, 1, -1]);
    });

    it('recounts when the quota says the store is full, then refuses or corrects the count', async () => {
      esClient.update.mockResponseOnce(updateResponse('noop'));
      esClient.count.mockResponseOnce(countResponse(MAX_ANNOTATIONS));
      await expect(client().create(input)).rejects.toThrow(AnnotationsLimitError);
      expect(esClient.index).not.toHaveBeenCalled();

      esClient.update.mockResponseOnce(updateResponse('noop'));
      esClient.count.mockResponseOnce(countResponse(3));
      await client().create(input);
      expect(esClient.index).toHaveBeenNthCalledWith(1, {
        index: ANNOTATIONS_INDEX,
        id: QUOTA_ID,
        document: { count: 4 },
      });
      expect(esClient.index).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          index: ANNOTATIONS_INDEX,
          document: expect.objectContaining(input),
        })
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
      ).rejects.toThrow(AnnotationsLimitError);

      esClient.update.mockResponseOnce(updateResponse('not_found'));
      expect(await client().update('missing', { resolved: true })).toBeUndefined();
    });
  });

  describe('importAll', () => {
    it('claims room for the comments that are new and gives back that of those that failed', async () => {
      const annotations = ['a', 'b', 'c'].map((id) => ({
        ...input,
        id,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      }));
      const mget: MgetResponse = {
        docs: [
          { _index: ANNOTATIONS_INDEX, _id: 'a', found: true },
          { _index: ANNOTATIONS_INDEX, _id: 'b', found: false },
          { _index: ANNOTATIONS_INDEX, _id: 'c', found: false },
        ],
      };
      const bulk: BulkResponse = {
        errors: true,
        took: 1,
        items: [
          { index: { _index: ANNOTATIONS_INDEX, _id: 'a', status: 200 } },
          { index: { _index: ANNOTATIONS_INDEX, _id: 'b', status: 200 } },
          {
            index: {
              _index: ANNOTATIONS_INDEX,
              _id: 'c',
              status: 400,
              error: { type: 'mapper_parsing_exception', reason: 'bad field' },
            },
          },
        ],
      };
      esClient.mget.mockResponseOnce(mget);
      esClient.bulk.mockResponseOnce(bulk);

      const result = await client().importAll({ version: 2, exportedAt: '', annotations });

      expect(result).toEqual({ imported: 2, skipped: 0, failed: 1 });
      expect(quotaCalls()).toEqual([2, -1]);
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('[c] bad field'));
    });

    it('refuses the whole import when the new comments would not fit', async () => {
      esClient.mget.mockResponseOnce({
        docs: [{ _index: ANNOTATIONS_INDEX, _id: 'a', found: false }],
      });
      esClient.update.mockResponseOnce(updateResponse('noop'));
      esClient.count.mockResponseOnce(countResponse(MAX_ANNOTATIONS));

      await expect(
        client().importAll({
          version: 2,
          exportedAt: '',
          annotations: [{ ...input, id: 'a', createdAt: '', updatedAt: '' }],
        })
      ).rejects.toThrow(AnnotationsLimitError);
      expect(esClient.bulk).not.toHaveBeenCalled();
    });
  });

  describe('list and exportAll', () => {
    it('reads comments without the quota document or screenshot images, rewriting first-version records', async () => {
      esClient.search.mockResponse(searchResponse([{ _id: 'a', _source: legacyStored }]));

      const [listed] = await client().list();
      const exported = await client().exportAll();

      expect(esClient.search).toHaveBeenCalledWith(
        expect.objectContaining({
          size: MAX_ANNOTATIONS,
          query: { bool: { must_not: { ids: { values: [QUOTA_ID] } } } },
          _source_excludes: ['snapshot.image'],
        })
      );
      expect(listed).toEqual(
        expect.objectContaining({
          id: 'a',
          trail: [],
          route: { pageKey: '/app/x#/view/y', path: '/app/x?q=1#/view/y?_g=(a:b)' },
        })
      );
      expect(exported.version).toBe(2);
      expect(exported.annotations[0]).not.toHaveProperty('snapshot');
    });
  });
});
