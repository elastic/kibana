/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import Path from 'path';
import Fs from 'fs';
import Zlib from 'zlib';
import { inspect } from 'util';

import cpy from 'cpy';
import del from 'del';
import { toArray, tap, filter } from 'rxjs/operators';
import { ToolingLog, REPO_ROOT } from '@kbn/dev-utils';
import { runOptimizer, OptimizerConfig, OptimizerUpdate, logOptimizerState } from '@kbn/optimizer';

const TMP_DIR = Path.resolve(__dirname, '../__fixtures__/__tmp__');
const MOCK_REPO_SRC = Path.resolve(__dirname, '../__fixtures__/mock_repo');
const MOCK_REPO_DIR = Path.resolve(TMP_DIR, 'mock_repo');

expect.addSnapshotSerializer({
  serialize: (value: string) => value.split(REPO_ROOT).join('<absolute path>').replace(/\\/g, '/'),
  test: (value: any) => typeof value === 'string' && value.includes(REPO_ROOT),
});

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
    pluginScanDirs: [Path.resolve(MOCK_REPO_DIR, 'plugins')],
    maxWorkerCount: 1,
    dist: false,
  });

  expect(config).toMatchSnapshot('OptimizerConfig');

  const msgs = await runOptimizer(config)
    .pipe(
      logOptimizerState(log, config),
      filter((x) => x.event?.type !== 'worker stdio'),
      toArray()
    )
    .toPromise();

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
  assert('produce two bundle cache events while initializing', bundleCacheStates.length === 2);

  const initializedStates = msgs.filter((msg) => msg.state.phase === 'initialized');
  assert('produce at least one initialized event', initializedStates.length >= 1);

  const workerStarted = msgs.filter((msg) => msg.event?.type === 'worker started');
  assert('produce one worker started event', workerStarted.length === 1);

  const runningStates = msgs.filter((msg) => msg.state.phase === 'running');
  assert(
    'produce two or three "running" states',
    runningStates.length === 2 || runningStates.length === 3
  );

  const bundleNotCachedEvents = msgs.filter((msg) => msg.event?.type === 'bundle not cached');
  assert('produce two "bundle not cached" events', bundleNotCachedEvents.length === 2);

  const successStates = msgs.filter((msg) => msg.state.phase === 'success');
  assert(
    'produce one or two "compiler success" states',
    successStates.length === 1 || successStates.length === 2
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
  expect(foo.cache.getReferencedFiles()).toMatchInlineSnapshot(`
    Array [
      <absolute path>/packages/kbn-optimizer/src/__fixtures__/__tmp__/mock_repo/plugins/foo/public/async_import.ts,
      <absolute path>/packages/kbn-optimizer/src/__fixtures__/__tmp__/mock_repo/plugins/foo/public/ext.ts,
      <absolute path>/packages/kbn-optimizer/src/__fixtures__/__tmp__/mock_repo/plugins/foo/public/index.ts,
      <absolute path>/packages/kbn-optimizer/src/__fixtures__/__tmp__/mock_repo/plugins/foo/public/lib.ts,
      <absolute path>/packages/kbn-optimizer/target/worker/entry_point_creator.js,
      <absolute path>/packages/kbn-ui-shared-deps/public_path_module_creator.js,
    ]
  `);

  const bar = config.bundles.find((b) => b.id === 'bar')!;
  expect(bar).toBeTruthy();
  bar.cache.refresh();
  expect(bar.cache.getModuleCount()).toBe(
    // code + styles + style/css-loader runtimes + public path updater
    18
  );

  expect(bar.cache.getReferencedFiles()).toMatchInlineSnapshot(`
    Array [
      <absolute path>/node_modules/css-loader/package.json,
      <absolute path>/node_modules/style-loader/package.json,
      <absolute path>/packages/kbn-optimizer/src/__fixtures__/__tmp__/mock_repo/plugins/bar/public/index.scss,
      <absolute path>/packages/kbn-optimizer/src/__fixtures__/__tmp__/mock_repo/plugins/bar/public/index.ts,
      <absolute path>/packages/kbn-optimizer/src/__fixtures__/__tmp__/mock_repo/plugins/bar/public/legacy/styles.scss,
      <absolute path>/packages/kbn-optimizer/src/__fixtures__/__tmp__/mock_repo/plugins/bar/public/lib.ts,
      <absolute path>/packages/kbn-optimizer/src/__fixtures__/__tmp__/mock_repo/src/legacy/ui/public/icon.svg,
      <absolute path>/packages/kbn-optimizer/target/worker/entry_point_creator.js,
      <absolute path>/packages/kbn-ui-shared-deps/public_path_module_creator.js,
    ]
  `);
});

it('uses cache on second run and exist cleanly', async () => {
  const config = OptimizerConfig.create({
    repoRoot: MOCK_REPO_DIR,
    pluginScanDirs: [Path.resolve(MOCK_REPO_DIR, 'plugins')],
    maxWorkerCount: 1,
    dist: false,
  });

  const msgs = await runOptimizer(config)
    .pipe(
      tap((state) => {
        if (state.event?.type === 'worker stdio') {
          // eslint-disable-next-line no-console
          console.log('worker', state.event.stream, state.event.line);
        }
      }),
      toArray()
    )
    .toPromise();

  expect(msgs.map((m) => m.state.phase)).toMatchInlineSnapshot(`
    Array [
      "initializing",
      "initializing",
      "initializing",
      "initialized",
      "success",
    ]
  `);
});

it('prepares assets for distribution', async () => {
  const config = OptimizerConfig.create({
    repoRoot: MOCK_REPO_DIR,
    pluginScanDirs: [Path.resolve(MOCK_REPO_DIR, 'plugins')],
    maxWorkerCount: 1,
    dist: true,
  });

  await runOptimizer(config).pipe(logOptimizerState(log, config), toArray()).toPromise();

  expectFileMatchesSnapshotWithCompression('plugins/foo/target/public/foo.plugin.js', 'foo bundle');
  expectFileMatchesSnapshotWithCompression(
    'plugins/foo/target/public/1.plugin.js',
    'foo async bundle'
  );
  expectFileMatchesSnapshotWithCompression('plugins/bar/target/public/bar.plugin.js', 'bar bundle');
});

/**
 * Verifies that the file matches the expected output and has matching compressed variants.
 */
const expectFileMatchesSnapshotWithCompression = (filePath: string, snapshotLabel: string) => {
  const raw = Fs.readFileSync(Path.resolve(MOCK_REPO_DIR, filePath), 'utf8');

  expect(raw).toMatchSnapshot(snapshotLabel);

  // Verify the brotli variant matches
  expect(
    // @ts-expect-error @types/node is missing the brotli functions
    Zlib.brotliDecompressSync(
      Fs.readFileSync(Path.resolve(MOCK_REPO_DIR, `${filePath}.br`))
    ).toString()
  ).toEqual(raw);

  // Verify the gzip variant matches
  expect(
    Zlib.gunzipSync(Fs.readFileSync(Path.resolve(MOCK_REPO_DIR, `${filePath}.gz`))).toString()
  ).toEqual(raw);
};
