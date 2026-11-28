/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EcsVersion } from '@elastic/ecs';
import type { LogRecord } from '@kbn/logging';
import { LogLevel } from '@kbn/logging';
import { toEcsLog } from './json_log';

const createDateWithOffset = (utcMs: number, timezoneOffsetMinutes: number): Date => {
  const date = new Date(utcMs);
  const shifted = new Date(utcMs - timezoneOffsetMinutes * 60_000);
  Object.defineProperties(date, {
    getTimezoneOffset: { value: () => timezoneOffsetMinutes },
    getFullYear: { value: () => shifted.getUTCFullYear() },
    getMonth: { value: () => shifted.getUTCMonth() },
    getDate: { value: () => shifted.getUTCDate() },
    getHours: { value: () => shifted.getUTCHours() },
    getMinutes: { value: () => shifted.getUTCMinutes() },
    getSeconds: { value: () => shifted.getUTCSeconds() },
    getMilliseconds: { value: () => shifted.getUTCMilliseconds() },
  });
  return date;
};

const record: LogRecord = {
  context: 'context-1',
  level: LogLevel.Warn,
  message: 'message-1',
  timestamp: new Date(Date.UTC(2012, 1, 1, 14, 30, 22, 11)),
  pid: 5355,
};

describe('toEcsLog', () => {
  it('uses the provided uptime and the ECS version', () => {
    const output = toEcsLog(record, 42);

    expect(output.process).toEqual({ pid: 5355, uptime: 42 });
    expect(output.ecs).toEqual({ version: EcsVersion });
    expect(output.log).toEqual({ level: 'WARN', logger: 'context-1' });
  });

  it('merges meta without letting it override record fields', () => {
    const output = toEcsLog(
      {
        ...record,
        meta: {
          '@timestamp': 'overridden',
          message: 'overridden',
          kibana: { foo: 'bar' },
        } as LogRecord['meta'],
      },
      1
    );

    expect(output.message).toBe('message-1');
    expect(output['@timestamp']).not.toBe('overridden');
    expect(output).toHaveProperty('kibana', { foo: 'bar' });
  });

  it('serializes the record error', () => {
    const output = toEcsLog(
      {
        ...record,
        error: { message: 'boom', name: 'TypeError', stack: 'stack' },
      },
      1
    );

    expect(output.error).toEqual({ message: 'boom', type: 'TypeError', stack_trace: 'stack' });
  });

  describe('@timestamp formatting', () => {
    test.each([
      ['UTC (+00:00)', Date.UTC(2012, 1, 1, 14, 30, 22, 11), 0, '2012-02-01T14:30:22.011+00:00'],
      ['EST (-05:00)', Date.UTC(2012, 1, 1, 14, 30, 22, 11), 300, '2012-02-01T09:30:22.011-05:00'],
      ['EDT (-04:00)', Date.UTC(2012, 6, 15, 14, 30, 22, 11), 240, '2012-07-15T10:30:22.011-04:00'],
      ['GST (+04:00)', Date.UTC(2012, 1, 1, 14, 30, 22, 11), -240, '2012-02-01T18:30:22.011+04:00'],
      ['IST (+05:30)', Date.UTC(2012, 1, 1, 14, 30, 22, 11), -330, '2012-02-01T20:00:22.011+05:30'],
      ['NST (-03:30)', Date.UTC(2012, 1, 1, 14, 30, 22, 11), 210, '2012-02-01T11:00:22.011-03:30'],
      ['NPT (+05:45)', Date.UTC(2012, 1, 1, 14, 30, 22, 11), -345, '2012-02-01T20:15:22.011+05:45'],
      [
        'midnight rollover & single-digit padding',
        Date.UTC(2026, 0, 1, 2, 3, 4, 5),
        300,
        '2025-12-31T21:03:04.005-05:00',
      ],
      ['zero milliseconds', Date.UTC(2026, 0, 1, 0, 0, 0, 0), 0, '2026-01-01T00:00:00.000+00:00'],
      [
        'end of year max values',
        Date.UTC(2026, 11, 31, 23, 59, 59, 999),
        0,
        '2026-12-31T23:59:59.999+00:00',
      ],
      [
        'year < 1000 zero-padded',
        Date.parse('0005-03-04T05:06:07.008Z'),
        0,
        '0005-03-04T05:06:07.008+00:00',
      ],
    ])('formats %s', (_label, utcMs, offsetMinutes, expected) => {
      const timestamp = createDateWithOffset(utcMs, offsetMinutes);
      const output = toEcsLog({ ...record, timestamp }, 1);
      expect(output['@timestamp']).toBe(expected);
    });

    it('formats invalid Date as "Invalid date"', () => {
      const output = toEcsLog({ ...record, timestamp: new Date(NaN) }, 1);
      expect(output['@timestamp']).toBe('Invalid date');
    });

    it('formats an unmocked local Date as a valid round-trippable ISO-8601 timestamp with offset', () => {
      const timestamp = new Date(Date.UTC(2012, 1, 1, 14, 30, 22, 11));
      const output = toEcsLog({ ...record, timestamp }, 1);
      const formatted = output['@timestamp'];

      expect(formatted).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}[+-]\d{2}:\d{2}$/);
      expect(Date.parse(String(formatted))).toBe(timestamp.getTime());
    });
  });
});
