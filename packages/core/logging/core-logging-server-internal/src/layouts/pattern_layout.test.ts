/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { LogLevel, LogRecord } from '@kbn/logging';
import { stripAnsiSnapshotSerializer } from '../../../test_helpers/strip_ansi_snapshot_serializer';
import { PatternLayout, patternSchema } from './pattern_layout';

const timestamp = new Date(Date.UTC(2012, 1, 1, 14, 30, 22, 11));
const records: LogRecord[] = [
  {
    context: 'context-1',
    error: {
      message: 'Some error message',
      name: 'Some error name',
      stack: 'Some error stack',
    },
    level: LogLevel.Fatal,
    message: 'message-1',
    timestamp,
    pid: 5355,
  },
  {
    context: 'context-2',
    level: LogLevel.Error,
    message: 'message-2',
    timestamp,
    pid: 5355,
  },
  {
    context: 'context-3',
    level: LogLevel.Warn,
    message: 'message-3',
    timestamp,
    pid: 5355,
  },
  {
    context: 'context-4',
    level: LogLevel.Debug,
    message: 'message-4',
    timestamp,
    pid: 5355,
  },
  {
    context: 'context-5',
    level: LogLevel.Info,
    message: 'message-5',
    timestamp,
    pid: 5355,
  },
  {
    context: 'context-6',
    level: LogLevel.Trace,
    message: 'message-6',
    timestamp,
    pid: 5355,
  },
];

expect.addSnapshotSerializer(stripAnsiSnapshotSerializer);

test('`createConfigSchema()` creates correct schema.', () => {
  const layoutSchema = PatternLayout.configSchema;

  const validConfigWithOptional = { type: 'pattern' };
  expect(layoutSchema.validate(validConfigWithOptional)).toEqual({
    highlight: undefined,
    type: 'pattern',
    pattern: undefined,
  });

  const validConfig = {
    highlight: true,
    type: 'pattern',
    pattern: '%message',
  };
  expect(layoutSchema.validate(validConfig)).toEqual({
    highlight: true,
    type: 'pattern',
    pattern: '%message',
  });

  const wrongConfig1 = { type: 'json' };
  expect(() => layoutSchema.validate(wrongConfig1)).toThrow();

  const wrongConfig2 = { type: 'pattern', pattern: 1 };
  expect(() => layoutSchema.validate(wrongConfig2)).toThrow();
});

test('`format()` correctly formats record with full pattern.', () => {
  const layout = new PatternLayout();

  for (const record of records) {
    expect(layout.format(record)).toMatchSnapshot();
  }
});

test('`format()` correctly formats record with custom pattern.', () => {
  const layout = new PatternLayout('mock-%message-%logger-%message');

  for (const record of records) {
    expect(layout.format(record)).toMatchSnapshot();
  }
});

test('`format()` correctly formats record with meta data.', () => {
  const layout = new PatternLayout('[%date][%level][%logger]%meta %message');

  expect(
    layout.format({
      context: 'context-meta',
      level: LogLevel.Debug,
      message: 'message-meta',
      timestamp,
      pid: 5355,
      meta: {
        // @ts-expect-error not valid ECS field
        from: 'v7',
        to: 'v8',
      },
    })
  ).toBe(
    '[2012-02-01T09:30:22.011-05:00][DEBUG][context-meta]{"from":"v7","to":"v8"} message-meta'
  );

  expect(
    layout.format({
      context: 'context-meta',
      level: LogLevel.Debug,
      message: 'message-meta',
      timestamp,
      pid: 5355,
      meta: {},
    })
  ).toBe('[2012-02-01T09:30:22.011-05:00][DEBUG][context-meta]{} message-meta');

  expect(
    layout.format({
      context: 'context-meta',
      level: LogLevel.Debug,
      message: 'message-meta',
      timestamp,
      pid: 5355,
    })
  ).toBe('[2012-02-01T09:30:22.011-05:00][DEBUG][context-meta] message-meta');
});

test('`format()` correctly formats record with highlighting.', () => {
  const layout = new PatternLayout(undefined, true);

  for (const record of records) {
    expect(layout.format(record)).toMatchSnapshot();
  }
});

test('allows specifying the PID in custom pattern', () => {
  const layout = new PatternLayout('%pid-%logger-%message');

  for (const record of records) {
    expect(layout.format(record)).toMatchSnapshot();
  }
});

test('`format()` allows specifying pattern with meta.', () => {
  const layout = new PatternLayout('%logger-%meta-%message');
  const record = {
    context: 'context',
    level: LogLevel.Debug,
    message: 'message',
    timestamp,
    pid: 5355,
    meta: {
      from: 'v7',
      to: 'v8',
    },
  };
  // @ts-expect-error not valid ECS field
  expect(layout.format(record)).toBe('context-{"from":"v7","to":"v8"}-message');
});

