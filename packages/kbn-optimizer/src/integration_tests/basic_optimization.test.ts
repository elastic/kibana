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
import { inspect } from 'util';

import cpy from 'cpy';
import del from 'del';
import { toArray, tap } from 'rxjs/operators';
import { createAbsolutePathSerializer } from '@kbn/dev-utils';
import { runOptimizer, OptimizerConfig, OptimizerUpdate } from '@kbn/optimizer';

const TMP_DIR = Path.resolve(__dirname, '../__fixtures__/__tmp__');
const MOCK_REPO_SRC = Path.resolve(__dirname, '../__fixtures__/mock_repo');
const MOCK_REPO_DIR = Path.resolve(TMP_DIR, 'mock_repo');

expect.addSnapshotSerializer(createAbsolutePathSerializer(MOCK_REPO_DIR));

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
  });

  expect(config).toMatchSnapshot('OptimizerConfig');

  const msgs = await runOptimizer(config)
    .pipe(
      tap(state => {
        if (state.event?.type === 'worker stdio') {
          // eslint-disable-next-line no-console
          console.log('worker', state.event.stream, state.event.chunk.toString('utf8'));
        }
      }),
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

  const initializingStates = msgs.filter(msg => msg.state.phase === 'initializing');
  assert('produce at least one initializing event', initializingStates.length >= 1);

  const bundleCacheStates = msgs.filter(
    msg =>
      (msg.event?.type === 'bundle cached' || msg.event?.type === 'bundle not cached') &&
      msg.state.phase === 'initializing'
  );
  assert('produce two bundle cache events while initializing', bundleCacheStates.length === 2);

  const initializedStates = msgs.filter(msg => msg.state.phase === 'initialized');
  assert('produce at least one initialized event', initializedStates.length >= 1);

  const workerStarted = msgs.filter(msg => msg.event?.type === 'worker started');
  assert('produce one worker started event', workerStarted.length === 1);

  const runningStates = msgs.filter(msg => msg.state.phase === 'running');
  assert(
    'produce two or three "running" states',
    runningStates.length === 2 || runningStates.length === 3
  );

  const bundleNotCachedEvents = msgs.filter(msg => msg.event?.type === 'bundle not cached');
  assert('produce two "bundle not cached" events', bundleNotCachedEvents.length === 2);

  const successStates = msgs.filter(msg => msg.state.phase === 'success');
  assert(
    'produce one or two "compiler success" states',
    successStates.length === 1 || successStates.length === 2
  );

  const otherStates = msgs.filter(
    msg =>
      msg.state.phase !== 'initializing' &&
      msg.state.phase !== 'success' &&
      msg.state.phase !== 'running' &&
      msg.state.phase !== 'initialized' &&
      msg.event?.type !== 'bundle not cached'
  );
  assert('produce zero unexpected states', otherStates.length === 0, otherStates);

  expect(
    Fs.readFileSync(Path.resolve(MOCK_REPO_DIR, 'plugins/foo/target/public/foo.plugin.js'), 'utf8')
  ).toMatchSnapshot('foo bundle');

  expect(
    Fs.readFileSync(Path.resolve(MOCK_REPO_DIR, 'plugins/bar/target/public/bar.plugin.js'), 'utf8')
  ).toMatchSnapshot('bar bundle');

  const foo = config.bundles.find(b => b.id === 'foo')!;
  expect(foo).toBeTruthy();
  foo.cache.refresh();
  expect(foo.cache.getModuleCount()).toBe(3);
  expect(foo.cache.getReferencedFiles()).toMatchInlineSnapshot(`
    Array [
      <absolute path>/plugins/foo/public/ext.ts,
      <absolute path>/plugins/foo/public/index.ts,
      <absolute path>/plugins/foo/public/lib.ts,
    ]
  `);

  const bar = config.bundles.find(b => b.id === 'bar')!;
  expect(bar).toBeTruthy();
  bar.cache.refresh();
  expect(bar.cache.getModuleCount()).toBe(5);
  expect(bar.cache.getReferencedFiles()).toMatchInlineSnapshot(`
    Array [
      <absolute path>/plugins/foo/public/ext.ts,
      <absolute path>/plugins/foo/public/index.ts,
      <absolute path>/plugins/foo/public/lib.ts,
      <absolute path>/plugins/bar/public/index.ts,
      <absolute path>/plugins/bar/public/lib.ts,
    ]
  `);
});

it('uses cache on second run and exist cleanly', async () => {
  const config = OptimizerConfig.create({
    repoRoot: MOCK_REPO_DIR,
    pluginScanDirs: [Path.resolve(MOCK_REPO_DIR, 'plugins')],
    maxWorkerCount: 1,
  });

  const msgs = await runOptimizer(config)
    .pipe(
      tap(state => {
        if (state.event?.type === 'worker stdio') {
          // eslint-disable-next-line no-console
          console.log('worker', state.event.stream, state.event.chunk.toString('utf8'));
        }
      }),
      toArray()
    )
    .toPromise();

  expect(msgs.map(m => m.state.phase)).toMatchInlineSnapshot(`
    Array [
      "initializing",
      "initializing",
      "initializing",
      "initialized",
      "success",
    ]
  `);
});
