/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Path from 'path';
import Fs from 'fs';
import Zlib from 'zlib';
import { inspect } from 'util';
import prettier from 'prettier';

import cpy from 'cpy';
import del from 'del';
import { tap, filter } from 'rxjs/operators';
import { REPO_ROOT } from '@kbn/utils';
import { ToolingLog } from '@kbn/tooling-log';
import { createReplaceSerializer } from '@kbn/jest-serializers';
import { runOptimizer, OptimizerConfig, OptimizerUpdate, logOptimizerState } from '..';

import { allValuesFrom } from '../common';

const TMP_DIR = Path.resolve(__dirname, '../__fixtures__/__tmp__');
const MOCK_REPO_SRC = Path.resolve(__dirname, '../__fixtures__/mock_repo');
const MOCK_REPO_DIR = Path.resolve(TMP_DIR, 'mock_repo');

expect.addSnapshotSerializer({
  serialize: (value: string) => value.split(REPO_ROOT).join('<absolute path>').replace(/\\/g, '/'),
  test: (value: any) => typeof value === 'string' && value.includes(REPO_ROOT),
});

expect.addSnapshotSerializer(createReplaceSerializer(/\w+-fastbuild/, '<platform>-fastbuild'));

const log = new ToolingLog({
  level: 'error',
  writeTo: {
    write(chunk) {
      if (chunk.endsWith('\n')) {
        chunk = chunk.slice(0, -1);
      }
      // eslint-disable-next-line no-console
      console.error(chunk);
    },
  },
});

beforeAll(async () => {
  await del(TMP_DIR);
  await cpy('**/*', MOCK_REPO_DIR, {
    cwd: MOCK_REPO_SRC,
    parents: true,
    deep: true,
  });
});

afterAll(async () => {
  await del(TMP_DIR);
});

