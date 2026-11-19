/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ConsoleMonitor } from './console_monitor';

describe('ConsoleMonitor', () => {
  const { console: target } = globalThis;
  const { error: initialError, warn: initialWarn } = target;
  let hostError: jest.Mock;
  let hostWarn: jest.Mock;

  beforeEach(() => {
    jest.useFakeTimers();
    hostError = jest.fn();
    hostWarn = jest.fn();
    target.error = hostError;
    target.warn = hostWarn;
  });

  afterEach(() => {
    target.error = initialError;
    target.warn = initialWarn;
    jest.useRealTimers();
  });

  it('chains to the host console methods and reports the message', () => {
    const monitor = new ConsoleMonitor();
    const callback = jest.fn();
    monitor.subscribe(callback);
    monitor.startMonitoring();

    target.error('boom %s', 'here');
    target.warn('careful');
    jest.runAllTimers();

    expect(hostError).toHaveBeenCalledWith('boom %s', 'here', expect.any(Error));
    expect(hostWarn).toHaveBeenCalledWith('careful', expect.any(Error));
    expect(callback).toHaveBeenLastCalledWith({ message: 'careful', type: 'warn' });

    monitor.destroy();
  });

  it('restores the exact host console methods on destroy', () => {
    const monitor = new ConsoleMonitor();
    monitor.startMonitoring();

    expect(target.error).not.toBe(hostError);
    expect(target.warn).not.toBe(hostWarn);

    monitor.destroy();

    expect(target.error).toBe(hostError);
    expect(target.warn).toBe(hostWarn);
  });

  it('does not clobber a wrapper installed after monitoring started', () => {
    const monitor = new ConsoleMonitor();
    monitor.startMonitoring();
    const laterWrapper = jest.fn();
    target.error = laterWrapper;

    monitor.destroy();

    expect(target.error).toBe(laterWrapper);
    expect(target.warn).toBe(hostWarn);
  });
});
