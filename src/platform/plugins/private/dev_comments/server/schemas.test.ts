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
    // Dot segments that climb out of the base path the host puts before the path.
    '/../outside',
    '/app/one/../../../outside',
    '/app/%2e%2e/%2E%2E/outside',
    '/\\..\\outside',
  ])('rejects the path %s', (path) => {
    expect(() => newCommentSchema.validate(withRoute(path))).toThrow();
  });

  it('accepts dot segments that stay within the deployment', () => {
    expect(() => newCommentSchema.validate(withRoute('/app/one/../two'))).not.toThrow();
  });

  describe('screenshots', () => {
    const snapshot = { mimeType: 'image/jpeg', width: 800, height: 600 };
    const withImage = (image?: string) => ({ ...valid, snapshot: { ...snapshot, image } });
    // A 2x2 JPEG; `/9j/` is the base64 of the start-of-image marker every JPEG begins with.
    const jpeg = '/9j/4AAQSkZJRgABAQEASABIAAD/2Q==';

    it('takes one with a JPEG image only: a comment is kept for good, and one without a showable image could never be shown', () => {
      expect(() => newCommentSchema.validate(withImage(jpeg))).not.toThrow();

      expect(() => newCommentSchema.validate({ ...valid, snapshot })).toThrow(/image/);
      expect(() => newCommentSchema.validate(withImage(''))).toThrow(/image/);
      expect(() => newCommentSchema.validate(withImage('!!!!'))).toThrow(/base64/);
      expect(() => newCommentSchema.validate(withImage(`${jpeg}A`))).toThrow(/base64/);
      expect(() => newCommentSchema.validate(withImage('AAAA'))).toThrow(/JPEG/);
      expect(() => newCommentSchema.validate(withImage(`${jpeg}${'A'.repeat(400_000)}`))).toThrow(
        /length/
      );
    });
  });

  it('rejects timestamps Elasticsearch would not store', () => {
    const reply = valid.replies[0];
    expect(() =>
      newCommentSchema.validate({ ...valid, replies: [{ ...reply, createdAt: 'yesterday' }] })
    ).toThrow(/ISO 8601/);
  });
});
