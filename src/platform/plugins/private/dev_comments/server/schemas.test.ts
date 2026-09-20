/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { newCommentSchema } from './schemas';

const valid = {
  author: { username: 'capybara', displayName: 'Capybara' },
  text: 'Hello',
  resolved: false,
  replies: [
    {
      id: 'r1',
      author: { username: 'penguin', displayName: 'Penguin' },
      text: 'Hi',
      createdAt: '2026-01-01T00:00:00.000Z',
    },
  ],
  route: { pageKey: '/app/one', path: '/app/one?x=1#/y' },
  anchor: { locators: [{ type: 'id', value: 'x' }], relativeX: 0.5, relativeY: 0.5 },
  trail: [],
};

const withRoute = (path: string) => ({ ...valid, route: { ...valid.route, path } });

describe('newCommentSchema', () => {
  it('accepts a comment made within the deployment', () => {
    expect(() => newCommentSchema.validate(valid)).not.toThrow();
  });

  it.each([
    '//evil.example/app',
    '/\\evil.example',
    '/\t/evil.example/app',
    '/\r\n\\evil.example',
    'https://evil.example/',
    'app/one',
    '',
  ])('rejects the path %s', (path) => {
    expect(() => newCommentSchema.validate(withRoute(path))).toThrow();
  });

  it('takes a screenshot with its image only: a comment is kept for good, and one without could never be shown', () => {
    const snapshot = { mimeType: 'image/jpeg', width: 800, height: 600 };
    expect(() =>
      newCommentSchema.validate({ ...valid, snapshot: { ...snapshot, image: 'AAAA' } })
    ).not.toThrow();
    expect(() => newCommentSchema.validate({ ...valid, snapshot })).toThrow(/image/);
    expect(() =>
      newCommentSchema.validate({ ...valid, snapshot: { ...snapshot, image: '' } })
    ).toThrow(/image/);
  });

  it('rejects timestamps Elasticsearch would not store', () => {
    const reply = valid.replies[0];
    expect(() =>
      newCommentSchema.validate({ ...valid, replies: [{ ...reply, createdAt: 'yesterday' }] })
    ).toThrow(/ISO 8601/);
  });
});