it('builds expected bundles, saves bundle counts to metadata', async () => {
  const config = OptimizerConfig.create({
    repoRoot: MOCK_REPO_DIR,
    pluginScanDirs: [Path.resolve(MOCK_REPO_DIR, 'plugins'), Path.resolve(MOCK_REPO_DIR, 'x-pack')],
    maxWorkerCount: 1,
    dist: false,
  });

  expect(config).toMatchSnapshot('OptimizerConfig');

  const msgs = await allValuesFrom(
    runOptimizer(config).pipe(
      logOptimizerState(log, config),
      filter((x) => x.event?.type !== 'worker stdio')
    )
  );

  const assert = (statement: string, truth: boolean, altStates?: OptimizerUpdate[]) => {
    if (!truth) {
      throw new Error(
        `expected optimizer to ${statement}, states: ${inspect(altStates || msgs, {
          colors: true,
          depth: Infinity,
        })}`
      );
    }
  };

  const initializingStates = msgs.filter((msg) => msg.state.phase === 'initializing');
  assert('produce at least one initializing event', initializingStates.length >= 1);

  const bundleCacheStates = msgs.filter(
    (msg) =>
      (msg.event?.type === 'bundle cached' || msg.event?.type === 'bundle not cached') &&
      msg.state.phase === 'initializing'
  );
  assert('produce three bundle cache events while initializing', bundleCacheStates.length === 3);

  const initializedStates = msgs.filter((msg) => msg.state.phase === 'initialized');
  assert('produce at least one initialized event', initializedStates.length >= 1);

  const workerStarted = msgs.filter((msg) => msg.event?.type === 'worker started');
  assert('produce one worker started event', workerStarted.length === 1);

  const runningStates = msgs.filter((msg) => msg.state.phase === 'running');
  assert(
    'produce three to five "running" states',
    runningStates.length >= 3 && runningStates.length <= 5
  );

  const bundleNotCachedEvents = msgs.filter((msg) => msg.event?.type === 'bundle not cached');
  assert('produce three "bundle not cached" events', bundleNotCachedEvents.length === 3);

  const successStates = msgs.filter((msg) => msg.state.phase === 'success');
  assert(
    'produce one to three "compiler success" states',
    successStates.length >= 1 && successStates.length <= 3
  );

  const otherStates = msgs.filter(
    (msg) =>
      msg.state.phase !== 'initializing' &&
      msg.state.phase !== 'success' &&
      msg.state.phase !== 'running' &&
      msg.state.phase !== 'initialized' &&
      msg.event?.type !== 'bundle not cached'
  );
  assert('produce zero unexpected states', otherStates.length === 0, otherStates);

  const foo = config.bundles.find((b) => b.id === 'foo')!;
  expect(foo).toBeTruthy();
  foo.cache.refresh();
  expect(foo.cache.getModuleCount()).toBe(6);
  expect(foo.cache.getReferencedPaths()).toMatchInlineSnapshot(`
    Array [
      <absolute path>/packages/kbn-optimizer/src/__fixtures__/__tmp__/mock_repo/bazel-out/<platform>-fastbuild/bin/packages/kbn-ui-shared-deps-npm/target_node/public_path_module_creator.js,
      <absolute path>/packages/kbn-optimizer/src/__fixtures__/__tmp__/mock_repo/plugins/foo/kibana.json,
      <absolute path>/packages/kbn-optimizer/src/__fixtures__/__tmp__/mock_repo/plugins/foo/public/async_import.ts,
      <absolute path>/packages/kbn-optimizer/src/__fixtures__/__tmp__/mock_repo/plugins/foo/public/ext.ts,
      <absolute path>/packages/kbn-optimizer/src/__fixtures__/__tmp__/mock_repo/plugins/foo/public/index.ts,
      <absolute path>/packages/kbn-optimizer/src/__fixtures__/__tmp__/mock_repo/plugins/foo/public/lib.ts,
      <absolute path>/packages/kbn-optimizer/src/worker/entry_point_creator.ts,
    ]
  `);

  const bar = config.bundles.find((b) => b.id === 'bar')!;
  expect(bar).toBeTruthy();
  bar.cache.refresh();
  expect(bar.cache.getModuleCount()).toBe(
    // code + styles + style/css-loader runtimes + public path updater
    16
  );

  expect(bar.cache.getReferencedPaths()).toMatchInlineSnapshot(`
    Array [
      <absolute path>/node_modules/@kbn/optimizer/postcss.config.js,
      <absolute path>/node_modules/css-loader/package.json,
      <absolute path>/node_modules/style-loader/package.json,
      <absolute path>/packages/kbn-optimizer/src/__fixtures__/__tmp__/mock_repo/bazel-out/<platform>-fastbuild/bin/packages/kbn-ui-shared-deps-npm/target_node/public_path_module_creator.js,
      <absolute path>/packages/kbn-optimizer/src/__fixtures__/__tmp__/mock_repo/plugins/bar/kibana.json,
      <absolute path>/packages/kbn-optimizer/src/__fixtures__/__tmp__/mock_repo/plugins/bar/public/index.scss,
      <absolute path>/packages/kbn-optimizer/src/__fixtures__/__tmp__/mock_repo/plugins/bar/public/index.ts,
      <absolute path>/packages/kbn-optimizer/src/__fixtures__/__tmp__/mock_repo/plugins/bar/public/legacy/_other_styles.scss,
      <absolute path>/packages/kbn-optimizer/src/__fixtures__/__tmp__/mock_repo/plugins/bar/public/legacy/styles.scss,
      <absolute path>/packages/kbn-optimizer/src/__fixtures__/__tmp__/mock_repo/plugins/bar/public/lib.ts,
      <absolute path>/packages/kbn-optimizer/src/__fixtures__/__tmp__/mock_repo/src/core/public/core_app/styles/_globals_v8dark.scss,
      <absolute path>/packages/kbn-optimizer/src/__fixtures__/__tmp__/mock_repo/src/core/public/core_app/styles/_globals_v8light.scss,
      <absolute path>/packages/kbn-optimizer/src/worker/entry_point_creator.ts,
    ]
  `);

  const baz = config.bundles.find((b) => b.id === 'baz')!;
  expect(baz).toBeTruthy();
  baz.cache.refresh();
  expect(baz.cache.getModuleCount()).toBe(3);

  expect(baz.cache.getReferencedPaths()).toMatchInlineSnapshot(`
    Array [
      <absolute path>/packages/kbn-optimizer/src/__fixtures__/__tmp__/mock_repo/bazel-out/<platform>-fastbuild/bin/packages/kbn-ui-shared-deps-npm/target_node/public_path_module_creator.js,
      <absolute path>/packages/kbn-optimizer/src/__fixtures__/__tmp__/mock_repo/x-pack/baz/kibana.json,
      <absolute path>/packages/kbn-optimizer/src/__fixtures__/__tmp__/mock_repo/x-pack/baz/public/index.ts,
      <absolute path>/packages/kbn-optimizer/src/worker/entry_point_creator.ts,
    ]
  `);
});

