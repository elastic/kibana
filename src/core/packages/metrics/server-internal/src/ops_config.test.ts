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
    expect(config.profiling.startAfter.asSeconds()).toBe(30);
    expect(config.profiling.maxDuration.asSeconds()).toBe(10);
    expect(config.profiling.cooldown.asMinutes()).toBe(1);
    expect(config.startup.profiling).toEqual({});
  });

  it('accepts all keys', () => {
    const config = validate({
      enabled: true,
      blockThreshold: '500ms',
      profiling: { startAfter: '20s', maxDuration: '5s', cooldown: '5m' },
      startup: {
        blockThreshold: '1s',
        profiling: { startAfter: '45s', maxDuration: '15s', cooldown: '2m' },
      },
      statsInterval: '1h',
    });
    expect(config.enabled).toBe(true);
    expect(config.blockThreshold.asMilliseconds()).toBe(500);
    expect(config.startup.blockThreshold?.asMilliseconds()).toBe(1000);
    expect(config.statsInterval.asHours()).toBe(1);
    expect(config.profiling.startAfter.asSeconds()).toBe(20);
    expect(config.profiling.maxDuration.asSeconds()).toBe(5);
    expect(config.profiling.cooldown.asMinutes()).toBe(5);
    expect(config.startup.profiling.startAfter?.asSeconds()).toBe(45);
    expect(config.startup.profiling.maxDuration?.asSeconds()).toBe(15);
    expect(config.startup.profiling.cooldown?.asMinutes()).toBe(2);
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

  describe.each([
    ['startAfter', '2s', '4m', '1999ms', '241s', 'PT2S', 'PT4M'],
    ['maxDuration', '1s', '30s', '999ms', '31s', 'PT1S', 'PT30S'],
    ['cooldown', '10s', '24h', '9s', '25h', 'PT10S', 'PT24H'],
  ])('profiling.%s', (setting, min, max, belowMin, aboveMax, minIso, maxIso) => {
    describe.each([
      ['profiling', (value: string) => ({ profiling: { [setting]: value } })],
      ['startup.profiling', (value: string) => ({ startup: { profiling: { [setting]: value } } })],
    ])('under %s', (prefix, build) => {
      it.each([min, max])('accepts %s', (value) => {
        expect(() => validate(build(value))).not.toThrow();
      });

      it.each([
        [belowMin, `Value must be equal to or greater than [${minIso}]`],
        [aboveMax, `Value must be equal to or less than [${maxIso}]`],
      ])('rejects %s', (value, message) => {
        expect(() => validate(build(value))).toThrow(
          `[eventLoopWatchdog.${prefix}.${setting}]: ${message}`
        );
      });
    });
  });

  // No check between startAfter and blockThreshold: every valid blockThreshold stays valid.
  it('accepts a startAfter below the blockThreshold', () => {
    expect(() =>
      validate({
        blockThreshold: '60s',
        profiling: { startAfter: '2s' },
        startup: { blockThreshold: '60s', profiling: { startAfter: '2s' } },
      })
    ).not.toThrow();
  });

  it('leaves unset startup.profiling settings undefined', () => {
    const config = validate({ startup: { profiling: { startAfter: '45s' } } });
    expect(config.startup.profiling.startAfter?.asSeconds()).toBe(45);
    expect(config.startup.profiling.maxDuration).toBeUndefined();
    expect(config.startup.profiling.cooldown).toBeUndefined();
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
});
