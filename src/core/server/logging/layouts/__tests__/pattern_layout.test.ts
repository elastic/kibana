import { stripAnsiSnapshotSerializer } from '../../../../test_helpers/strip_ansi_snapshot_serializer';
import { LogLevel } from '../../log_level';
import { LogRecord } from '../../log_record';
import { PatternLayout } from '../pattern_layout';

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
    timestamp: new Date(Date.UTC(2012, 1, 1)),
  },
  {
    context: 'context-2',
    level: LogLevel.Error,
    message: 'message-2',
    timestamp: new Date(Date.UTC(2012, 1, 1)),
  },
  {
    context: 'context-3',
    level: LogLevel.Warn,
    message: 'message-3',
    timestamp: new Date(Date.UTC(2012, 1, 1)),
  },
  {
    context: 'context-4',
    level: LogLevel.Debug,
    message: 'message-4',
    timestamp: new Date(Date.UTC(2012, 1, 1)),
  },
  {
    context: 'context-5',
    level: LogLevel.Info,
    message: 'message-5',
    timestamp: new Date(Date.UTC(2012, 1, 1)),
  },
  {
    context: 'context-6',
    level: LogLevel.Trace,
    message: 'message-6',
    timestamp: new Date(Date.UTC(2012, 1, 1)),
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

test('`format()` correctly formats record with highlighting.', () => {
  const layout = new PatternLayout(undefined, true);

  for (const record of records) {
    expect(layout.format(record)).toMatchSnapshot();
  }
});
