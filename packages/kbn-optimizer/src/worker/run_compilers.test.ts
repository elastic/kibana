/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { setImmediate } from 'timers/promises';
import type { Stats } from 'webpack';
import { parseThemeTags } from '@kbn/core-ui-settings-common';

import { Bundle, BundleRemotes } from '../common';
import { runCompilers } from './run_compilers';

jest.mock('./webpack.config', () => ({ getWebpackConfig: jest.fn() }));
jest.mock('webpack', () => () => ({
  compilers: [{ hooks: mockHooks }],
  run: jest.fn(),
  watch: jest.fn(),
}));

const createHook = <T>() => {
  const tap = jest.fn<void, [string, (value: T) => void]>();
  return { tap, call: (value: T) => tap.mock.calls.forEach(([, callback]) => callback(value)) };
};
const mockHooks = {
  beforeRun: createHook<void>(),
  watchRun: createHook<void>(),
  done: createHook<Stats>(),
  afterDone: createHook<Stats>(),
  failed: createHook<Error>(),
};
const stats: Stats = {
  hash: 'test',
  startTime: 0,
  endTime: 1,
  compilation: { needAdditionalPass: false } as Stats['compilation'],
  hasErrors: () => false,
  hasWarnings: () => false,
  toJson: () => ({ errors: [], warnings: [] }),
};

beforeEach(() => {
  jest.clearAllMocks();
});

const observe = (watch = false) => {
  const bundle = new Bundle({
    id: 'test',
    type: 'plugin',
    contextDir: '/repo/test',
    sourceRoot: '/repo',
    outputDir: '/repo/test/target',
    remoteInfo: { pkgId: '@kbn/test-plugin', targets: ['public'] },
    ignoreMetrics: false,
  });
  jest.spyOn(bundle.cache, 'getModuleCount').mockReturnValue(0);
  const observer = { next: jest.fn(), complete: jest.fn(), error: jest.fn() };
  const subscription = runCompilers(
    {
      repoRoot: '/repo',
      watch,
      dist: false,
      cache: false,
      profileWebpack: true,
      themeTags: parseThemeTags('*'),
      browserslistEnv: 'production',
      optimizerCacheKey: null,
    },
    [bundle],
    new BundleRemotes([])
  ).subscribe(observer);
  return { ...observer, subscription };
};

it('waits for asynchronous done hooks before reporting success and completing', async () => {
  const observer = observe();
  try {
    mockHooks.done.call(stats);
    await setImmediate();
    expect(observer.complete).not.toHaveBeenCalled();
    expect(observer.next).not.toHaveBeenCalled();

    mockHooks.afterDone.call(stats);
    await setImmediate();
    expect(observer.next).toHaveBeenCalledWith({
      type: 'compiler success',
      bundleId: 'test',
      moduleCount: 0,
    });
    expect(observer.complete).toHaveBeenCalledTimes(1);
  } finally {
    observer.subscription.unsubscribe();
  }
});

it('reports errors from late done hooks instead of completing successfully', async () => {
  const observer = observe();
  try {
    mockHooks.done.call(stats);
    await setImmediate();
    mockHooks.failed.call(new Error('report failed'));
    expect(observer.error).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'compiler error', errorMsg: 'report failed' })
    );
    expect(observer.complete).not.toHaveBeenCalled();
  } finally {
    observer.subscription.unsubscribe();
  }
});

it('continues observing subsequent compilations in watch mode', async () => {
  const observer = observe(true);
  try {
    mockHooks.afterDone.call(stats);
    mockHooks.afterDone.call(stats);
    await setImmediate();
    expect(observer.next).toHaveBeenCalledTimes(2);
    expect(observer.complete).not.toHaveBeenCalled();
  } finally {
    observer.subscription.unsubscribe();
  }
});
