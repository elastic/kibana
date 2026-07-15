/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EventEmitter } from 'events';
import { ToolingLog } from '@kbn/tooling-log';
import type { Runner } from '../../fake_mocha_types';
import {
  FailFastAbortError,
  getFailFastLimitFromEnv,
  isFailFastAbortError,
  setupFailFast,
} from './fail_fast';

const createRunner = () => new EventEmitter() as unknown as Runner;
const log = new ToolingLog();

describe('getFailFastLimitFromEnv', () => {
  it('returns undefined when FTR_FAIL_FAST_ENABLED is not truthy', () => {
    expect(getFailFastLimitFromEnv({})).toBeUndefined();
    expect(getFailFastLimitFromEnv({ FTR_FAIL_FAST_ENABLED: 'false' })).toBeUndefined();
    expect(getFailFastLimitFromEnv({ FTR_FAIL_FAST_ENABLED: '0' })).toBeUndefined();
  });

  it('defaults the limit to 3 when enabled without an explicit value', () => {
    expect(getFailFastLimitFromEnv({ FTR_FAIL_FAST_ENABLED: 'true' })).toBe(3);
    expect(getFailFastLimitFromEnv({ FTR_FAIL_FAST_ENABLED: '1' })).toBe(3);
  });

  it('honors a valid FTR_FAIL_FAST_MAX_CONSECUTIVE_FAILURES override', () => {
    expect(
      getFailFastLimitFromEnv({
        FTR_FAIL_FAST_ENABLED: 'true',
        FTR_FAIL_FAST_MAX_CONSECUTIVE_FAILURES: '5',
      })
    ).toBe(5);
  });

  it('falls back to the default for invalid override values', () => {
    for (const value of ['0', '-2', 'abc', '']) {
      expect(
        getFailFastLimitFromEnv({
          FTR_FAIL_FAST_ENABLED: 'true',
          FTR_FAIL_FAST_MAX_CONSECUTIVE_FAILURES: value,
        })
      ).toBe(3);
    }
  });
});

describe('setupFailFast', () => {
  it('trips once after `limit` consecutive failures', () => {
    const runner = createRunner();
    const onTrip = jest.fn();
    setupFailFast(runner, log, { limit: 3, onTrip });

    runner.emit('fail');
    runner.emit('fail');
    expect(onTrip).not.toHaveBeenCalled();

    runner.emit('fail');
    expect(onTrip).toHaveBeenCalledTimes(1);
    expect(onTrip).toHaveBeenCalledWith(3);

    // further failures do not trip again
    runner.emit('fail');
    expect(onTrip).toHaveBeenCalledTimes(1);
  });

  it('resets the streak on a passing test', () => {
    const runner = createRunner();
    const onTrip = jest.fn();
    setupFailFast(runner, log, { limit: 3, onTrip });

    runner.emit('fail');
    runner.emit('fail');
    runner.emit('pass');
    runner.emit('fail');
    runner.emit('fail');
    expect(onTrip).not.toHaveBeenCalled();

    runner.emit('fail');
    expect(onTrip).toHaveBeenCalledTimes(1);
  });

  it('counts hook failures toward the streak', () => {
    const runner = createRunner();
    const onTrip = jest.fn();
    setupFailFast(runner, log, { limit: 2, onTrip });

    // hooks emit the same `fail` event as tests
    runner.emit('fail');
    runner.emit('fail');
    expect(onTrip).toHaveBeenCalledTimes(1);
  });
});

describe('FailFastAbortError', () => {
  it('is identified by isFailFastAbortError', () => {
    const error = new FailFastAbortError(3, 3);
    expect(isFailFastAbortError(error)).toBe(true);
    expect(isFailFastAbortError(new Error('other'))).toBe(false);
    expect(error.message).toContain('3 consecutive test failures');
  });
});
