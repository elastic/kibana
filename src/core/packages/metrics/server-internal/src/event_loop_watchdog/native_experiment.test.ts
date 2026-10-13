/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const mockBinding = { initialize: jest.fn(() => 7), dispose: jest.fn() };
jest.mock('./native_profiler', () => ({ loadNativeProfiler: jest.fn(() => mockBinding) }));

import Fs from 'node:fs';
import Path from 'node:path';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { NativeExperiment, resolveNativeAddon, selectNativeMode } from './native_experiment';

describe('native startup experiment', () => {
  const oldMode = process.env.KBN_EVENT_LOOP_NATIVE_MODE;
  const oldPath = process.env.KBN_EVENT_LOOP_NATIVE_ADDON;
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    delete process.env.KBN_EVENT_LOOP_NATIVE_MODE;
    delete process.env.KBN_EVENT_LOOP_NATIVE_ADDON;
  });
  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
    if (oldMode === undefined) delete process.env.KBN_EVENT_LOOP_NATIVE_MODE;
    else process.env.KBN_EVENT_LOOP_NATIVE_MODE = oldMode;
    if (oldPath === undefined) delete process.env.KBN_EVENT_LOOP_NATIVE_ADDON;
    else process.env.KBN_EVENT_LOOP_NATIVE_ADDON = oldPath;
  });

  it('selects all three random controls and rejects invalid overrides', () => {
    const random = jest.spyOn(Math, 'random');
    random.mockReturnValue(0);
    expect(selectNativeMode()).toBe('off');
    random.mockReturnValue(0.5);
    expect(selectNativeMode()).toBe('metadata');
    random.mockReturnValue(0.99);
    expect(selectNativeMode()).toBe('sample');
    process.env.KBN_EVENT_LOOP_NATIVE_MODE = 'invalid';
    expect(selectNativeMode).toThrow('must be off, metadata, or sample');
  });

  it.each(['off', 'metadata', 'sample'])('prepares only enabled metadata in %s mode', (mode) => {
    process.env.KBN_EVENT_LOOP_NATIVE_MODE = mode;
    const logger = loggingSystemMock.createLogger();
    const experiment = new NativeExperiment('/exact/profiler.node', logger);
    expect(mockBinding.initialize).toHaveBeenCalledTimes(mode === 'off' ? 0 : 1);
    expect(experiment.target).toEqual(
      mode === 'off' ? undefined : { path: '/exact/profiler.node', id: 7 }
    );
    expect(logger.info).toHaveBeenCalledTimes(1);
    jest.advanceTimersByTime(30_000);
    expect(logger.info).toHaveBeenCalledTimes(2);
    experiment.stop();
    jest.advanceTimersByTime(30_000);
    expect(logger.info).toHaveBeenCalledTimes(2);
  });

  it('resolves alongside the executing runtime, not a shared default binding', () => {
    const exists = jest.spyOn(Fs, 'existsSync').mockReturnValue(true);
    expect(resolveNativeAddon()).toBe(
      Path.resolve(Path.dirname(process.execPath), '../lib/event_loop_watchdog/profiler.node')
    );
    exists.mockReturnValue(false);
    expect(resolveNativeAddon()).toBeUndefined();
    process.env.KBN_EVENT_LOOP_NATIVE_ADDON = '/override/profiler.node';
    expect(resolveNativeAddon()).toBe('/override/profiler.node');
  });
});
