/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Bundle, BundleSpec, parseBundles } from './bundle';
import { Hashes } from './hashes';
import { parseDllManifest } from './dll_manifest';

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

  // randomly sort the hash entries to make sure that the cache key never changes based on the order of the hash cache
  const hashEntries = [
    ['/foo/bar/a', '123'] as const,
    ['/foo/bar/b', '456'] as const,
    ['/foo/bar/c', '789'] as const,
  ].sort(() => (Math.random() > 0.5 ? 1 : -1));

  const hashes = new Hashes(new Map(hashEntries));
  const dllManifest = parseDllManifest({
    name: 'manifest-name',
    content: {
      './some-foo.ts': {
        id: 1,
        buildMeta: {
          a: 'b',
        },
        unknownField: 'hi',
      },
    },
  });
  const dllRefKeys = ['./some-foo.ts'];

  expect(bundle.createCacheKey(['/foo/bar/a', '/foo/bar/c'], hashes, dllManifest, dllRefKeys))
    .toMatchInlineSnapshot(`
    Object {
      "checksums": Object {
        "/foo/bar/a": "123",
        "/foo/bar/c": "789",
      },
      "dllName": "manifest-name",
      "dllRefs": Object {
        "./some-foo.ts": "1:ku/53aRMuAA+4TmQeCWA/w:GtuPW9agF2yecW0xAIHtUQ",
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
        "pageLoadAssetSizeLimit": undefined,
        "publicDirNames": Array [
          "public",
        ],
        "sourceRoot": "/foo",
        "type": "plugin",
      },
    ]
  `);
});