describe('format', () => {
  describe('timestamp', () => {
    const record = {
      context: 'context',
      level: LogLevel.Debug,
      message: 'message',
      timestamp,
      pid: 5355,
    };
    it('uses ISO8601_TZ as default', () => {
      const layout = new PatternLayout();

      expect(layout.format(record)).toBe('[2012-02-01T09:30:22.011-05:00][DEBUG][context] message');
    });

    describe('supports specifying a predefined format', () => {
      it('ISO8601', () => {
        const layout = new PatternLayout('[%date{ISO8601}][%logger]');

        expect(layout.format(record)).toBe('[2012-02-01T14:30:22.011Z][context]');
      });

      it('ISO8601_TZ', () => {
        const layout = new PatternLayout('[%date{ISO8601_TZ}][%logger]');

        expect(layout.format(record)).toBe('[2012-02-01T09:30:22.011-05:00][context]');
      });

      it('ABSOLUTE', () => {
        const layout = new PatternLayout('[%date{ABSOLUTE}][%logger]');

        expect(layout.format(record)).toBe('[09:30:22.011][context]');
      });

      it('UNIX', () => {
        const layout = new PatternLayout('[%date{UNIX}][%logger]');

        expect(layout.format(record)).toBe('[1328106622][context]');
      });

      it('UNIX_MILLIS', () => {
        const layout = new PatternLayout('[%date{UNIX_MILLIS}][%logger]');

        expect(layout.format(record)).toBe('[1328106622011][context]');
      });
    });

    describe('supports specifying a predefined format and timezone', () => {
      it('ISO8601', () => {
        const layout = new PatternLayout('[%date{ISO8601}{America/Los_Angeles}][%logger]');

        expect(layout.format(record)).toBe('[2012-02-01T14:30:22.011Z][context]');
      });

      it('ISO8601_TZ', () => {
        const layout = new PatternLayout('[%date{ISO8601_TZ}{America/Los_Angeles}][%logger]');

        expect(layout.format(record)).toBe('[2012-02-01T06:30:22.011-08:00][context]');
      });

      it('ABSOLUTE', () => {
        const layout = new PatternLayout('[%date{ABSOLUTE}{America/Los_Angeles}][%logger]');

        expect(layout.format(record)).toBe('[06:30:22.011][context]');
      });

      it('UNIX', () => {
        const layout = new PatternLayout('[%date{UNIX}{America/Los_Angeles}][%logger]');

        expect(layout.format(record)).toBe('[1328106622][context]');
      });

      it('UNIX_MILLIS', () => {
        const layout = new PatternLayout('[%date{UNIX_MILLIS}{America/Los_Angeles}][%logger]');

        expect(layout.format(record)).toBe('[1328106622011][context]');
      });
    });
    it('formats several conversions patterns correctly', () => {
      const layout = new PatternLayout(
        '[%date{ABSOLUTE}{America/Los_Angeles}][%logger][%date{UNIX}]'
      );

      expect(layout.format(record)).toBe('[06:30:22.011][context][1328106622]');
    });
  });
});

describe('schema', () => {
  describe('pattern', () => {
    describe('%date', () => {
      it('does not fail when %date not present', () => {
        expect(patternSchema.validate('')).toBe('');
        expect(patternSchema.validate('{pid}')).toBe('{pid}');
      });

      it('does not fail on %date without params', () => {
        expect(patternSchema.validate('%date')).toBe('%date');
        expect(patternSchema.validate('%date')).toBe('%date');
        expect(patternSchema.validate('{%date}')).toBe('{%date}');
        expect(patternSchema.validate('%date%date')).toBe('%date%date');
      });

      it('does not fail on %date with predefined date format', () => {
        expect(patternSchema.validate('%date{ISO8601}')).toBe('%date{ISO8601}');
      });

      it('does not fail on %date with predefined date format and valid timezone', () => {
        expect(patternSchema.validate('%date{ISO8601_TZ}{Europe/Berlin}')).toBe(
          '%date{ISO8601_TZ}{Europe/Berlin}'
        );
      });

      it('fails on %date with unknown date format', () => {
        expect(() => patternSchema.validate('%date{HH:MM:SS}')).toThrowErrorMatchingInlineSnapshot(
          `"Date format expected one of ISO8601, ISO8601_TZ, ABSOLUTE, UNIX, UNIX_MILLIS, but given: HH:MM:SS"`
        );
      });

      it('fails on %date with predefined date format and invalid timezone', () => {
        expect(() =>
          patternSchema.validate('%date{ISO8601_TZ}{Europe/Kibana}')
        ).toThrowErrorMatchingInlineSnapshot(`"Unknown timezone: Europe/Kibana"`);
      });

      it('validates several %date in pattern', () => {
        expect(() =>
          patternSchema.validate('%date{ISO8601_TZ}{Europe/Berlin}%message%date{HH}')
        ).toThrowErrorMatchingInlineSnapshot(
          `"Date format expected one of ISO8601, ISO8601_TZ, ABSOLUTE, UNIX, UNIX_MILLIS, but given: HH"`
        );
      });
    });
  });
});
