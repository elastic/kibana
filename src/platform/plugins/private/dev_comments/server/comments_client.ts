/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { v4 as uuidv4 } from 'uuid';
import { errors } from '@elastic/elasticsearch';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { StorageIndexAdapter, type IStorageClient } from '@kbn/storage-adapter';
import type { Comment, CommentPatch, CommentSnapshot, NewComment, NewSnapshot } from '../common';
import { CommentsLimitError } from './limit_error';
import { MAX_COMMENTS, REPLIES_MAX } from './schemas';
import { COMMENTS_STORAGE, SNAPSHOTS_STORAGE } from './storage';

/** A comment as stored: without its id, its screenshot reduced to its size. */
type StoredComment = Omit<Comment, 'id'>;

export type CommentsStorage = IStorageClient<typeof COMMENTS_STORAGE, StoredComment>;
/** The screenshots, one document per comment under the comment's id. */
export type SnapshotsStorage = IStorageClient<typeof SNAPSHOTS_STORAGE, NewSnapshot>;

const CONFLICT_RETRIES = 5;

const fromStored = (id: string, stored: StoredComment): Comment => ({ id, ...stored });

const sizeOf = ({ mimeType, width, height }: NewSnapshot): CommentSnapshot => ({
  mimeType,
  width,
  height,
});

const hasStatus = (error: unknown, statusCode: number) =>
  error instanceof errors.ResponseError && error.statusCode === statusCode;

/** The storage reports a missing document as a 404 error from `get`; here it is undefined. */
const ifStored = async <T>(get: () => Promise<T>): Promise<T | undefined> => {
  try {
    return await get();
  } catch (error) {
    if (hasStatus(error, 404)) {
      return undefined;
    }
    throw error;
  }
};

/** The fields a patch changes on a stored comment; a reply gets its id and time here. */
const changesFor = (
  stored: StoredComment,
  patch: CommentPatch,
  now: string
): Partial<StoredComment> => {
  const { replies } = stored;
  if (patch.reply && replies.length >= REPLIES_MAX) {
    throw new CommentsLimitError(
      `A comment can have at most ${REPLIES_MAX} replies; this one has them.`
    );
  }
  return {
    updatedAt: now,
    ...(patch.resolved !== undefined ? { resolved: patch.resolved } : {}),
    ...(patch.reply
      ? { replies: [...replies, { id: uuidv4(), ...patch.reply, createdAt: now }] }
      : {}),
  };
};

export class CommentsClient {
  constructor(
    private readonly comments: CommentsStorage,
    private readonly snapshots: SnapshotsStorage,
    private readonly logger: Logger
  ) {}

  /** Every comment, oldest first, with the size of its screenshot but not the image (see `getSnapshot`). */
  public async list(): Promise<Comment[]> {
    const response = await this.comments.search({
      size: MAX_COMMENTS,
      track_total_hits: false,
      sort: [{ createdAt: 'asc' }],
    });
    return response.hits.hits.flatMap((hit) =>
      hit._source ? [fromStored(hit._id ?? '', hit._source)] : []
    );
  }

  public async getSnapshot(id: string): Promise<CommentSnapshot | undefined> {
    return (await ifStored(() => this.snapshots.get({ id })))?._source;
  }

  public async create(input: NewComment): Promise<Comment> {
    // The cap keeps the store and the list bounded; it is checked, not enforced:
    // comments created at the same moment can take the count slightly past it.
    const { hits } = await this.comments.search({ size: 0, track_total_hits: true });
    if (hits.total.value >= MAX_COMMENTS) {
      throw new CommentsLimitError(
        `At most ${MAX_COMMENTS} comments can be stored; ${hits.total.value} are.`
      );
    }
    const now = new Date().toISOString();
    const id = uuidv4();
    const { snapshot, ...rest } = input;
    const document: StoredComment = {
      ...rest,
      createdAt: now,
      updatedAt: now,
      ...(snapshot ? { snapshot: sizeOf(snapshot) } : {}),
    };
    // The image goes first, so that a comment is never seen without its screenshot.
    if (snapshot) {
      await this.snapshots.index({ id, document: snapshot });
    }
    try {
      await this.comments.index({ id, document });
    } catch (error) {
      // Nothing would ever read or remove the screenshot of a comment that was not
      // stored: it is taken out again, or at least left a trace of.
      if (snapshot) {
        await this.snapshots.delete({ id }).catch((failure) => {
          this.logger.warn(
            `Comment ${id} could not be stored, nor could its screenshot be removed again: ${failure}`
          );
        });
      }
      throw error;
    }
    return fromStored(id, document);
  }

  /**
   * The updated comment, or undefined when there is none with that id. The
   * comment is written back only if it is still as it was read, so that
   * replies posted at the same time append rather than overwrite each other
   * and the reply limit holds.
   */
  public async update(id: string, patch: CommentPatch): Promise<Comment | undefined> {
    for (let attempt = 0; ; attempt++) {
      const current = await ifStored(() => this.comments.get({ id, seq_no_primary_term: true }));
      if (!current?._source) {
        return undefined;
      }
      const document: StoredComment = {
        ...current._source,
        ...changesFor(current._source, patch, new Date().toISOString()),
      };
      try {
        await this.comments.index({
          id,
          document,
          if_seq_no: current._seq_no,
          if_primary_term: current._primary_term,
        });
        return fromStored(id, document);
      } catch (error) {
        if (!hasStatus(error, 409)) {
          throw error;
        }
        if (attempt === CONFLICT_RETRIES) {
          throw new Error(`Could not update comment ${id}: it kept changing.`);
        }
      }
    }
  }
}

export const createCommentsClient = (esClient: ElasticsearchClient, logger: Logger) =>
  new CommentsClient(
    new StorageIndexAdapter<typeof COMMENTS_STORAGE, StoredComment>(
      esClient,
      logger,
      COMMENTS_STORAGE
    ).getClient(),
    new StorageIndexAdapter<typeof SNAPSHOTS_STORAGE, NewSnapshot>(
      esClient,
      logger,
      SNAPSHOTS_STORAGE
    ).getClient(),
    logger
  );
