/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { v4 as uuidv4 } from 'uuid';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { Comment, CommentPatch, CommentSnapshot, NewComment } from '../common';
import { COMMENTS_INDEX, ensureCommentsIndex } from './ensure_index';
import { CommentsLimitError } from './limit_error';
import { MAX_COMMENTS, REPLIES_MAX } from './schemas';

type StoredComment = Omit<Comment, 'id'>;

const SNAPSHOT_IMAGE_FIELD = 'snapshot.image';
const CONFLICT_RETRIES = 5;

const fromStored = (id: string, stored: StoredComment): Comment => ({ id, ...stored });

const withoutImage = (comment: Comment): Comment =>
  comment.snapshot ? { ...comment, snapshot: { ...comment.snapshot, image: undefined } } : comment;

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
  private indexReady: Promise<void> | undefined;

  constructor(private readonly esClient: ElasticsearchClient, private readonly logger: Logger) {}

  /** Every comment, oldest first, without screenshot images (see `getSnapshot`). */
  public async list(): Promise<Comment[]> {
    await this.ensureIndex();
    const response = await this.esClient.search<StoredComment>({
      index: COMMENTS_INDEX,
      size: MAX_COMMENTS,
      sort: [{ createdAt: 'asc' }],
      _source_excludes: [SNAPSHOT_IMAGE_FIELD],
    });
    return response.hits.hits.flatMap((hit) =>
      hit._source ? [fromStored(hit._id ?? '', hit._source)] : []
    );
  }

  public async getSnapshot(id: string): Promise<CommentSnapshot | undefined> {
    await this.ensureIndex();
    const response = await this.esClient.get<Pick<StoredComment, 'snapshot'>>(
      { index: COMMENTS_INDEX, id, _source_includes: ['snapshot'] },
      { ignore: [404] }
    );
    return response._source?.snapshot;
  }

  public async create(input: NewComment): Promise<Comment> {
    await this.ensureIndex();
    // The cap keeps the store and the list bounded; it is checked, not enforced:
    // comments created at the same moment can take the count slightly past it.
    const { count } = await this.esClient.count({ index: COMMENTS_INDEX });
    if (count >= MAX_COMMENTS) {
      throw new CommentsLimitError(`At most ${MAX_COMMENTS} comments can be stored; ${count} are.`);
    }
    const now = new Date().toISOString();
    const id = uuidv4();
    const document: StoredComment = { ...input, createdAt: now, updatedAt: now };
    await this.esClient.index({ index: COMMENTS_INDEX, id, document, refresh: 'wait_for' });
    return withoutImage(fromStored(id, document));
  }

  /**
   * The updated comment, or undefined when there is none with that id. The
   * changed fields are written back only if the comment is still as it was
   * read, so that replies posted at the same time append rather than overwrite
   * each other and the reply limit holds.
   */
  public async update(id: string, patch: CommentPatch): Promise<Comment | undefined> {
    await this.ensureIndex();
    for (let attempt = 0; ; attempt++) {
      const current = await this.esClient.get<StoredComment>(
        { index: COMMENTS_INDEX, id, _source_excludes: [SNAPSHOT_IMAGE_FIELD] },
        { ignore: [404] }
      );
      if (!current.found || !current._source) {
        return undefined;
      }
      const changes = changesFor(current._source, patch, new Date().toISOString());
      const { statusCode } = await this.esClient.update<StoredComment, Partial<StoredComment>>(
        {
          index: COMMENTS_INDEX,
          id,
          doc: changes,
          if_seq_no: current._seq_no,
          if_primary_term: current._primary_term,
          refresh: 'wait_for',
        },
        { ignore: [404, 409], meta: true }
      );
      if (statusCode === 404) {
        return undefined;
      }
      if (statusCode !== 409) {
        return fromStored(id, { ...current._source, ...changes });
      }
      if (attempt === CONFLICT_RETRIES) {
        throw new Error(`Could not update comment ${id}: it kept changing.`);
      }
    }
  }

  private ensureIndex(): Promise<void> {
    this.indexReady ??= ensureCommentsIndex(this.esClient, this.logger).catch((error) => {
      this.indexReady = undefined;
      throw error;
    });
    return this.indexReady;
  }
}
