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
import type {
  Comment,
  CommentPatch,
  CommentRoute,
  CommentSnapshot,
  CommentsExport,
  CommentsImportResult,
  NewComment,
  TrailStep,
} from '../common';
import { COMMENTS_INDEX, ensureCommentsIndex } from './ensure_index';
import { CommentsLimitError } from './limit_error';
import { MAX_COMMENTS, QUOTA_ID, REPLIES_MAX, normalizeRoute, type LegacyRoute } from './schemas';

/** Documents written by earlier versions may lack a trail and carry a first-version route. */
type StoredComment = Omit<Comment, 'id' | 'trail' | 'route'> & {
  route: CommentRoute | LegacyRoute;
  trail?: TrailStep[];
};

interface QuotaDocument {
  /** Comments stored, plus room claimed for comments that are being written. */
  count: number;
  /** When room was last claimed; absent from documents written before it was recorded. */
  reservedAt?: string;
}

const SNAPSHOT_IMAGE_FIELD = 'snapshot.image';
const RETRY_ON_CONFLICT = 5;
/**
 * How long room claimed in the quota may stay unwritten: a write is either
 * indexed or has failed well within this (the request itself times out sooner).
 * The quota is only recounted once no claim can be in flight.
 */
export const RESERVATION_GRACE_MS = 60_000;
/** The quota document lives in the same index and is never a comment. */
const COMMENTS_QUERY = { bool: { must_not: { ids: { values: [QUOTA_ID] } } } };

/**
 * Applies a patch in Elasticsearch itself, so that concurrent replies to one
 * comment append rather than overwrite each other and the reply limit holds.
 * A no-op result means the limit was hit.
 */
const PATCH_SCRIPT = `
  if (params.reply != null && ctx._source.replies != null && ctx._source.replies.size() >= params.maxReplies) {
    ctx.op = 'noop';
  } else {
    if (params.containsKey('resolved')) {
      ctx._source.resolved = params.resolved;
    }
    if (params.reply != null) {
      if (ctx._source.replies == null) {
        ctx._source.replies = [];
      }
      ctx._source.replies.add(params.reply);
    }
    ctx._source.updatedAt = params.now;
  }
`;

/** Moves the comment count by `increment` unless that would exceed `max`; a no-op result means it would. Claims are timestamped. */
const QUOTA_SCRIPT = `
  if (params.increment > 0 && ctx._source.count + params.increment > params.max) {
    ctx.op = 'noop';
  } else {
    ctx._source.count = Math.max(0, ctx._source.count + params.increment);
    if (params.increment > 0) {
      ctx._source.reservedAt = params.now;
    }
  }
`;

const fromStored = (id: string, { route, trail, ...stored }: StoredComment): Comment => ({
  id,
  ...stored,
  route: normalizeRoute(route),
  trail: trail ?? [],
});

const withoutImage = (comment: Comment): Comment =>
  comment.snapshot ? { ...comment, snapshot: { ...comment.snapshot, image: undefined } } : comment;

const withoutSnapshot = ({ snapshot, ...comment }: Comment): Comment => comment;

export class CommentsClient {
  private indexReady: Promise<void> | undefined;

  constructor(private readonly esClient: ElasticsearchClient, private readonly logger: Logger) {}

  public list(): Promise<Comment[]> {
    return this.search({ excludeImage: true });
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
    await this.reserve(1);
    const now = new Date().toISOString();
    const id = uuidv4();
    const document: StoredComment = { ...input, createdAt: now, updatedAt: now };
    try {
      await this.esClient.index({ index: COMMENTS_INDEX, id, document, refresh: 'wait_for' });
    } catch (error) {
      // A timeout or a lost connection, for example while waiting for the refresh,
      // can hide a write that went through. The slot is given back only when the
      // document is not there; when even that cannot be told, it stays claimed
      // (a conservative quota is corrected when it next reports the store full).
      const stored = await this.isStored(id);
      if (stored === false) {
        await this.release(1);
      }
      if (!stored) {
        throw error;
      }
      this.logger.warn(`Comment ${id} was stored although indexing it failed: ${error}`);
    }
    return withoutImage(fromStored(id, document));
  }