it('uses cache on second run and exist cleanly', async () => {
  const config = OptimizerConfig.create({
    repoRoot: MOCK_REPO_DIR,
    pluginScanDirs: [Path.resolve(MOCK_REPO_DIR, 'plugins'), Path.resolve(MOCK_REPO_DIR, 'x-pack')],
    maxWorkerCount: 1,
    dist: false,
  });

  const msgs = await allValuesFrom(
    runOptimizer(config).pipe(
      tap((state) => {
        if (state.event?.type === 'worker stdio') {
          // eslint-disable-next-line no-console
          console.log('worker', state.event.stream, state.event.line);
        }
      })
    )
  );

  expect(msgs.map((m) => m.state.phase)).toMatchInlineSnapshot(`
    Array [
      "initializing",
      "initializing",
      "initializing",
      "initializing",
      "initialized",
      "success",
    ]
  `);
});

it('prepares assets for distribution', async () => {
  if (process.env.CODE_COVERAGE) {
    // test fails when testing coverage because source includes instrumentation, so skip it
    return;
  }
  const config = OptimizerConfig.create({
    repoRoot: MOCK_REPO_DIR,
    pluginScanDirs: [Path.resolve(MOCK_REPO_DIR, 'plugins'), Path.resolve(MOCK_REPO_DIR, 'x-pack')],
    maxWorkerCount: 1,
    dist: true,
  });

  await allValuesFrom(runOptimizer(config).pipe(logOptimizerState(log, config)));

  expect(
    Fs.readFileSync(Path.resolve(MOCK_REPO_DIR, 'plugins/foo/target/public/metrics.json'), 'utf8')
  ).toMatchSnapshot('metrics.json');

  expectFileMatchesSnapshotWithCompression('plugins/foo/target/public/foo.plugin.js', 'foo bundle');
  expectFileMatchesSnapshotWithCompression(
    'plugins/foo/target/public/foo.chunk.1.js',
    'foo async bundle'
  );
  expectFileMatchesSnapshotWithCompression('plugins/bar/target/public/bar.plugin.js', 'bar bundle');
  expectFileMatchesSnapshotWithCompression('x-pack/baz/target/public/baz.plugin.js', 'baz bundle');
});

/**
 * Verifies that the file matches the expected output and has matching compressed variants.
 */
const expectFileMatchesSnapshotWithCompression = (filePath: string, snapshotLabel: string) => {
  const path = Path.resolve(MOCK_REPO_DIR, filePath);
  const raw = Fs.readFileSync(path, 'utf8');
  const pretty = prettier.format(raw, {
    filepath: path,
  });

  expect(pretty).toMatchSnapshot(snapshotLabel);

  // Verify the brotli variant matches
  expect(
    Zlib.brotliDecompressSync(
      Fs.readFileSync(Path.resolve(MOCK_REPO_DIR, `${filePath}.br`))
    ).toString()
  ).toEqual(raw);

  // Verify the gzip variant matches
  expect(
    Zlib.gunzipSync(Fs.readFileSync(Path.resolve(MOCK_REPO_DIR, `${filePath}.gz`))).toString()
  ).toEqual(raw);
};
