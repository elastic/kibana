/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { PassThrough } from 'stream';

import * as Rx from 'rxjs';
import { toArray } from 'rxjs';
import type { OptimizerPhase } from '@kbn/optimizer';
import { observeLines } from '@kbn/stdio-dev-helpers';
import { createReplaceSerializer } from '@kbn/jest-serializers';

import type { Options } from './optimizer';
import { Optimizer } from './optimizer';

const importState = { shouldFail: false };

jest.mock('@kbn/optimizer', () => {
  if (importState.shouldFail) {
    throw new Error('missing native binding');
  }

  return {
    RspackOptimizer: jest.fn(),
  };
});

interface RspackMockInstance {
  opts: unknown;
  _phase$: Rx.Subject<OptimizerPhase>;
  getPhase$: jest.Mock;
  run: jest.Mock;
  stop: jest.Mock;
}

const defaultOptions: Options = {
  enabled: true,
  cache: true,
  dist: true,
  pluginPaths: ['/some/dir'],
  pluginScanDirs: ['/some-scan-path'],
  quiet: true,
  silent: true,
  verbose: false,
  repoRoot: '/app',
  runExamples: true,
  watch: true,
};

const subscriptions: Rx.Subscription[] = [];
let RspackOptimizerMock: jest.Mock;

function flushPromises(): Promise<void> {
  const { promise, resolve } = Promise.withResolvers<void>();
  setImmediate(resolve);
  return promise;
}

