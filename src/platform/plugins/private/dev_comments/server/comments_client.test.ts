/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { errors } from '@elastic/elasticsearch';
import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import type { NewComment } from '../common';
import { CommentsClient, type CommentsStorage, type SnapshotsStorage } from './comments_client';
import { CommentsLimitError } from './limit_error';
import { MAX_COMMENTS, REPLIES_MAX } from './schemas';

const responseError = (statusCode: number) =>
  new errors.ResponseError(elasticsearchServiceMock.createApiResponse({ statusCode }));

const storageMock = <T>() =>
  ({
    search: jest.fn(),
    get: jest.fn(),
    index: jest.fn(),
    delete: jest.fn(),
  } as unknown as jest.Mocked<T>);

const searchResponse = (hits: Array<{ _id: string; _source: object }>, total = hits.length) => ({
  hits: { total: { value: total, relation: 'eq' }, hits },
});

const getResponse = (id: string, source: object) => ({
  _id: id,
  found: true,
  _seq_no: 7,
  _primary_term: 2,
  _source: source,
});

const snapshot = { mimeType: 'image/jpeg' as const, width: 1, height: 1, image: 'AAAA' };
const { image, ...snapshotSize } = snapshot;

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
  snapshot: snapshotSize,
};

const reply = { author: input.author, text: 'Reply' };

