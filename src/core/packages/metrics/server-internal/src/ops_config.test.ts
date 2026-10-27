/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { opsConfig } from './ops_config';

const validate = (eventLoopWatchdog: Record<string, unknown>) =>
  opsConfig.schema.validate({ cGroupOverrides: {}, eventLoopWatchdog }).eventLoopWatchdog;

describe('ops.eventLoopWatchdog config', () => {
  it('has defaults', () => {
    const config = opsConfig.schema.validate({ cGroupOverrides: {} }).eventLoopWatchdog;
    expect(config.enabled).toBe(false);
    expect(config.blockThreshold.asMilliseconds()).toBe(200);
    expect(config.startup.blockThreshold).toBeUndefined();
    expect(config.statsInterval.asMinutes()).toBe(10);
  });

  it('accepts all keys', () => {
    const config = validate({
      enabled: true,
      blockThreshold: '500ms',
      startup: { blockThreshold: '1s' },
      statsInterval: '1h',
    });
    expect(config.enabled).toBe(true);
    expect(config.blockThreshold.asMilliseconds()).toBe(500);
    expect(config.startup.blockThreshold?.asMilliseconds()).toBe(1000);
    expect(config.statsInterval.asHours()).toBe(1);
  });

  describe.each([
    ['blockThreshold', (value: string) => ({ blockThreshold: value })],
    ['startup.blockThreshold', (value: string) => ({ startup: { blockThreshold: value } })],
  ])('%s', (key, build) => {
    it.each(['200ms', '60s'])('accepts %s', (value) => {
      expect(() => validate(build(value))).not.toThrow();
    });

    it.each([
      ['199ms', 'Value must be equal to or greater than [PT0.2S]'],
      ['61s', 'Value must be equal to or less than [PT1M]'],
    ])('rejects %s', (value, message) => {
      expect(() => validate(build(value))).toThrow(`[eventLoopWatchdog.${key}]: ${message}`);
    });
  });

  it.each(['1m', '24h'])('accepts a statsInterval of %s', (value) => {
    expect(() => validate({ statsInterval: value })).not.toThrow();
  });

  it.each([
    ['59s', 'Value must be equal to or greater than [PT1M]'],
    ['25h', 'Value must be equal to or less than [PT24H]'],
  ])('rejects a statsInterval of %s', (value, message) => {
    expect(() => validate({ statsInterval: value })).toThrow(
      `[eventLoopWatchdog.statsInterval]: ${message}`
    );
  });

  it('rejects a heartbeatInterval key', () => {
    expect(() => validate({ heartbeatInterval: '50ms' })).toThrow(
      "[eventLoopWatchdog.heartbeatInterval]: Additional properties are not allowed ('heartbeatInterval' was unexpected)"
    );
  });

  // Profiling keys arrive with Release B; until then they must not be accepted and ignored.
  it('rejects profile keys', () => {
    expect(() => validate({ profile: { enabled: true } })).toThrow(
      "[eventLoopWatchdog.profile]: Additional properties are not allowed ('profile' was unexpected)"
    );
  });

  it('rejects profile keys under startup', () => {
    expect(() => validate({ startup: { profile: { startAfter: '5s' } } })).toThrow(
      "[eventLoopWatchdog.startup.profile]: Additional properties are not allowed ('profile' was unexpected)"
    );
  });
});
