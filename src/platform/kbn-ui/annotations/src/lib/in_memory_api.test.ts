/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Annotation, NewAnnotation } from '../types';
import { createInMemoryAnnotationsApi } from './in_memory_api';

const input: NewAnnotation = {
  author: { username: 'dana', displayName: 'Dana' },
  text: 'Hello',
  resolved: false,
  replies: [],
  route: { pageKey: '/app/demo', path: '/app/demo' },
  anchor: { locators: [{ type: 'id', value: 'x' }], relativeX: 0.5, relativeY: 0.5 },
  trail: [],
};

const seeded: Annotation = {
  ...input,
  id: 'annotation-1',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  replies: [{ id: 'reply-1', author: input.author, text: 'Hi', createdAt: input.text }],
  snapshot: { mimeType: 'image/jpeg', width: 1, height: 1, image: 'AAAA' },
};

describe('createInMemoryAnnotationsApi', () => {
  it('never hands out an id that a seeded or imported comment already uses', async () => {
    const api = createInMemoryAnnotationsApi([seeded]);

    const created = await api.create(input);
    const withReply = await api.update(seeded.id, {
      reply: { author: input.author, text: 'Reply' },
    });

    expect(created.id).toBe('annotation-2');
    expect(new Set(withReply.replies.map(({ id }) => id)).size).toBe(2);
    expect((await api.list()).map(({ id }) => id)).toEqual(['annotation-1', 'annotation-2']);
  });

  it('exports without screenshots, in the current format', async () => {
    const api = createInMemoryAnnotationsApi([seeded]);

    const exported = await api.exportAll();

    expect(exported.version).toBe(2);
    expect(exported.annotations[0]).not.toHaveProperty('snapshot');
    expect(await api.getSnapshot(seeded.id)).toEqual(seeded.snapshot);
  });
});
