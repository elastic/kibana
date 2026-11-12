/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { runPluginInitialize, SLOW_INITIALIZE_WARNING_MS } from './run_plugin_initialize';

const run = (initialize: () => Promise<void>) => {
  const log = loggingSystemMock.createLogger();
  return { log, result: runPluginInitialize({ pluginName: 'foo', log, initialize }) };
};

describe('runPluginInitialize', () => {
  // Fake `setTimeout` so the slow-run warning timers of runs that never settle do not outlive a test.
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('resolves and logs once initialize() succeeds', async () => {
    const { log, result } = run(jest.fn().mockResolvedValue(undefined));

    await expect(result).resolves.toBeUndefined();
    expect(log.info).toHaveBeenCalledWith(expect.stringMatching(/^Plugin "foo" initialized in/));
  });

  it('rejects with the original error and logs the failure with its stack', async () => {
    const cause = new Error('boom');
    const { log, result } = run(jest.fn().mockRejectedValue(cause));

    await expect(result).rejects.toBe(cause);
    expect(log.error).toHaveBeenCalledTimes(1);
    expect(log.error).toHaveBeenCalledWith(
      expect.stringMatching(/^Plugin "foo" initialize\(\) failed after \d+ms: Error: boom\n\s+at /)
    );
  });

  it('turns a synchronous throw into a failed run', async () => {
    const cause = new Error('sync boom');
    const { result } = run(() => {
      throw cause;
    });

    await expect(result).rejects.toBe(cause);
  });

  it('warns once initialize() has run longer than the threshold', () => {
    const { log } = run(() => new Promise<void>(() => {}));

    jest.advanceTimersByTime(SLOW_INITIALIZE_WARNING_MS - 1);
    expect(log.warn).not.toHaveBeenCalled();

    jest.advanceTimersByTime(1);
    expect(log.warn).toHaveBeenCalledTimes(1);
    expect(log.warn.mock.calls[0][0]).toMatch(
      /^Plugin "foo" initialize\(\) has been running for \d+s and has not finished\.$/
    );
  });

  it('does not warn when initialize() settles before the threshold', async () => {
    const { log, result } = run(jest.fn().mockResolvedValue(undefined));
    await result;

    jest.advanceTimersByTime(SLOW_INITIALIZE_WARNING_MS);
    expect(log.warn).not.toHaveBeenCalled();
  });
});
