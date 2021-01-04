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

import { PassThrough } from 'stream';

import * as Rx from 'rxjs';
import { toArray } from 'rxjs/operators';
import { OptimizerUpdate } from '@kbn/optimizer';
import { observeLines, createReplaceSerializer } from '@kbn/dev-utils';
import { firstValueFrom } from '@kbn/std';

import { Optimizer, Options } from './optimizer';

jest.mock('@kbn/optimizer');
const realOptimizer = jest.requireActual('@kbn/optimizer');
const { runOptimizer, OptimizerConfig, logOptimizerState } = jest.requireMock('@kbn/optimizer');

logOptimizerState.mockImplementation(realOptimizer.logOptimizerState);

class MockOptimizerConfig {}

const mockOptimizerUpdate = (phase: OptimizerUpdate['state']['phase']) => {
  return {
    state: {
      compilerStates: [],
      durSec: 0,
      offlineBundles: [],
      onlineBundles: [],
      phase,
      startTime: 100,
    },
  };
};

const defaultOptions: Options = {
  enabled: true,
  cache: true,
  dist: true,
  oss: true,
  pluginPaths: ['/some/dir'],
  quiet: true,
  silent: true,
  repoRoot: '/app',
  runExamples: true,
  watch: true,
};

function setup(options: Options = defaultOptions) {
  const update$ = new Rx.Subject<OptimizerUpdate>();

  OptimizerConfig.create.mockImplementation(() => new MockOptimizerConfig());
  runOptimizer.mockImplementation(() => update$);

  const optimizer = new Optimizer(options);

  return { optimizer, update$ };
}

const subscriptions: Rx.Subscription[] = [];

expect.addSnapshotSerializer(createReplaceSerializer(/\[\d\d:\d\d:\d\d\.\d\d\d\]/, '[timestamp]'));

afterEach(() => {
  for (const sub of subscriptions) {
    sub.unsubscribe();
  }
  subscriptions.length = 0;

  jest.clearAllMocks();
});

it('uses options to create valid OptimizerConfig', () => {
  setup();
  setup({
    ...defaultOptions,
    cache: false,
    dist: false,
    runExamples: false,
    oss: false,
    pluginPaths: [],
    repoRoot: '/foo/bar',
    watch: false,
  });

  expect(OptimizerConfig.create.mock.calls).toMatchInlineSnapshot(`
    Array [
      Array [
        Object {
          "cache": true,
          "dist": true,
          "examples": true,
          "includeCoreBundle": true,
          "oss": true,
          "pluginPaths": Array [
            "/some/dir",
          ],
          "repoRoot": "/app",
          "watch": true,
        },
      ],
      Array [
        Object {
          "cache": false,
          "dist": false,
          "examples": false,
          "includeCoreBundle": true,
          "oss": false,
          "pluginPaths": Array [],
          "repoRoot": "/foo/bar",
          "watch": false,
        },
      ],
    ]
  `);
});

it('is ready when optimizer phase is success or issue and logs in familiar format', async () => {
  const writeLogTo = new PassThrough();
  const linesPromise = firstValueFrom(observeLines(writeLogTo).pipe(toArray()));

  const { update$, optimizer } = setup({
    ...defaultOptions,
    quiet: false,
    silent: false,
    writeLogTo,
  });

  const history: any[] = ['<init>'];
  subscriptions.push(
    optimizer.isReady$().subscribe({
      next(ready) {
        history.push(`ready: ${ready}`);
      },
      error(error) {
        throw error;
      },
      complete() {
        history.push(`complete`);
      },
    })
  );

  subscriptions.push(
    optimizer.run$.subscribe({
      error(error) {
        throw error;
      },
    })
  );

  history.push('<success>');
  update$.next(mockOptimizerUpdate('success'));

  history.push('<running>');
  update$.next(mockOptimizerUpdate('running'));

  history.push('<issue>');
  update$.next(mockOptimizerUpdate('issue'));

  update$.complete();

  expect(history).toMatchInlineSnapshot(`
    Array [
      "<init>",
      "<success>",
      "ready: true",
      "<running>",
      "ready: false",
      "<issue>",
      "ready: true",
    ]
  `);

  writeLogTo.end();
  const lines = await linesPromise;
  expect(lines).toMatchInlineSnapshot(`
    Array [
      "[2mnp bld[22m    log   [timestamp] [[36msuccess[39m][[95m@kbn/optimizer[39m] 0 bundles compiled successfully after 0 sec",
      "[2mnp bld[22m    log   [timestamp] [error][[95m@kbn/optimizer[39m] webpack compile errors",
    ]
  `);
});

it('completes immedately and is immediately ready when disabled', () => {
  const ready$ = new Rx.BehaviorSubject<undefined | boolean>(undefined);

  const { optimizer, update$ } = setup({
    ...defaultOptions,
    enabled: false,
  });

  subscriptions.push(optimizer.isReady$().subscribe(ready$));

  expect(update$.observers).toHaveLength(0);
  expect(runOptimizer).not.toHaveBeenCalled();
  expect(ready$).toHaveProperty('isStopped', true);
  expect(ready$.getValue()).toBe(true);
});