describe('CommentsClient', () => {
  const comments = storageMock<CommentsStorage>();
  const snapshots = storageMock<SnapshotsStorage>();
  const logger = loggingSystemMock.createLogger();
  const client = () => new CommentsClient(comments, snapshots, logger);

  beforeEach(() => {
    jest.resetAllMocks();
    comments.search.mockResolvedValue(searchResponse([], 3) as never);
    comments.get.mockResolvedValue(getResponse('a', stored) as never);
    comments.index.mockResolvedValue({} as never);
    snapshots.get.mockResolvedValue(getResponse('a', snapshot) as never);
    snapshots.index.mockResolvedValue({} as never);
    snapshots.delete.mockResolvedValue({ acknowledged: true, result: 'deleted' });
  });

  describe('create', () => {
    it('stores the comment with the size of its screenshot, and the image under the same id', async () => {
      const created = await client().create({ ...input, snapshot });

      expect(created).toEqual({
        ...input,
        id: expect.any(String),
        createdAt: expect.any(String),
        updatedAt: created.createdAt,
        snapshot: snapshotSize,
      });
      expect(comments.index).toHaveBeenCalledWith({
        id: created.id,
        document: {
          ...input,
          createdAt: created.createdAt,
          updatedAt: created.createdAt,
          snapshot: snapshotSize,
        },
      });
      expect(snapshots.index).toHaveBeenCalledWith({ id: created.id, document: snapshot });
      expect(snapshots.index.mock.invocationCallOrder[0]).toBeLessThan(
        comments.index.mock.invocationCallOrder[0]
      );
    });

    it('stores a comment without a screenshot in the comments alone, unless the store is full', async () => {
      const created = await client().create(input);

      expect(created.snapshot).toBeUndefined();
      expect(comments.index).toHaveBeenCalledWith({
        id: created.id,
        document: expect.not.objectContaining({ snapshot: expect.anything() }),
      });
      expect(snapshots.index).not.toHaveBeenCalled();

      comments.search.mockResolvedValueOnce(searchResponse([], MAX_COMMENTS) as never);
      await expect(client().create(input)).rejects.toThrow(CommentsLimitError);
      expect(comments.index).toHaveBeenCalledTimes(1);
    });

    it('removes the screenshot again when the comment cannot be stored', async () => {
      comments.index.mockRejectedValueOnce(responseError(503));

      await expect(client().create({ ...input, snapshot })).rejects.toThrow(errors.ResponseError);

      const [{ id }] = snapshots.index.mock.calls[0];
      expect(snapshots.delete).toHaveBeenCalledWith({ id });
      expect(logger.warn).not.toHaveBeenCalled();

      // Without a screenshot there is nothing to remove.
      comments.index.mockRejectedValueOnce(responseError(503));
      await expect(client().create(input)).rejects.toThrow(errors.ResponseError);
      expect(snapshots.delete).toHaveBeenCalledTimes(1);
    });

    it('reports the comment failure, and logs the screenshot it could not remove either', async () => {
      comments.index.mockRejectedValueOnce(new Error('comment failed'));
      snapshots.delete.mockRejectedValueOnce(new Error('delete failed'));

      await expect(client().create({ ...input, snapshot })).rejects.toThrow('comment failed');

      const [{ id }] = snapshots.index.mock.calls[0];
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining(`Comment ${id}`));
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('delete failed'));
    });
  });

  describe('update', () => {
    it('writes the changed comment back only if it is still as it was read', async () => {
      const updated = await client().update('a', { resolved: true, reply });

      expect(comments.get).toHaveBeenCalledWith({ id: 'a', seq_no_primary_term: true });
      expect(comments.index).toHaveBeenCalledWith({
        id: 'a',
        document: {
          ...stored,
          updatedAt: expect.any(String),
          resolved: true,
          replies: [{ id: expect.any(String), ...reply, createdAt: expect.any(String) }],
        },
        if_seq_no: 7,
        if_primary_term: 2,
      });
      expect(updated).toEqual({
        ...stored,
        id: 'a',
        updatedAt: expect.any(String),
        resolved: true,
        replies: [expect.objectContaining(reply)],
      });
      expect(snapshots.get).not.toHaveBeenCalled();
      expect(snapshots.index).not.toHaveBeenCalled();
    });

    it('reads the comment again when it changed under the update, until it gives up', async () => {
      const changed = { ...stored, replies: [{ id: 'first', createdAt: '', ...reply }] };
      comments.index.mockRejectedValueOnce(responseError(409));
      comments.get
        .mockResolvedValueOnce(getResponse('a', stored) as never)
        .mockResolvedValueOnce({ ...getResponse('a', changed), _seq_no: 8 } as never);

      const updated = await client().update('a', { reply });

      expect(comments.index).toHaveBeenCalledTimes(2);
      expect(comments.index).toHaveBeenLastCalledWith(
        expect.objectContaining({
          if_seq_no: 8,
          document: expect.objectContaining({
            replies: [changed.replies[0], expect.objectContaining(reply)],
          }),
        })
      );
      expect(updated?.replies).toHaveLength(2);

      comments.index.mockRejectedValue(responseError(409));
      await expect(client().update('a', { reply })).rejects.toThrow('kept changing');

      comments.index.mockRejectedValue(responseError(500));
      await expect(client().update('a', { reply })).rejects.toThrow(errors.ResponseError);
    });

    it('reports the reply limit and unknown comments', async () => {
      const full = { ...stored, replies: Array.from({ length: REPLIES_MAX }, () => reply) };
      comments.get.mockResolvedValueOnce(getResponse('a', full) as never);
      await expect(client().update('a', { reply })).rejects.toThrow(CommentsLimitError);
      expect(comments.index).not.toHaveBeenCalled();

      comments.get.mockRejectedValueOnce(responseError(404));
      expect(await client().update('missing', { resolved: true })).toBeUndefined();
    });
  });

  describe('list', () => {
    it('reads every comment, oldest first', async () => {
      comments.search.mockResolvedValue(searchResponse([{ _id: 'a', _source: stored }]) as never);

      expect(await client().list()).toEqual([{ ...stored, id: 'a' }]);
      expect(comments.search).toHaveBeenCalledWith(
        expect.objectContaining({ size: MAX_COMMENTS, sort: [{ createdAt: 'asc' }] })
      );
    });
  });

  describe('getSnapshot', () => {
    it('reads the screenshot stored under the comment id, if there is one', async () => {
      expect(await client().getSnapshot('a')).toEqual(snapshot);
      expect(snapshots.get).toHaveBeenCalledWith({ id: 'a' });

      snapshots.get.mockRejectedValueOnce(responseError(404));
      expect(await client().getSnapshot('none')).toBeUndefined();

      snapshots.get.mockRejectedValueOnce(responseError(500));
      await expect(client().getSnapshot('a')).rejects.toThrow(errors.ResponseError);
    });
  });
});
