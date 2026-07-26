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
import type { OptimizerUpdate } from '@kbn/optimizer';
import { observeLines } from '@kbn/stdio-dev-helpers';
import { createReplaceSerializer } from '@kbn/jest-serializers';

import type { Options, OptimizerPhase } from './optimizer';
import { Optimizer } from './optimizer';

const rspackTestState = { importShouldFail: false };

jest.mock('@kbn/rspack-optimizer', () => {
  if (rspackTestState.importShouldFail) {
    throw new Error('Failed to load @kbn/rspack-optimizer');
  }

  return {
    RspackOptimizer: jest.fn(),
  };
});

jest.mock('@kbn/optimizer');
const realOptimizer = jest.requireActual('@kbn/optimizer');
const { RspackOptimizer: RspackOptimizerMock } = jest.requireMock('@kbn/rspack-optimizer') as {
  RspackOptimizer: jest.Mock;
};

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

interface RspackMockInstance {
  opts: unknown;
  _phase$: Rx.Subject<OptimizerPhase>;
  getPhase$: jest.Mock;
  run: jest.Mock;
  stop: jest.Mock;
}

function flushPromises(): Promise<void> {
  return new Promise((resolve) => setImmediate(resolve));
}

function setupRspack(options: Options = defaultOptions) {
  const optimizer = new Optimizer(options);
  return { optimizer };
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

function setup(options: Options = defaultOptions) {
  const update$ = new Rx.Subject<OptimizerUpdate>();

  OptimizerConfig.create.mockImplementation(() => new MockOptimizerConfig());
  runOptimizer.mockImplementation(() => update$);

  const optimizer = new Optimizer(options);

  return { optimizer, update$ };
}

const subscriptions: Rx.Subscription[] = [];

expect.addSnapshotSerializer(createReplaceSerializer(/\[\d\d:\d\d:\d\d\.\d\d\d\]/, '[timestamp]'));
expect.addSnapshotSerializer(createReplaceSerializer(/\x1b\[[0-9;]*m/g, ''));

afterEach(() => {
  for (const sub of subscriptions) {
    sub.unsubscribe();
  }
  subscriptions.length = 0;

  jest.clearAllMocks();
});

describe('webpack optimizer path', () => {
  let previousKbnUseRspack: string | undefined;

  beforeEach(() => {
    previousKbnUseRspack = process.env.KBN_USE_RSPACK;
    delete process.env.KBN_USE_RSPACK;
  });

  afterEach(() => {
    if (previousKbnUseRspack === undefined) {
      delete process.env.KBN_USE_RSPACK;
    } else {
      process.env.KBN_USE_RSPACK = previousKbnUseRspack;
    }
  });

  it('uses options to create valid OptimizerConfig', () => {
    setup();
    setup({
      ...defaultOptions,
      cache: false,
      dist: false,
      runExamples: false,
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
      " np bld    log   [timestamp] [success][@kbn/optimizer] 0 bundles compiled successfully after 0 sec",
      " np bld    log   [timestamp] [error][@kbn/optimizer] webpack compile errors",
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
});

describe('rspack path', () => {
  let previousKbnUseRspack: string | undefined;

  beforeEach(() => {
    previousKbnUseRspack = process.env.KBN_USE_RSPACK;
    process.env.KBN_USE_RSPACK = 'true';
    rspackTestState.importShouldFail = false;

    logOptimizerState.mockImplementation(realOptimizer.logOptimizerState);
    logOptimizerProgress.mockImplementation(realOptimizer.logOptimizerProgress);
    OptimizerConfig.create.mockImplementation(() => new MockOptimizerConfig());
    runOptimizer.mockImplementation(() => new Rx.Subject<OptimizerUpdate>());

    RspackOptimizerMock.mockImplementation(function (this: RspackMockInstance, opts: unknown) {
      this.opts = opts;
      this._phase$ = new Rx.Subject<OptimizerPhase>();
      this.getPhase$ = jest.fn(() => this._phase$.asObservable());
      this.run = jest.fn(async () => {});
      this.stop = jest.fn(async () => {});
    });
  });

  afterEach(() => {
    if (previousKbnUseRspack === undefined) {
      delete process.env.KBN_USE_RSPACK;
    } else {
      process.env.KBN_USE_RSPACK = previousKbnUseRspack;
    }
  });

  it('constructs RspackOptimizer with expected options', async () => {
    const { optimizer } = setupRspack({
      ...defaultOptions,
      basePath: '/s/kibana',
      watch: false,
    });

    subscriptions.push(optimizer.run$.subscribe());

    await flushPromises();

    expect(RspackOptimizerMock).toHaveBeenCalledTimes(1);
    expect(RspackOptimizerMock).toHaveBeenCalledWith(
      expect.objectContaining({
        repoRoot: '/app',
        watch: false,
        cache: true,
        dist: true,
        examples: true,
        basePath: '/s/kibana',
        log: expect.any(Object),
      })
    );
    expect(OptimizerConfig.create).not.toHaveBeenCalled();
  });

  it('emits phase$ and ready$ updates from rspack phase stream', async () => {
    const { optimizer } = setupRspack();

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
    const { optimizer } = setupRspack();

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
    const { optimizer } = setupRspack({
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

  it('falls back to webpack when dynamic import of @kbn/rspack-optimizer fails', async () => {
    rspackTestState.importShouldFail = true;
    jest.resetModules();

    const update$ = new Rx.Subject<OptimizerUpdate>();
    const kbnOptimizer = jest.mocked(await import('@kbn/optimizer'));

    kbnOptimizer.runOptimizer.mockImplementation(() => update$);
    kbnOptimizer.OptimizerConfig.create.mockImplementation(
      () =>
        new MockOptimizerConfig() as unknown as ReturnType<
          typeof kbnOptimizer.OptimizerConfig.create
        >
    );
    kbnOptimizer.logOptimizerState.mockImplementation(realOptimizer.logOptimizerState);
    kbnOptimizer.logOptimizerProgress.mockImplementation(realOptimizer.logOptimizerProgress);

    const { Optimizer: OptimizerFresh } = await import('./optimizer');

    process.env.KBN_USE_RSPACK = 'true';

    const optimizer = new OptimizerFresh({
      ...defaultOptions,
    });

    subscriptions.push(
      optimizer.run$.subscribe({
        error: (error) => {
          throw error;
        },
      })
    );

    await flushPromises();

    expect(kbnOptimizer.runOptimizer).toHaveBeenCalled();
    expect(RspackOptimizerMock).not.toHaveBeenCalled();

    rspackTestState.importShouldFail = false;
    jest.resetModules();
  });
});
