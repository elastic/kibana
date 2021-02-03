/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { Bundle, BundleSpec, parseBundles } from './bundle';

jest.mock('fs');

const SPEC: BundleSpec = {
  contextDir: '/foo/bar',
  publicDirNames: ['public'],
  id: 'bar',
  outputDir: '/foo/bar/target',
  sourceRoot: '/foo',
  type: 'plugin',
};

it('creates cache keys', () => {
  const bundle = new Bundle(SPEC);
  expect(
    bundle.createCacheKey(
      ['/foo/bar/a', '/foo/bar/c'],
      new Map([
        ['/foo/bar/a', 123],
        ['/foo/bar/b', 456],
        ['/foo/bar/c', 789],
      ])
    )
  ).toMatchInlineSnapshot(`
    Object {
      "mtimes": Object {
        "/foo/bar/a": 123,
        "/foo/bar/c": 789,
      },
      "spec": Object {
        "banner": undefined,
        "contextDir": "/foo/bar",
        "id": "bar",
        "manifestPath": undefined,
        "outputDir": "/foo/bar/target",
        "publicDirNames": Array [
          "public",
        ],
        "sourceRoot": "/foo",
        "type": "plugin",
      },
    }
  `);
});

it('provides serializable versions of itself', () => {
  const bundle = new Bundle(SPEC);
  expect(bundle.toSpec()).toEqual(SPEC);
});

it('provides the module count from the cache', () => {
  const bundle = new Bundle(SPEC);
  expect(bundle.cache.getModuleCount()).toBe(undefined);
  bundle.cache.set({ moduleCount: 123 });
  expect(bundle.cache.getModuleCount()).toBe(123);
});

it('parses bundles from JSON specs', () => {
  const bundles = parseBundles(JSON.stringify([SPEC]));

  expect(bundles).toMatchInlineSnapshot(`
    Array [
      Bundle {
        "banner": undefined,
        "cache": BundleCache {
          "path": "/foo/bar/target/.kbn-optimizer-cache",
          "state": undefined,
        },
        "contextDir": "/foo/bar",
        "id": "bar",
        "manifestPath": undefined,
        "outputDir": "/foo/bar/target",
        "publicDirNames": Array [
          "public",
        ],
        "sourceRoot": "/foo",
        "type": "plugin",
      },
    ]
  `);
});
