/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Comment, CommentsApi } from '../types';

const withoutImage = (comment: Comment): Comment =>
  comment.snapshot ? { ...comment, snapshot: { ...comment.snapshot, image: undefined } } : comment;

const withoutSnapshot = ({ snapshot, ...comment }: Comment): Comment => comment;

/** In-memory `CommentsApi` for Storybook and tests; mirrors a host's semantics. */
export const createInMemoryCommentsApi = (initial: Comment[] = []): CommentsApi => {
  const comments = new Map(initial.map((comment) => [comment.id, comment]));
  let counter = 0;

  /** Sequential ids that skip anything seeded or imported under the same scheme. */
  const nextId = (prefix: string): string => {
    const taken = new Set([
      ...comments.keys(),
      ...Array.from(comments.values()).flatMap(({ replies }) => replies.map(({ id }) => id)),
    ]);
    let id: string;
    do {
      counter += 1;
      id = `${prefix}-${counter}`;
    } while (taken.has(id));
    return id;
  };

  const require = (id: string): Comment => {
    const comment = comments.get(id);
    if (!comment) {
      throw new Error(`Comment [${id}] not found`);
    }
    return comment;
  };

  return {
    list: async () =>
      Array.from(comments.values())
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
        .map(withoutImage),
    getSnapshot: async (id) => require(id).snapshot,
    create: async (input) => {
      const now = new Date().toISOString();
      const comment: Comment = {
        ...input,
        id: nextId('comment'),
        createdAt: now,
        updatedAt: now,
      };
      comments.set(comment.id, comment);
      return withoutImage(comment);
    },
    update: async (id, patch) => {
      const current = require(id);
      const now = new Date().toISOString();
      const updated: Comment = {
        ...current,
        resolved: patch.resolved ?? current.resolved,
        replies: patch.reply
          ? [...current.replies, { id: nextId('reply'), ...patch.reply, createdAt: now }]
          : current.replies,
        updatedAt: now,
      };
      comments.set(id, updated);
      return withoutImage(updated);
    },
    exportAll: async () => ({
      version: 2,
      exportedAt: new Date().toISOString(),
      comments: Array.from(comments.values()).map(withoutSnapshot),
    }),
    importAll: async (payload) => {
      payload.comments.forEach((comment) => comments.set(comment.id, comment));
      return { imported: payload.comments.length, skipped: 0, failed: 0 };
    },
  };
};