  /** The updated comment, or undefined when there is none with that id. */
  public async update(id: string, patch: CommentPatch): Promise<Comment | undefined> {
    await this.ensureIndex();
    const now = new Date().toISOString();
    const response = await this.esClient.update<StoredComment, StoredComment, StoredComment>(
      {
        index: COMMENTS_INDEX,
        id,
        script: {
          lang: 'painless',
          source: PATCH_SCRIPT,
          params: {
            now,
            maxReplies: REPLIES_MAX,
            ...(patch.resolved !== undefined ? { resolved: patch.resolved } : {}),
            ...(patch.reply ? { reply: { id: uuidv4(), ...patch.reply, createdAt: now } } : {}),
          },
        },
        retry_on_conflict: RETRY_ON_CONFLICT,
        refresh: 'wait_for',
        _source: true,
        _source_excludes: [SNAPSHOT_IMAGE_FIELD],
      },
      { ignore: [404] }
    );
    if (response.result === 'noop') {
      throw new CommentsLimitError(
        `A comment can have at most ${REPLIES_MAX} replies; this one has them.`
      );
    }
    const updated = response.get?._source;
    return updated ? withoutImage(fromStored(id, updated)) : undefined;
  }

  /** Every comment without its screenshot, so that the export stays small enough to be imported again. */
  public async exportAll(): Promise<CommentsExport> {
    const comments = await this.search({ excludeImage: true });
    return {
      version: 2,
      exportedAt: new Date().toISOString(),
      comments: comments.map(withoutSnapshot),
    };
  }

  /**
   * Adds the exported comments, overwriting existing ones with the same id; the
   * whole import is refused when the new ones would not fit. An id that appears
   * more than once is written once, with its last version, so that the quota
   * accounts for each new comment exactly once.
   */
  public async importAll(payload: CommentsExport): Promise<CommentsImportResult> {
    await this.ensureIndex();
    const comments = Array.from(
      new Map(payload.comments.map((comment) => [comment.id, comment])).values()
    );
    if (comments.length === 0) {
      return { imported: 0, skipped: 0, failed: 0 };
    }
    const existing = await this.esClient.mget({
      index: COMMENTS_INDEX,
      ids: comments.map(({ id }) => id),
      _source: false,
    });
    const newIds = new Set(
      existing.docs.flatMap((doc) => ('found' in doc && doc.found ? [] : [doc._id]))
    );
    await this.reserve(newIds.size);

    const response = await this.esClient.bulk<StoredComment>({
      index: COMMENTS_INDEX,
      refresh: 'wait_for',
      operations: comments.flatMap(({ id, ...document }) => [{ index: { _id: id } }, document]),
    });
    const failures = response.items.flatMap(({ index }) =>
      index?.error ? [{ id: index._id, reason: index.error.reason ?? index.error.type }] : []
    );
    if (failures.length > 0) {
      await this.release(failures.filter(({ id }) => id && newIds.has(id)).length);
      this.logger.warn(
        `Failed to import ${failures.length} comments: ${failures
          .map(({ id, reason }) => `[${id}] ${reason}`)
          .join('; ')}`
      );
    }
    return { imported: comments.length - failures.length, skipped: 0, failed: failures.length };
  }

  private async search({ excludeImage }: { excludeImage: boolean }): Promise<Comment[]> {
    await this.ensureIndex();
    const response = await this.esClient.search<StoredComment>({
      index: COMMENTS_INDEX,
      size: MAX_COMMENTS,
      query: COMMENTS_QUERY,
      sort: [{ createdAt: 'asc' }],
      ...(excludeImage ? { _source_excludes: [SNAPSHOT_IMAGE_FIELD] } : {}),
    });
    return response.hits.hits.flatMap((hit) =>
      hit._source ? [fromStored(hit._id ?? '', hit._source)] : []
    );
  }

  /**
   * Claims room for `count` more comments in the quota document, atomically, so
   * concurrent writers cannot take the store past `MAX_COMMENTS` together.
   * The document mirrors the index: it is created from the comments already
   * stored when missing, and when it says the store is full the comments are
   * recounted first, in case some were removed by hand.
   */
  private async reserve(count: number): Promise<void> {
    if (count === 0) {
      return;
    }
    for (let attempt = 0; attempt <= RETRY_ON_CONFLICT; attempt++) {
      const result = await this.adjustQuota(count);
      if (result === 'applied') {
        return;
      }
      if (result === 'missing') {
        await this.bootstrapQuota();
        continue;
      }
      if (await this.reconcileQuota(count)) {
        return;
      }
    }
    throw new Error(`Could not claim room for ${count} comments: the quota kept changing.`);
  }

