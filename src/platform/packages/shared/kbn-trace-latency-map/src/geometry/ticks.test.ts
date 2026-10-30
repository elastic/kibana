/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { formatColumnTime, formatDuration, getDurationTicks } from './ticks';

describe('formatDuration', () => {
  it.each([
    [850, '850ns'],
    [850_000, '850µs'],
    [4_200_000, '4.2ms'],
    [1_500_000_000, '1.5s'],
    [138_000_000_000, '2.3min'],
    [1_000_000, '1ms'],
    [999_600, '1ms'],
    [999_600_000, '1s'],
    [59_996_000_000, '1min'],
    [999_000, '999µs'],
  ])('formats %s ns as %s', (ns, text) => expect(formatDuration(ns)).toBe(text));
});

describe('getDurationTicks', () => {
  const stats = { min: 120_000, p90: 0, p95: 0, p99: 90_000_000, max: 5_000_000_000, spans: 1 };

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

describe('formatColumnTime', () => {
  const from = Date.parse('2026-10-26T10:03:20.000Z');
  const MINUTE = 60_000;
  const DAY = 24 * 60 * MINUTE;

  it('reads hours and minutes for columns of minutes within a day', () => {
    expect(formatColumnTime(from, 30 * 1000 * 2, 30 * MINUTE, 'UTC')).toBe('10:03');
  });

  it('adds seconds when a column is under a minute', () => {
    expect(formatColumnTime(from, 15_000, 10 * MINUTE, 'UTC')).toBe('10:03:20');
  });

  it('adds the date for a range of days', () => {
    expect(formatColumnTime(from, 30 * MINUTE, 3 * DAY, 'UTC')).toBe('Oct 26 10:03');
  });

  it('reads only the date for columns of a day', () => {
    expect(formatColumnTime(from, DAY, 30 * DAY, 'UTC')).toBe('Oct 26');
  });

  it('shows the time of the time zone, not UTC', () => {
    expect(formatColumnTime(from, MINUTE, 30 * MINUTE, 'Asia/Kolkata')).toBe('15:33');
  });

  it('stays on local time when the clocks change in the range', () => {
    // Amsterdam sets its clocks back on 2026-10-25: 00:30 UTC is 02:30 CEST, 01:30 UTC is 02:30 CET.
    const before = Date.parse('2026-10-25T00:30:00Z');
    const after = Date.parse('2026-10-25T01:30:00Z');
    expect(formatColumnTime(before, 60 * MINUTE, 3 * DAY, 'Europe/Amsterdam')).toBe('Oct 25 02:30');
    expect(formatColumnTime(after, 60 * MINUTE, 3 * DAY, 'Europe/Amsterdam')).toBe('Oct 25 02:30');
  });
});
