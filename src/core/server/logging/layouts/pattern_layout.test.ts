/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { stripAnsiSnapshotSerializer } from '../../../test_helpers/strip_ansi_snapshot_serializer';
import { LogLevel } from '../log_level';
import { LogRecord } from '../log_record';
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

  const validConfigWithOptional = { kind: 'pattern' };
  expect(layoutSchema.validate(validConfigWithOptional)).toEqual({
    highlight: undefined,
    kind: 'pattern',
    pattern: undefined,
  });

  const validConfig = {
    highlight: true,
    kind: 'pattern',
    pattern: '{message}',
  };
  expect(layoutSchema.validate(validConfig)).toEqual({
    highlight: true,
    kind: 'pattern',
    pattern: '{message}',
  });

  const wrongConfig1 = { kind: 'json' };
  expect(() => layoutSchema.validate(wrongConfig1)).toThrow();

  const wrongConfig2 = { kind: 'pattern', pattern: 1 };
  expect(() => layoutSchema.validate(wrongConfig2)).toThrow();
});

test('`format()` correctly formats record with full pattern.', () => {
  const layout = new PatternLayout();

  for (const record of records) {
    expect(layout.format(record)).toMatchSnapshot();
  }
});

test('`format()` correctly formats record with custom pattern.', () => {
  const layout = new PatternLayout('mock-{message}-{context}-{message}');

  for (const record of records) {
    expect(layout.format(record)).toMatchSnapshot();
  }
});

test('`format()` correctly formats record with meta data.', () => {
  const layout = new PatternLayout();

  expect(
    layout.format({
      context: 'context-meta',
      level: LogLevel.Debug,
      message: 'message-meta',
      timestamp,
      pid: 5355,
      meta: {
        from: 'v7',
        to: 'v8',
      },
    })
  ).toBe('[2012-02-01T14:30:22.011Z][DEBUG][context-meta][{"from":"v7","to":"v8"}] message-meta');

  expect(
    layout.format({
      context: 'context-meta',
      level: LogLevel.Debug,
      message: 'message-meta',
      timestamp,
      pid: 5355,
      meta: {},
    })
  ).toBe('[2012-02-01T14:30:22.011Z][DEBUG][context-meta][{}] message-meta');

  expect(
    layout.format({
      context: 'context-meta',
      level: LogLevel.Debug,
      message: 'message-meta',
      timestamp,
      pid: 5355,
    })
  ).toBe('[2012-02-01T14:30:22.011Z][DEBUG][context-meta] message-meta');
});

test('`format()` correctly formats record with highlighting.', () => {
  const layout = new PatternLayout(undefined, true);

  for (const record of records) {
    expect(layout.format(record)).toMatchSnapshot();
  }
});

test('allows specifying the PID in custom pattern', () => {
  const layout = new PatternLayout('{pid}-{context}-{message}');

  for (const record of records) {
    expect(layout.format(record)).toMatchSnapshot();
  }
});

