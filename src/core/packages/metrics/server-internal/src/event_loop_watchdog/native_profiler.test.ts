/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const mockBinding = {
  initialize: jest.fn(),
  request: jest.fn(),
  poll: jest.fn(),
  cancel: jest.fn(),
  dispose: jest.fn(),
};
const mockLoadNative = jest.fn(() => mockBinding);
jest.mock('node:module', () => ({ createRequire: () => mockLoadNative }));

import Fs from 'node:fs';
import { loggerMock } from '@kbn/logging-mocks';
import type { InternalThreadsStart } from '@kbn/core-threads-server-internal';
import { EventLoopWatchdog } from './event_loop_watchdog';
import { createNativeSession, loadNativeProfiler } from './native_profiler';

describe('native profiler bridge', () => {
  let manifest: object;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    const variables = process.config.variables as typeof process.config.variables & {
      v8_enable_pointer_compression: number;
      v8_enable_sandbox: number;
    };
    manifest = {
      node: process.version,
      modules: process.versions.modules,
      v8: process.versions.v8,
      platform: process.platform,
      arch: process.arch,
      pointerCompression: Boolean(variables.v8_enable_pointer_compression),
      sandbox: Boolean(variables.v8_enable_sandbox),
    };
    jest.spyOn(Fs, 'readFileSync').mockImplementation(() => JSON.stringify(manifest));
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it('prevents replacement workers until exit cancellation and termination complete', async () => {
    let release = () => {};
    const termination = new Promise<void>((resolve) => {
      release = resolve;
    });
    let onExit: (() => void) | undefined;
    let created = 0;
    const worker = {
      start: jest.fn(),
      stop: jest.fn(() => {
        onExit?.();
        return termination;
      }),
    };
    const threads: InternalThreadsStart = {
      createWorker: (options) => {
        created++;
        onExit = options.onExit;
        return worker;
      },
    };
    mockBinding.initialize.mockReturnValue(3);
    const watchdog = new EventLoopWatchdog({
      threads,
      logger: loggerMock.create(),
      sanitizeRoot: '/poc',
      nativeAddonPath: '/poc/profiler.node',
    });
    watchdog.start();
    const stopped = watchdog.stop();
    expect(mockBinding.cancel).toHaveBeenCalledWith(3);
    expect(() => watchdog.start()).toThrow('while it is stopping');
    expect(created).toBe(1);
    release();
    await stopped;
    watchdog.start();
    expect(created).toBe(2);
    await watchdog.dispose();
    expect(mockBinding.dispose).toHaveBeenCalledWith(3);
  });

  it('rejects a different pointer-compression build before loading native code', () => {
    manifest = {
      ...manifest,
      pointerCompression: !(manifest as { pointerCompression: boolean }).pointerCompression,
    };
    expect(() => loadNativeProfiler('/poc/profiler.node')).toThrow('exact Node build');
    expect(mockLoadNative).not.toHaveBeenCalled();
  });

  it('starts through the native request queue and waits for interrupt completion', () => {
    mockBinding.request.mockReturnValue(7);
    mockBinding.poll.mockReturnValueOnce(undefined).mockReturnValueOnce('');
    const callback = jest.fn();
    const session = createNativeSession({ path: '/poc/profiler.node', id: 3 });
    session.post('Profiler.start', {}, callback);
    expect(mockBinding.request).toHaveBeenCalledWith(3, true);
    jest.advanceTimersByTime(5);
    expect(callback).not.toHaveBeenCalled();
    jest.advanceTimersByTime(5);
    expect(callback).toHaveBeenCalledWith(null, {});
    expect(jest.getTimerCount()).toBe(0);
  });

  it('parses the stopped profile in the observer, not in the interrupted isolate', () => {
    mockBinding.poll.mockReturnValue('{"nodes":[],"samples":[]}');
    const callback = jest.fn();
    const session = createNativeSession({ path: '/poc/profiler.node', id: 3 });
    session.post('Profiler.stop', {}, callback);
    jest.advanceTimersByTime(5);
    expect(mockBinding.request).toHaveBeenCalledWith(3, false);
    expect(callback).toHaveBeenCalledWith(null, { profile: { nodes: [], samples: [] } });
  });

  it('reports native errors and clears polling', () => {
    mockBinding.poll.mockImplementation(() => {
      throw new Error('cancelled');
    });
    const callback = jest.fn();
    createNativeSession({ path: '/poc/profiler.node', id: 3 }).post('Profiler.start', {}, callback);
    jest.advanceTimersByTime(5);
    expect(callback).toHaveBeenCalledWith(new Error('cancelled'));
    expect(jest.getTimerCount()).toBe(0);
  });

  it('disconnects outstanding requests without leaving observer timers', () => {
    mockBinding.poll.mockReturnValue(undefined);
    const callback = jest.fn();
    const session = createNativeSession({ path: '/poc/profiler.node', id: 3 });
    session.post('Profiler.start', {}, callback);
    session.disconnect();
    expect(callback).toHaveBeenCalledWith(new Error('Native capture session disconnected'));
    expect(jest.getTimerCount()).toBe(0);
    session.post('Profiler.start', {}, callback);
    expect(mockBinding.request).toHaveBeenCalledTimes(1);
  });
});
