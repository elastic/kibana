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
import { Optimizer, OptimizerConfig, OptimizerState } from '@kbn/optimizer';

expect.addSnapshotSerializer(createAbsolutePathSerializer());

const TMP_DIR = Path.resolve(__dirname, '../__fixtures__/__tmp__');
const MOCK_REPO_SRC = Path.resolve(__dirname, '../__fixtures__/mock_repo');
const MOCK_REPO_DIR = Path.resolve(TMP_DIR, 'mock_repo');

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

it('builds expected bundles, saves bundle counts to metadata', async () => {
  const config = OptimizerConfig.create({
    repoRoot: MOCK_REPO_DIR,
    pluginScanDirs: [Path.resolve(MOCK_REPO_DIR, 'plugins')],
    maxWorkerCount: 1,
  });

  expect(config).toMatchSnapshot('OptimizerConfig');

  const optimizer = new Optimizer(config);

  const states = await optimizer
    .run()
    .pipe(
      tap(state => {
        if (state.type === 'worker stdio') {
          // eslint-disable-next-line no-console
          console.log('worker', state.stream, state.chunk.toString('utf8'));
        }
      }),
      toArray()
    )
    .toPromise();

  const assert = (statement: string, truth: boolean, altStates?: OptimizerState[]) => {
    if (!truth) {
      throw new Error(
        `expected optimizer to ${statement}, states: ${inspect(altStates || states, {
          colors: true,
          depth: Infinity,
        })}`
      );
    }
  };

  const runningStates = states.filter(s => s.type === 'running');
  assert(
    'produce two or three "running" states',
    runningStates.length === 2 || runningStates.length === 3
  );

  const successStates = states.filter(s => s.type === 'compiler success');
  assert(
    'produce one "compiler success" states',
    successStates.length === 1 || successStates.length === 2
  );

  const otherStates = states.filter(s => s.type !== 'compiler success' && s.type !== 'running');
  assert('produce zero unexpected states', otherStates.length === 0, otherStates);

  expect(
    Fs.readFileSync(Path.resolve(MOCK_REPO_DIR, 'plugins/foo/target/public/foo.plugin.js'), 'utf8')
  ).toMatchSnapshot('foo bundle');

  expect(
    Fs.readFileSync(Path.resolve(MOCK_REPO_DIR, 'plugins/bar/target/public/bar.plugin.js'), 'utf8')
  ).toMatchSnapshot('bar bundle');

  expect(config.cache.getBundleModuleCount('foo')).toBe(3);
  expect(config.cache.getBundleModuleCount('bar')).toBe(2);
});
