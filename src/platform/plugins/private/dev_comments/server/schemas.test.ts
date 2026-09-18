/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { QUOTA_ID, newCommentSchema, normalizeRoute, routeFromLegacy } from './schemas';

const timestamp = '2026-01-01T00:00:00.000Z';

const valid = {
  author: { username: 'capybara', displayName: 'Capybara' },
  text: 'Hello',
  resolved: false,
  replies: [
    {
      id: 'r1',
      author: { username: 'penguin', displayName: 'Penguin' },
      text: 'Hi',
      createdAt: timestamp,
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

  it('rejects timestamps Elasticsearch would not store and the reserved id', () => {
    const reply = valid.replies[0];
    expect(() =>
      newCommentSchema.validate({ ...valid, replies: [{ ...reply, createdAt: 'yesterday' }] })
    ).toThrow(/ISO 8601/);
    expect(() =>
      newCommentSchema.validate({ ...valid, replies: [{ ...reply, id: QUOTA_ID }] })
    ).toThrow(/reserved/);
  });
});

describe('first-version routes', () => {
  it('rewrites them from the URL, without the state that follows the hash route', () => {
    expect(
      routeFromLegacy({ pathname: '/app/one', url: 'http://host/kbn/app/one?x=1#/y?_g=(a:b)' })
    ).toEqual({ pageKey: '/app/one#/y', path: '/app/one?x=1#/y?_g=(a:b)' });
  });

  it('falls back to the pathname when the URL cannot be parsed', () => {
    expect(routeFromLegacy({ pathname: '/app/one', url: 'not a url' })).toEqual({
      pageKey: '/app/one',
      path: '/app/one',
    });
  });

  it('leaves current routes as they are', () => {
    expect(normalizeRoute(valid.route)).toBe(valid.route);
  });
});
