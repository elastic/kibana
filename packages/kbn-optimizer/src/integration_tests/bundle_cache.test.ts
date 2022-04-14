/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Path from 'path';

import cpy from 'cpy';
import del from 'del';
import { createAbsolutePathSerializer, createStripAnsiSerializer } from '@kbn/dev-utils';

import { OptimizerConfig } from '../optimizer/optimizer_config';
import { allValuesFrom, Bundle, Hashes, ParsedDllManifest } from '../common';
import { getBundleCacheEvent$ } from '../optimizer/bundle_cache';

const TMP_DIR = Path.resolve(__dirname, '../__fixtures__/__tmp__');
const MOCK_REPO_SRC = Path.resolve(__dirname, '../__fixtures__/mock_repo');
const MOCK_REPO_DIR = Path.resolve(TMP_DIR, 'mock_repo');

jest.mock('../common/dll_manifest', () => ({
  parseDllManifest: jest.fn(),
}));

const EMPTY_DLL_MANIFEST: ParsedDllManifest = {
  name: 'foo',
  content: {},
};
jest.requireMock('../common/dll_manifest').parseDllManifest.mockReturnValue(EMPTY_DLL_MANIFEST);

expect.addSnapshotSerializer({
  print: () => '<Bundle>',
  test: (v) => v instanceof Bundle,
});
expect.addSnapshotSerializer(createStripAnsiSerializer());
expect.addSnapshotSerializer(createAbsolutePathSerializer(MOCK_REPO_DIR));

beforeEach(async () => {
  await del(TMP_DIR);
  await cpy('**/*', MOCK_REPO_DIR, {
    cwd: MOCK_REPO_SRC,
    parents: true,
    deep: true,
  });
});

afterEach(async () => {
  await del(TMP_DIR);
});

it('emits "bundle cached" event when everything is updated', async () => {
  const config = OptimizerConfig.create({
    repoRoot: MOCK_REPO_DIR,
    pluginScanDirs: [],
    pluginPaths: [Path.resolve(MOCK_REPO_DIR, 'plugins/foo')],
    maxWorkerCount: 1,
  });
  const [bundle] = config.bundles;

  const optimizerCacheKey = 'optimizerCacheKey';
  const referencedPaths = [
    Path.resolve(MOCK_REPO_DIR, 'plugins/foo/public/ext.ts'),
    Path.resolve(MOCK_REPO_DIR, 'plugins/foo/public/index.ts'),
    Path.resolve(MOCK_REPO_DIR, 'plugins/foo/public/lib.ts'),
  ];
  const hashes = await Hashes.ofFiles(referencedPaths);
  const cacheKey = bundle.createCacheKey(referencedPaths, hashes, EMPTY_DLL_MANIFEST, []);

  bundle.cache.set({
    cacheKey,
    optimizerCacheKey,
    referencedPaths,
    moduleCount: referencedPaths.length,
    bundleRefExportIds: [],
    dllRefKeys: [],
  });

  const cacheEvents = await allValuesFrom(getBundleCacheEvent$(config, optimizerCacheKey));

  expect(cacheEvents).toMatchInlineSnapshot(`
    Array [
      Object {
        "bundle": <Bundle>,
        "type": "bundle cached",
      },
    ]
  `);
});

it('emits "bundle not cached" event when cacheKey is up to date but caching is disabled in config', async () => {
  const config = OptimizerConfig.create({
    repoRoot: MOCK_REPO_DIR,
    pluginScanDirs: [],
    pluginPaths: [Path.resolve(MOCK_REPO_DIR, 'plugins/foo')],
    maxWorkerCount: 1,
    cache: false,
  });
  const [bundle] = config.bundles;

  const optimizerCacheKey = 'optimizerCacheKey';
  const referencedPaths = [
    Path.resolve(MOCK_REPO_DIR, 'plugins/foo/public/ext.ts'),
    Path.resolve(MOCK_REPO_DIR, 'plugins/foo/public/index.ts'),
    Path.resolve(MOCK_REPO_DIR, 'plugins/foo/public/lib.ts'),
  ];
  const hashes = await Hashes.ofFiles(referencedPaths);
  const cacheKey = bundle.createCacheKey(referencedPaths, hashes, EMPTY_DLL_MANIFEST, []);

  bundle.cache.set({
    cacheKey,
    optimizerCacheKey,
    referencedPaths,
    moduleCount: referencedPaths.length,
    bundleRefExportIds: [],
    dllRefKeys: [],
  });

  const cacheEvents = await allValuesFrom(getBundleCacheEvent$(config, optimizerCacheKey));

  expect(cacheEvents).toMatchInlineSnapshot(`
    Array [
      Object {
        "bundle": <Bundle>,
        "reason": "cache disabled",
        "type": "bundle not cached",
      },
    ]
  `);
});