expect.addSnapshotSerializer(createReplaceSerializer(/\[\d\d:\d\d:\d\d\.\d\d\d\]/, '[timestamp]'));
expect.addSnapshotSerializer(createReplaceSerializer(/\x1b\[[0-9;]*m/g, ''));

beforeEach(() => {
  // resolve the mock from the current module registry, which the import failure test resets
  RspackOptimizerMock = jest.requireMock<{ RspackOptimizer: jest.Mock }>(
    '@kbn/optimizer'
  ).RspackOptimizer;
  RspackOptimizerMock.mockImplementation(function (this: RspackMockInstance, opts: unknown) {
    this.opts = opts;
    this._phase$ = new Rx.Subject<OptimizerPhase>();
    this.getPhase$ = jest.fn(() => this._phase$.asObservable());
    this.run = jest.fn(async () => {});
    this.stop = jest.fn(async () => {});
  });
});

afterEach(() => {
  for (const sub of subscriptions) {
    sub.unsubscribe();
  }
  subscriptions.length = 0;

  jest.clearAllMocks();
});

it('constructs RspackOptimizer with expected options and a CLI-formatted log', async () => {
  const writeLogTo = new PassThrough();
  const linesPromise = Rx.firstValueFrom(observeLines(writeLogTo).pipe(toArray()));

  const optimizer = new Optimizer({
    ...defaultOptions,
    basePath: '/s/kibana',
    watch: false,
    quiet: false,
    silent: false,
    writeLogTo,
  });

  subscriptions.push(optimizer.run$.subscribe());

  await flushPromises();

  expect(RspackOptimizerMock).toHaveBeenCalledTimes(1);
  expect(RspackOptimizerMock).toHaveBeenCalledWith({
    repoRoot: '/app',
    watch: false,
    cache: true,
    dist: true,
    examples: true,
    pluginPaths: ['/some/dir'],
    pluginScanDirs: ['/some-scan-path'],
    allowlistPluginGroups: undefined,
    basePath: '/s/kibana',
    log: expect.any(Object),
  });

  const { log } = RspackOptimizerMock.mock.calls[0][0];
  log.success('1 bundle compiled successfully');
  log.error('compile errors');
  writeLogTo.end();

  expect(await linesPromise).toMatchInlineSnapshot(`
    Array [
      " np bld    log   [timestamp] [success][@kbn/optimizer] 1 bundle compiled successfully",
      " np bld    log   [timestamp] [error][@kbn/optimizer] compile errors",
    ]
  `);
});

it('emits phase$ and ready$ updates from the rspack phase stream', async () => {
  const optimizer = new Optimizer(defaultOptions);

  const phases: OptimizerPhase[] = [];
  const readyStates: boolean[] = [];

  subscriptions.push(
    optimizer.getPhase$().subscribe({
      next: (phase) => phases.push(phase),
      error: (error) => {
        throw error;
      },
    })
  );
  subscriptions.push(
    optimizer.isReady$().subscribe({
      next: (ready) => readyStates.push(ready),
      error: (error) => {
        throw error;
      },
    })
  );
  subscriptions.push(
    optimizer.run$.subscribe({
      error: (error) => {
        throw error;
      },
    })
  );

  await flushPromises();

  const instance = RspackOptimizerMock.mock.instances[0] as RspackMockInstance;
  instance._phase$.next('running');
  instance._phase$.next('success');
  instance._phase$.next('running');
  instance._phase$.next('issue');

  expect(phases).toEqual(['running', 'success', 'running', 'issue']);
  expect(readyStates).toEqual([false, true, false, true]);
});

it('calls rspackOptimizer.stop() when run$ subscription is disposed', async () => {
  const optimizer = new Optimizer(defaultOptions);

  const sub = optimizer.run$.subscribe({
    error: (error) => {
      throw error;
    },
  });
  subscriptions.push(sub);

  await flushPromises();

  const instance = RspackOptimizerMock.mock.instances[0] as RspackMockInstance;
  expect(instance.stop).not.toHaveBeenCalled();

  sub.unsubscribe();

  expect(instance.stop).toHaveBeenCalledTimes(1);
});

it('completes run$ when not in watch mode after run() resolves', async () => {
  const optimizer = new Optimizer({
    ...defaultOptions,
    watch: false,
  });

  const runComplete = jest.fn();
  subscriptions.push(
    optimizer.run$.subscribe({
      complete: runComplete,
      error: (error) => {
        throw error;
      },
    })
  );

  await flushPromises();

  const instance = RspackOptimizerMock.mock.instances[0] as RspackMockInstance;
  instance._phase$.next('success');
  await instance.run.mock.results[0].value;
  await flushPromises();

  expect(runComplete).toHaveBeenCalled();
});

it('completes immediately and is immediately ready when disabled', async () => {
  const ready$ = new Rx.BehaviorSubject<undefined | boolean>(undefined);
  const runComplete = jest.fn();

  const optimizer = new Optimizer({
    ...defaultOptions,
    enabled: false,
  });

  subscriptions.push(optimizer.isReady$().subscribe(ready$));
  subscriptions.push(optimizer.run$.subscribe({ complete: runComplete }));

  await flushPromises();

  expect(runComplete).toHaveBeenCalledTimes(1);
  expect(ready$).toHaveProperty('isStopped', true);
  expect(ready$.getValue()).toBe(true);
  expect(RspackOptimizerMock).not.toHaveBeenCalled();
});

it('logs and errors run$ when @kbn/optimizer fails to load', async () => {
  const writeLogTo = new PassThrough();
  const linesPromise = Rx.firstValueFrom(observeLines(writeLogTo).pipe(toArray()));
  const error = jest.fn();

  importState.shouldFail = true;
  // drop the cached mock so the deferred import goes through the (now throwing) module factory
  jest.resetModules();

  try {
    subscriptions.push(new Optimizer({ ...defaultOptions, writeLogTo }).run$.subscribe({ error }));
    await flushPromises();
  } finally {
    importState.shouldFail = false;
  }

  writeLogTo.end();

  expect(error).toHaveBeenCalledWith(new Error('missing native binding'));
  expect(RspackOptimizerMock).not.toHaveBeenCalled();
  expect(await linesPromise).toMatchInlineSnapshot(`
    Array [
      " np bld    log   [timestamp] [error][@kbn/optimizer] Failed to load @kbn/optimizer: missing native binding",
    ]
  `);
});
