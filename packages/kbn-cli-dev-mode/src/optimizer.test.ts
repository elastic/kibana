/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PassThrough } from 'stream';

import * as Rx from 'rxjs';
import { toArray } from 'rxjs/operators';
import { OptimizerUpdate } from '@kbn/optimizer';
import { observeLines } from '@kbn/stdio-dev-helpers';
import { createReplaceSerializer } from '@kbn/jest-serializers';

import { Optimizer, Options } from './optimizer';

jest.mock('@kbn/optimizer');
const realOptimizer = jest.requireActual('@kbn/optimizer');
const { runOptimizer, OptimizerConfig, logOptimizerState, logOptimizerProgress } =
  jest.requireMock('@kbn/optimizer');

logOptimizerState.mockImplementation(realOptimizer.logOptimizerState);
logOptimizerProgress.mockImplementation(realOptimizer.logOptimizerProgress);

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
  pluginScanDirs: ['/some-scan-path'],
  quiet: true,
  silent: true,
  verbose: false,
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
    pluginScanDirs: [],
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
          "pluginScanDirs": Array [
            "/some-scan-path",
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
          "pluginScanDirs": Array [],
          "repoRoot": "/foo/bar",
          "watch": false,
        },
      ],
    ]
  `);
});

it('is ready when optimizer phase is success or issue and logs in familiar format', async () => {
  const writeLogTo = new PassThrough();
  const linesPromise = Rx.firstValueFrom(observeLines(writeLogTo).pipe(toArray()));

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
      "complete",
    ]
  `);

  writeLogTo.end();
  const lines = await linesPromise;
  expect(lines).toMatchInlineSnapshot(`
    Array [
      " [2mnp bld[22m    log   [timestamp] [[36msuccess[39m][[95m@kbn/optimizer[39m] 0 bundles compiled successfully after 0 sec",
      " [2mnp bld[22m    log   [timestamp] [error][[95m@kbn/optimizer[39m] webpack compile errors",
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
