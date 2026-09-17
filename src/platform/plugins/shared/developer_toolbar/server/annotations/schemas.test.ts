/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  QUOTA_ID,
  importBodySchema,
  newAnnotationSchema,
  parseImport,
  routeFromLegacy,
} from './schemas';

const timestamp = '2026-01-01T00:00:00.000Z';

const valid = {
  author: { username: 'dana', displayName: 'Dana' },
  text: 'Hello',
  resolved: false,
  replies: [
    { id: 'r1', author: { username: 'sam', displayName: 'Sam' }, text: 'Hi', createdAt: timestamp },
  ],
  route: { pageKey: '/app/one', path: '/app/one?x=1#/y' },
  anchor: { locators: [{ type: 'id', value: 'x' }], relativeX: 0.5, relativeY: 0.5 },
  trail: [],
};

const withRoute = (path: string) => ({ ...valid, route: { ...valid.route, path } });

describe('newAnnotationSchema', () => {
  it('accepts a comment made within the deployment', () => {
    expect(() => newAnnotationSchema.validate(valid)).not.toThrow();
  });

  it.each(['//evil.example/app', '/\\evil.example', 'https://evil.example/', 'app/one', ''])(
    'rejects the path %s',
    (path) => {
      expect(() => newAnnotationSchema.validate(withRoute(path))).toThrow();
    }
  );

  it('rejects timestamps Elasticsearch would not store and the reserved id', () => {
    const reply = valid.replies[0];
    expect(() =>
      newAnnotationSchema.validate({ ...valid, replies: [{ ...reply, createdAt: 'yesterday' }] })
    ).toThrow(/ISO 8601/);
    expect(() =>
      newAnnotationSchema.validate({ ...valid, replies: [{ ...reply, id: QUOTA_ID }] })
    ).toThrow(/reserved/);
  });
});

describe('import', () => {
  it('accepts exports of both versions and nothing newer', () => {
    const body = { exportedAt: timestamp, annotations: [] };
    expect(() => importBodySchema.validate({ ...body, version: 1 })).not.toThrow();
    expect(() => importBodySchema.validate({ ...body, version: 2 })).not.toThrow();
    expect(() => importBodySchema.validate({ ...body, version: 3 })).toThrow();
  });

  it('rewrites first-version routes, drops unknown properties and skips what it cannot read', () => {
    const stored = { ...valid, id: 'a', createdAt: timestamp, updatedAt: timestamp };
    const { payload, skipped } = parseImport({
      version: 1,
      exportedAt: timestamp,
      annotations: [
        {
          ...stored,
          route: { pathname: '/app/one', url: 'http://host/kbn/app/one?x=1#/y?_g=(a:b)' },
          futureProperty: true,
        },
        { ...stored, id: 'b', route: { pathname: 'app/no-slash', url: 'http://host/app' } },
        { ...stored, id: QUOTA_ID },
        { text: 'not a comment' },
      ],
    });

    expect(skipped).toBe(3);
    expect(payload.version).toBe(2);
    expect(payload.annotations).toEqual([
      expect.objectContaining({
        id: 'a',
        route: { pageKey: '/app/one#/y', path: '/app/one?x=1#/y?_g=(a:b)' },
      }),
    ]);
    expect(payload.annotations[0]).not.toHaveProperty('futureProperty');
  });

  it('falls back to the pathname when a first-version URL cannot be parsed', () => {
    expect(routeFromLegacy({ pathname: '/app/one', url: 'not a url' })).toEqual({
      pageKey: '/app/one',
      path: '/app/one',
    });
  });
});
