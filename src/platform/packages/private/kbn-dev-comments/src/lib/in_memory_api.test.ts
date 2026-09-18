/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createComment, createNewComment } from '../test_helpers';
import { createInMemoryCommentsApi } from './in_memory_api';

const input = createNewComment();

const seeded = createComment('comment-1', {
  replies: [
    { id: 'reply-1', author: input.author, text: 'Hi', createdAt: '2026-01-01T00:00:00.000Z' },
  ],
  snapshot: { mimeType: 'image/jpeg', width: 1, height: 1, image: 'AAAA' },
});

describe('createInMemoryCommentsApi', () => {
  it('never hands out an id that a seeded comment already uses', async () => {
    const api = createInMemoryCommentsApi([seeded]);

    const created = await api.create(input);
    const withReply = await api.update(seeded.id, {
      reply: { author: input.author, text: 'Reply' },
    });

    expect(created.id).toBe('comment-2');
    expect(new Set(withReply.replies.map(({ id }) => id)).size).toBe(2);
    expect((await api.list()).map(({ id }) => id)).toEqual(['comment-1', 'comment-2']);
  });

  it('lists without screenshot images, which are fetched on demand', async () => {
    const api = createInMemoryCommentsApi([seeded]);

    const [listed] = await api.list();

    expect(listed.snapshot).toEqual({ ...seeded.snapshot, image: undefined });
    expect(await api.getSnapshot(seeded.id)).toEqual(seeded.snapshot);
  });
});
