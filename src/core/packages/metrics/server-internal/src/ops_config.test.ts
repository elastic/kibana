/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { opsConfig } from './ops_config';

describe('ops config: eventLoopWatchdog', () => {
  it('has bounded defaults', () => {
    const { eventLoopWatchdog } = opsConfig.schema.validate({});
    expect(eventLoopWatchdog.threshold.asMilliseconds()).toBe(500);
    expect(eventLoopWatchdog.heartbeatInterval.asMilliseconds()).toBe(100);
    expect(eventLoopWatchdog.liveNoticeInterval.asMilliseconds()).toBe(5_000);
    expect(eventLoopWatchdog.maxLiveNoticesPerBlock).toBe(12);
    expect(eventLoopWatchdog.maxCandidates).toBe(10);
    expect(eventLoopWatchdog.profileAfter.asMilliseconds()).toBe(2_000);
    expect(eventLoopWatchdog.maxProfileDuration.asMilliseconds()).toBe(10_000);
    expect(eventLoopWatchdog.profileCooldown.asMilliseconds()).toBe(600_000);
  });

  it('accepts values within bounds', () => {
    const { eventLoopWatchdog } = opsConfig.schema.validate({
      eventLoopWatchdog: { threshold: '200ms', heartbeatInterval: '20ms' },
    });
    expect(eventLoopWatchdog.threshold.asMilliseconds()).toBe(200);
    expect(eventLoopWatchdog.heartbeatInterval.asMilliseconds()).toBe(20);
  });

  it.each([
    [{ threshold: '10ms' }, /threshold.*between 50ms and 60000ms/],
    [{ heartbeatInterval: '1m' }, /heartbeatInterval/],
    [{ liveNoticeInterval: '10m' }, /liveNoticeInterval/],
    [{ profileAfter: '10m' }, /profileAfter/],
    [{ maxProfileDuration: '2m' }, /maxProfileDuration/],
    [{ profileCooldown: '2h' }, /profileCooldown/],
    [{ maxCandidates: 1000 }, /maxCandidates/],
    [{ maxCandidates: 2.5 }, /maxCandidates.*integer/],
    [{ maxLiveNoticesPerBlock: 1.5 }, /maxLiveNoticesPerBlock.*integer/],
  ])('rejects out-of-bounds values %j', (eventLoopWatchdog, error) => {
    expect(() => opsConfig.schema.validate({ eventLoopWatchdog })).toThrow(error);
  });
});
