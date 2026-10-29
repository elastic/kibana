/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import moment from 'moment-timezone';
import { formatDurationUs, getDurationTicks, getTimeTicks } from './ticks';

describe('formatDurationUs', () => {
  it.each([
    [850, '850µs'],
    [4200, '4.2ms'],
    [1_500_000, '1.5s'],
    [138_000_000, '2.3min'],
    [1000, '1ms'],
    [999.6, '1ms'],
    [999_600, '1s'],
    [59_996_000, '1min'],
    [999, '999µs'],
  ])('formats %s µs as %s', (us, text) => expect(formatDurationUs(us)).toBe(text));
});

describe('getDurationTicks', () => {
  const stats = { min: 120, p90: 0, p95: 0, p99: 90_000, max: 5_000_000, spans: 1 };

  it('ticks round durations between the fastest span and the p99, slow ones above', () => {
    const labels = getDurationTicks(stats, 0).map((tick) => tick.label);
    expect(labels).toEqual(['200µs', '500µs', '1ms', '2ms', '5ms', '10ms', '20ms', '50ms']);
  });

  it('drops ticks that crowd the one below', () => {
    const ticks = getDurationTicks(stats, 3);
    ticks.slice(1).forEach((tick, i) => expect(tick.row - ticks[i].row).toBeGreaterThanOrEqual(3));
    expect(ticks.length).toBeLessThan(8);
  });
});

describe('getTimeTicks', () => {
  const from = Date.parse('2026-10-26T10:03:20.000Z');

  it('ticks round times of the time zone', () => {
    const ticks = getTimeTicks(from, from + 15 * 60_000, 4, 'UTC');
    expect(ticks.map((tick) => tick.label)).toEqual(['10:05', '10:10', '10:15']);
  });

  it('rounds to local time, not UTC', () => {
    const ticks = getTimeTicks(from, from + 15 * 60_000, 4, 'Asia/Kolkata');
    expect(ticks[0].label).toBe('15:35');
  });

  it('adds the date to a range of days', () => {
    const ticks = getTimeTicks(from, from + 36 * 3_600_000, 6, 'UTC');
    expect(ticks[0].label).toMatch(/^Oct 26 \d\d:00$/);
  });

  it('takes whole weeks for a range longer than the usual steps, not a tick a day', () => {
    const year = 365 * 24 * 3_600_000;
    const ticks = getTimeTicks(from, from + year, 8, 'UTC');
    expect(ticks.length).toBeLessThanOrEqual(8);
    expect(ticks.length).toBeGreaterThan(2);
  });

  it('stays on round local times when the clocks change in the range', () => {
    // Amsterdam sets its clocks back on 2026-10-25: a day tick must stay at local midnight.
    const start = Date.parse('2026-10-23T12:00:00Z');
    const ticks = getTimeTicks(start, start + 5 * 86_400_000, 5, 'Europe/Amsterdam');
    expect(ticks.length).toBeGreaterThanOrEqual(4);
    ticks.forEach((tick) => {
      expect(moment.tz(tick.timestampMs, 'Europe/Amsterdam').format('HH:mm')).toBe('00:00');
    });
    // One tick a day, even across the 25 hours of the day the clocks change.
    const days = ticks.map((tick) => moment.tz(tick.timestampMs, 'Europe/Amsterdam').format('D'));
    expect(new Set(days).size).toBe(days.length);
  });

  it('puts every tick inside the range, in order', () => {
    const ticks = getTimeTicks(from, from + 15 * 60_000, 4, 'UTC');
    ticks.forEach((tick, i) => {
      expect(tick.timestampMs).toBeGreaterThanOrEqual(from);
      expect(tick.timestampMs).toBeLessThanOrEqual(from + 15 * 60_000);
      if (i) expect(tick.timestampMs).toBeGreaterThan(ticks[i - 1].timestampMs);
    });
  });
});