it('emits "bundle not cached" event when optimizerCacheKey is missing', async () => {
  const config = OptimizerConfig.create({
    repoRoot: MOCK_REPO_DIR,
    pluginScanDirs: [],
    pluginPaths: [Path.resolve(MOCK_REPO_DIR, 'plugins/foo')],
    maxWorkerCount: 1,
  });
  const [bundle] = config.bundles;

  const optimizerCacheKey = 'optimizerCacheKey';
  const referencedPaths = [
    Path.resolve(MOCK_REPO_DIR, 'plugins/foo/public/ext.ts'),
    Path.resolve(MOCK_REPO_DIR, 'plugins/foo/public/index.ts'),
    Path.resolve(MOCK_REPO_DIR, 'plugins/foo/public/lib.ts'),
  ];
  const hashes = await Hashes.ofFiles(referencedPaths);
  const cacheKey = bundle.createCacheKey(referencedPaths, hashes, EMPTY_DLL_MANIFEST, []);

  bundle.cache.set({
    cacheKey,
    optimizerCacheKey: undefined,
    referencedPaths,
    moduleCount: referencedPaths.length,
    bundleRefExportIds: [],
    dllRefKeys: [],
  });

  const cacheEvents = await allValuesFrom(getBundleCacheEvent$(config, optimizerCacheKey));

  expect(cacheEvents).toMatchInlineSnapshot(`
    Array [
      Object {
        "bundle": <Bundle>,
        "reason": "missing optimizer cache key",
        "type": "bundle not cached",
      },
    ]
  `);
});

it('emits "bundle not cached" event when optimizerCacheKey is outdated, includes diff', async () => {
  const config = OptimizerConfig.create({
    repoRoot: MOCK_REPO_DIR,
    pluginScanDirs: [],
    pluginPaths: [Path.resolve(MOCK_REPO_DIR, 'plugins/foo')],
    maxWorkerCount: 1,
  });
  const [bundle] = config.bundles;

  const optimizerCacheKey = 'optimizerCacheKey';
  const referencedPaths = [
    Path.resolve(MOCK_REPO_DIR, 'plugins/foo/public/ext.ts'),
    Path.resolve(MOCK_REPO_DIR, 'plugins/foo/public/index.ts'),
    Path.resolve(MOCK_REPO_DIR, 'plugins/foo/public/lib.ts'),
  ];
  const hashes = await Hashes.ofFiles(referencedPaths);
  const cacheKey = bundle.createCacheKey(referencedPaths, hashes, EMPTY_DLL_MANIFEST, []);

  bundle.cache.set({
    cacheKey,
    optimizerCacheKey: 'old',
    referencedPaths,
    moduleCount: referencedPaths.length,
    bundleRefExportIds: [],
    dllRefKeys: [],
  });

  const cacheEvents = await allValuesFrom(getBundleCacheEvent$(config, optimizerCacheKey));

  expect(cacheEvents).toMatchInlineSnapshot(`
    Array [
      Object {
        "bundle": <Bundle>,
        "diff": "- Expected
    + Received

    - \\"old\\"
    + \\"optimizerCacheKey\\"",
        "reason": "optimizer cache key mismatch",
        "type": "bundle not cached",
      },
    ]
  `);
});

it('emits "bundle not cached" event when bundleRefExportIds is outdated, includes diff', async () => {
  const config = OptimizerConfig.create({
    repoRoot: MOCK_REPO_DIR,
    pluginScanDirs: [],
    pluginPaths: [Path.resolve(MOCK_REPO_DIR, 'plugins/foo')],
    maxWorkerCount: 1,
  });
  const [bundle] = config.bundles;

  const optimizerCacheKey = 'optimizerCacheKey';
  const referencedPaths = [
    Path.resolve(MOCK_REPO_DIR, 'plugins/foo/public/ext.ts'),
    Path.resolve(MOCK_REPO_DIR, 'plugins/foo/public/index.ts'),
    Path.resolve(MOCK_REPO_DIR, 'plugins/foo/public/lib.ts'),
  ];
  const hashes = await Hashes.ofFiles(referencedPaths);
  const cacheKey = bundle.createCacheKey(referencedPaths, hashes, EMPTY_DLL_MANIFEST, []);

  bundle.cache.set({
    cacheKey,
    optimizerCacheKey,
    referencedPaths,
    moduleCount: referencedPaths.length,
    bundleRefExportIds: ['plugin/bar/public'],
    dllRefKeys: [],
  });

  const cacheEvents = await allValuesFrom(getBundleCacheEvent$(config, optimizerCacheKey));

  expect(cacheEvents).toMatchInlineSnapshot(`
    Array [
      Object {
        "bundle": <Bundle>,
        "diff": "- Expected
    + Received

      [
    +   \\"plugin/bar/public\\"
      ]",
        "reason": "bundle references outdated",
        "type": "bundle not cached",
      },
    ]
  `);
});