test('`format()` allows specifying pattern with meta.', () => {
  const layout = new PatternLayout('{context}-{meta}-{message}');
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
  expect(layout.format(record)).toBe('context-[{"from":"v7","to":"v8"}]-message');
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
    it('uses ISO8601 as default', () => {
      const layout = new PatternLayout();

      expect(layout.format(record)).toBe('[2012-02-01T14:30:22.011Z][DEBUG][context] message');
    });

    describe('supports specifying a predefined format', () => {
      it('ISO8601', () => {
        const layout = new PatternLayout('[{timestamp{ISO8601}}][{context}]');

        expect(layout.format(record)).toBe('[2012-02-01T14:30:22.011Z][context]');
      });

      it('ISO8601_TZ', () => {
        const layout = new PatternLayout('[{timestamp{ISO8601_TZ}}][{context}]');

        expect(layout.format(record)).toBe('[2012-02-01T09:30:22.011-05:00][context]');
      });

      it('ABSOLUTE', () => {
        const layout = new PatternLayout('[{timestamp{ABSOLUTE}}][{context}]');

        expect(layout.format(record)).toBe('[09:30:22.011][context]');
      });

      it('UNIX', () => {
        const layout = new PatternLayout('[{timestamp{UNIX}}][{context}]');

        expect(layout.format(record)).toBe('[1328106622][context]');
      });

      it('UNIX_MILLIS', () => {
        const layout = new PatternLayout('[{timestamp{UNIX_MILLIS}}][{context}]');

        expect(layout.format(record)).toBe('[1328106622011][context]');
      });
    });

    describe('supports specifying a predefined format and timezone', () => {
      it('ISO8601', () => {
        const layout = new PatternLayout('[{timestamp{ISO8601}{America/Los_Angeles}}][{context}]');

        expect(layout.format(record)).toBe('[2012-02-01T14:30:22.011Z][context]');
      });

      it('ISO8601_TZ', () => {
        const layout = new PatternLayout(
          '[{timestamp{ISO8601_TZ}{America/Los_Angeles}}][{context}]'
        );

        expect(layout.format(record)).toBe('[2012-02-01T06:30:22.011-08:00][context]');
      });

      it('ABSOLUTE', () => {
        const layout = new PatternLayout('[{timestamp{ABSOLUTE}{America/Los_Angeles}}][{context}]');

        expect(layout.format(record)).toBe('[06:30:22.011][context]');
      });

      it('UNIX', () => {
        const layout = new PatternLayout('[{timestamp{UNIX}{America/Los_Angeles}}][{context}]');

        expect(layout.format(record)).toBe('[1328106622][context]');
      });

      it('UNIX_MILLIS', () => {
        const layout = new PatternLayout(
          '[{timestamp{UNIX_MILLIS}{America/Los_Angeles}}][{context}]'
        );

        expect(layout.format(record)).toBe('[1328106622011][context]');
      });
    });
    it('formats several conversions patterns correctly', () => {
      const layout = new PatternLayout(
        '[{timestamp{ABSOLUTE}{America/Los_Angeles}}][{context}][{timestamp{UNIX}}]'
      );

      expect(layout.format(record)).toBe('[06:30:22.011][context][1328106622]');
    });
  });
});

describe('schema', () => {
  describe('pattern', () => {
    describe('{timestamp}', () => {
      it('does not fail when {timestamp} not present', () => {
        expect(patternSchema.validate('')).toBe('');
        expect(patternSchema.validate('{pid}')).toBe('{pid}');
      });

      it('does not fail on {timestamp} without params', () => {
        expect(patternSchema.validate('{timestamp}')).toBe('{timestamp}');
        expect(patternSchema.validate('{timestamp}}')).toBe('{timestamp}}');
        expect(patternSchema.validate('{{timestamp}}')).toBe('{{timestamp}}');
      });

      it('does not fail on {timestamp} with predefined date format', () => {
        expect(patternSchema.validate('{timestamp{ISO8601}}')).toBe('{timestamp{ISO8601}}');
      });

      it('does not fail on {timestamp} with predefined date format and valid timezone', () => {
        expect(patternSchema.validate('{timestamp{ISO8601_TZ}{Europe/Berlin}}')).toBe(
          '{timestamp{ISO8601_TZ}{Europe/Berlin}}'
        );
      });

      it('fails on {timestamp} with unknown date format', () => {
        expect(() =>
          patternSchema.validate('{timestamp{HH:MM:SS}}')
        ).toThrowErrorMatchingInlineSnapshot(
          `"Date format expected one of ISO8601, ISO8601_TZ, ABSOLUTE, UNIX, UNIX_MILLIS, but given: HH:MM:SS"`
        );
      });

      it('fails on {timestamp} with predefined date format and invalid timezone', () => {
        expect(() =>
          patternSchema.validate('{timestamp{ISO8601_TZ}{Europe/Kibana}}')
        ).toThrowErrorMatchingInlineSnapshot(`"Unknown timezone: Europe/Kibana"`);
      });

      it('validates several {timestamp} in pattern', () => {
        expect(() =>
          patternSchema.validate('{timestamp{ISO8601_TZ}{Europe/Berlin}}{message}{timestamp{HH}}')
        ).toThrowErrorMatchingInlineSnapshot(
          `"Date format expected one of ISO8601, ISO8601_TZ, ABSOLUTE, UNIX, UNIX_MILLIS, but given: HH"`
        );
      });
    });
  });
});
