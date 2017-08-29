import * as mockSchema from '../../../lib/schema';

import { LogLevel } from '../../LogLevel';
import { LogRecord } from '../../LogRecord';
import { PatternLayout } from '../PatternLayout';

const records: LogRecord[] = [
  {
    timestamp: new Date(Date.UTC(2012, 1, 1)),
    message: 'message-1',
    context: 'context-1',
    error: {
      message: 'Some error message',
      name: 'Some error name',
      stack: 'Some error stack'
    },
    level: LogLevel.Fatal
  },
  {
    timestamp: new Date(Date.UTC(2012, 1, 1)),
    message: 'message-2',
    context: 'context-2',
    level: LogLevel.Error
  },
  {
    timestamp: new Date(Date.UTC(2012, 1, 1)),
    message: 'message-3',
    context: 'context-3',
    level: LogLevel.Warn
  },
  {
    timestamp: new Date(Date.UTC(2012, 1, 1)),
    message: 'message-4',
    context: 'context-4',
    level: LogLevel.Debug
  },
  {
    timestamp: new Date(Date.UTC(2012, 1, 1)),
    message: 'message-5',
    context: 'context-5',
    level: LogLevel.Info
  },
  {
    timestamp: new Date(Date.UTC(2012, 1, 1)),
    message: 'message-6',
    context: 'context-6',
    level: LogLevel.Trace
  }
];

test('`createConfigSchema()` creates correct schema.', () => {
  const layoutSchema = PatternLayout.createConfigSchema(mockSchema);

  const validConfigWithOptional = { kind: 'pattern' };
  expect(layoutSchema.validate(validConfigWithOptional)).toEqual({
    kind: 'pattern',
    pattern: undefined,
    highlight: undefined
  });

  const validConfig = {
    kind: 'pattern',
    pattern: '{message}',
    highlight: true
  };
  expect(layoutSchema.validate(validConfig)).toEqual({
    kind: 'pattern',
    pattern: '{message}',
    highlight: true
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