it('emits "bundle not cached" event when cacheKey is missing', async () => {
  const config = OptimizerConfig.create({
    repoRoot: MOCK_REPO_DIR,
    pluginScanDirs: [],
    pluginPaths: [Path.resolve(MOCK_REPO_DIR, 'plugins/foo')],
    maxWorkerCount: 1,
  });
  const [bundle] = config.bundles;

  const optimizerCacheKey = 'optimizerCacheKey';
  const referencedPaths = [
    Path.resolve(MOCK_REPO_DIR, 'plugins/foo/public/ext.ts'),
    Path.resolve(MOCK_REPO_DIR, 'plugins/foo/public/index.ts'),
    Path.resolve(MOCK_REPO_DIR, 'plugins/foo/public/lib.ts'),
  ];

  bundle.cache.set({
    cacheKey: undefined,
    optimizerCacheKey,
    referencedPaths,
    moduleCount: referencedPaths.length,
    bundleRefExportIds: [],
    dllRefKeys: [],
  });

  const cacheEvents = await allValuesFrom(getBundleCacheEvent$(config, optimizerCacheKey));

  expect(cacheEvents).toMatchInlineSnapshot(`
    Array [
      Object {
        "bundle": <Bundle>,
        "reason": "missing cache key",
        "type": "bundle not cached",
      },
    ]
  `);
});

it('emits "bundle not cached" event when cacheKey is outdated', async () => {
  const config = OptimizerConfig.create({
    repoRoot: MOCK_REPO_DIR,
    pluginScanDirs: [],
    pluginPaths: [Path.resolve(MOCK_REPO_DIR, 'plugins/foo')],
    maxWorkerCount: 1,
  });
  const [bundle] = config.bundles;

  const optimizerCacheKey = 'optimizerCacheKey';
  const referencedPaths = [
    Path.resolve(MOCK_REPO_DIR, 'plugins/foo/public/ext.ts'),
    Path.resolve(MOCK_REPO_DIR, 'plugins/foo/public/index.ts'),
    Path.resolve(MOCK_REPO_DIR, 'plugins/foo/public/lib.ts'),
  ];

  bundle.cache.set({
    cacheKey: 'old',
    optimizerCacheKey,
    referencedPaths,
    moduleCount: referencedPaths.length,
    bundleRefExportIds: [],
    dllRefKeys: [],
  });

  jest.spyOn(bundle, 'createCacheKey').mockImplementation(() => 'new');

  const cacheEvents = await allValuesFrom(getBundleCacheEvent$(config, optimizerCacheKey));

  expect(cacheEvents).toMatchInlineSnapshot(`
    Array [
      Object {
        "bundle": <Bundle>,
        "diff": "- Expected
    + Received

    - \\"old\\"
    + \\"new\\"",
        "reason": "cache key mismatch",
        "type": "bundle not cached",
      },
    ]
  `);
});

it('emits "dll references missing" when cacheKey has no dllRefs', async () => {
  const config = OptimizerConfig.create({
    repoRoot: MOCK_REPO_DIR,
    pluginScanDirs: [],
    pluginPaths: [Path.resolve(MOCK_REPO_DIR, 'plugins/foo')],
    maxWorkerCount: 1,
  });
  const [bundle] = config.bundles;

  const optimizerCacheKey = 'optimizerCacheKey';
  const referencedPaths = [
    Path.resolve(MOCK_REPO_DIR, 'plugins/foo/public/ext.ts'),
    Path.resolve(MOCK_REPO_DIR, 'plugins/foo/public/index.ts'),
    Path.resolve(MOCK_REPO_DIR, 'plugins/foo/public/lib.ts'),
  ];

  bundle.cache.set({
    cacheKey: 'correct',
    optimizerCacheKey,
    referencedPaths,
    moduleCount: referencedPaths.length,
    bundleRefExportIds: [],
  });

  jest.spyOn(bundle, 'createCacheKey').mockImplementation(() => 'correct');

  const cacheEvents = await allValuesFrom(getBundleCacheEvent$(config, optimizerCacheKey));

  expect(cacheEvents).toMatchInlineSnapshot(`
    Array [
      Object {
        "bundle": <Bundle>,
        "reason": "dll references missing",
        "type": "bundle not cached",
      },
    ]
  `);
});
