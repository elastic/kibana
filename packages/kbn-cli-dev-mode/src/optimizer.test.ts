/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as Rx from 'rxjs';
import { RspackOptimizer } from '@kbn/optimizer';

import type { Options, OptimizerPhase } from './optimizer';
import { Optimizer } from './optimizer';

jest.mock('@kbn/optimizer', () => ({
  RspackOptimizer: jest.fn(),
}));

const RspackOptimizerMock = jest.mocked(RspackOptimizer);

interface RspackMockInstance {
  opts: unknown;
  phase$: Rx.Subject<OptimizerPhase>;
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
const flushPromises = (): Promise<void> => new Promise((resolve) => setImmediate(resolve));

beforeEach(() => {
  RspackOptimizerMock.mockImplementation(function (this: RspackMockInstance, opts: unknown) {
    this.opts = opts;
    this.phase$ = new Rx.Subject<OptimizerPhase>();
    this.getPhase$ = jest.fn(() => this.phase$.asObservable());
    this.run = jest.fn(async () => {});
    this.stop = jest.fn(async () => {});
  } as never);
});

afterEach(() => {
  subscriptions.forEach((subscription) => subscription.unsubscribe());
  subscriptions.length = 0;
  jest.clearAllMocks();
});

it('completes immediately and is immediately ready when disabled', () => {
  const ready$ = new Rx.BehaviorSubject<undefined | boolean>(undefined);
  const optimizer = new Optimizer({ ...defaultOptions, enabled: false });

  subscriptions.push(optimizer.isReady$().subscribe(ready$));

  expect(RspackOptimizerMock).not.toHaveBeenCalled();
  expect(ready$).toHaveProperty('isStopped', true);
  expect(ready$.getValue()).toBe(true);
});

it('constructs RspackOptimizer with expected options', () => {
  const optimizer = new Optimizer({
    ...defaultOptions,
    basePath: '/s/kibana',
    watch: false,
  });

  subscriptions.push(optimizer.run$.subscribe());

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
});

it('emits phase and ready updates', () => {
  const optimizer = new Optimizer(defaultOptions);
  const phases: OptimizerPhase[] = [];
  const readyStates: boolean[] = [];

  subscriptions.push(optimizer.getPhase$().subscribe((phase) => phases.push(phase)));
  subscriptions.push(optimizer.isReady$().subscribe((ready) => readyStates.push(ready)));
  subscriptions.push(optimizer.run$.subscribe());

  const instance = RspackOptimizerMock.mock.instances[0] as unknown as RspackMockInstance;
  instance.phase$.next('running');
  instance.phase$.next('success');
  instance.phase$.next('running');
  instance.phase$.next('issue');

  expect(phases).toEqual(['running', 'success', 'running', 'issue']);
  expect(readyStates).toEqual([false, true, false, true]);
});

it('stops the optimizer when the run subscription is disposed', () => {
  const optimizer = new Optimizer(defaultOptions);
  const subscription = optimizer.run$.subscribe();
  const instance = RspackOptimizerMock.mock.instances[0] as unknown as RspackMockInstance;

  subscription.unsubscribe();

  expect(instance.stop).toHaveBeenCalledTimes(1);
});

it('completes when a non-watch build finishes', async () => {
  const optimizer = new Optimizer({ ...defaultOptions, watch: false });
  const complete = jest.fn();
  subscriptions.push(optimizer.run$.subscribe({ complete }));

  await flushPromises();

  expect(complete).toHaveBeenCalledTimes(1);
});