  /** Whether a comment with that id is in the index; undefined when Elasticsearch could not say. */
  private async isStored(id: string): Promise<boolean | undefined> {
    try {
      return await this.esClient.exists({ index: COMMENTS_INDEX, id });
    } catch (error) {
      this.logger.warn(`Could not tell whether comment ${id} was stored: ${error}`);
      return undefined;
    }
  }

  /** Gives back room claimed for comments that were not written after all; a failure here only makes the quota conservative. */
  private async release(count: number): Promise<void> {
    if (count === 0) {
      return;
    }
    try {
      // Nothing to give back when the document is missing: it will be recreated from the index.
      await this.adjustQuota(-count);
    } catch (error) {
      this.logger.warn(`Failed to release ${count} comment slots: ${error}`);
    }
  }

  /** Moves the count by `increment`; `full` when that would exceed the maximum, `missing` when there is no quota document. */
  private async adjustQuota(increment: number): Promise<'applied' | 'full' | 'missing'> {
    const { body, statusCode } = await this.esClient.update<
      QuotaDocument,
      QuotaDocument,
      QuotaDocument
    >(
      {
        index: COMMENTS_INDEX,
        id: QUOTA_ID,
        script: {
          lang: 'painless',
          source: QUOTA_SCRIPT,
          params: { increment, max: MAX_COMMENTS, now: new Date().toISOString() },
        },
        retry_on_conflict: RETRY_ON_CONFLICT,
      },
      { ignore: [404], meta: true }
    );
    if (statusCode === 404) {
      return 'missing';
    }
    return body.result === 'noop' ? 'full' : 'applied';
  }

  /**
   * Creates the quota document from the comments in the index, which predates
   * the document or lost it. Losing the race to another instance is fine, as
   * theirs counts the same comments.
   */
  private async bootstrapQuota(): Promise<void> {
    const { count } = await this.esClient.count({
      index: COMMENTS_INDEX,
      query: COMMENTS_QUERY,
    });
    await this.esClient.index<QuotaDocument>(
      { index: COMMENTS_INDEX, id: QUOTA_ID, document: { count }, op_type: 'create' },
      { ignore: [409] }
    );
  }

  /**
   * Replaces a quota document that says the store is full with the actual
   * number of comments plus `count`, provided nobody changed the document in
   * the meantime, so that two writers cannot both claim the same room. False
   * when another writer got there first; throws when the store really is full.
   *
   * The comments are only counted once every claim is old enough to have been
   * written or given up: a comment claimed moments ago may not be indexed yet,
   * and a count taken then would hand its room out again.
   */
  private async reconcileQuota(count: number): Promise<boolean> {
    const [{ count: stored }, quota] = await Promise.all([
      this.esClient.count({ index: COMMENTS_INDEX, query: COMMENTS_QUERY }),
      this.esClient.get<QuotaDocument>({ index: COMMENTS_INDEX, id: QUOTA_ID }, { ignore: [404] }),
    ]);
    if (stored + count > MAX_COMMENTS) {
      throw new CommentsLimitError(
        `At most ${MAX_COMMENTS} comments can be stored; ${stored} are, and ${count} more would be added.`
      );
    }
    if (!quota.found) {
      return false;
    }
    const now = Date.now();
    const reservedAt = Date.parse(quota._source?.reservedAt ?? '') || 0;
    if (now - reservedAt < RESERVATION_GRACE_MS) {
      throw new CommentsLimitError(
        `At most ${MAX_COMMENTS} comments can be stored, and comments are still being written; try again in a minute.`
      );
    }
    const { statusCode } = await this.esClient.index<QuotaDocument>(
      {
        index: COMMENTS_INDEX,
        id: QUOTA_ID,
        document: { count: stored + count, reservedAt: new Date(now).toISOString() },
        if_seq_no: quota._seq_no,
        if_primary_term: quota._primary_term,
      },
      { ignore: [409], meta: true }
    );
    return statusCode !== 409;
  }

  private ensureIndex(): Promise<void> {
    this.indexReady ??= ensureCommentsIndex(this.esClient, this.logger).catch((error) => {
      this.indexReady = undefined;
      throw error;
    });
    return this.indexReady;
  }
}
