import * as mockSchema from '../../../lib/schema';

import { LogLevel } from '../../LogLevel';
import { LogRecord } from '../../LogRecord';
import { PatternLayout } from '../PatternLayout';

const records: LogRecord[] = [
  {
    timestamp: new Date(),
    message: 'message-1',
    context: 'context-1',
    error: new Error('Error'),
    level: LogLevel.Fatal
  },
  {
    timestamp: new Date(),
    message: 'message-2',
    context: 'context-2',
    level: LogLevel.Error
  },
  {
    timestamp: new Date(),
    message: 'message-3',
    context: 'context-3',
    level: LogLevel.Warn
  },
  {
    timestamp: new Date(),
    message: 'message-4',
    context: 'context-4',
    level: LogLevel.Debug
  },
  {
    timestamp: new Date(),
    message: 'message-5',
    context: 'context-5',
    level: LogLevel.Info
  },
  {
    timestamp: new Date(),
    message: 'message-6',
    context: 'context-6',
    level: LogLevel.Trace
  }
];

test('`createConfigSchema()` creates correct schema.', () => {
  const layoutSchema = PatternLayout.createConfigSchema(mockSchema);

  const validConfigWithDefaults = { kind: 'pattern' };
  expect(layoutSchema.validate(validConfigWithDefaults)).toEqual({
    kind: 'pattern',
    pattern: '[{timestamp}][{level}][{context}] {message}',
    highlight: false
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
  const layoutSchema = PatternLayout.createConfigSchema(mockSchema);
  const layout = new PatternLayout(layoutSchema.validate({ kind: 'pattern' }));

  for (const record of records) {
    const { timestamp, level, context, message } = record;
    const formattedLevel = level.id.toUpperCase().padEnd(5);

    expect(layout.format(record)).toBe(
      `[${timestamp.toISOString()}][${formattedLevel}][${context}] ${message}`
    );
  }
});

test('`format()` correctly formats record with custom pattern.', () => {
  const layoutSchema = PatternLayout.createConfigSchema(mockSchema);
  const layout = new PatternLayout(
    layoutSchema.validate({
      kind: 'pattern',
      pattern: 'mock-{message}-{context}-{message}'
    })
  );

  for (const record of records) {
    const { context, message } = record;
    expect(layout.format(record)).toBe(`mock-${message}-${context}-${message}`);
  }
});

test('`format()` correctly formats record with highlighting.', () => {
  const layoutSchema = PatternLayout.createConfigSchema(mockSchema);
  const layout = new PatternLayout(
    layoutSchema.validate({
      kind: 'pattern',
      highlight: true
    })
  );

  const levelColors = new Map([
    [LogLevel.Fatal, '31'],
    [LogLevel.Error, '31'],
    [LogLevel.Warn, '33'],
    [LogLevel.Debug, '32'],
    [LogLevel.Trace, '34']
  ]);

  for (const record of records) {
    const { timestamp, level, context, message } = record;

    let highlightedLevel = level.id.toUpperCase().padEnd(5);
    if (levelColors.has(level)) {
      highlightedLevel = `\x1b[${levelColors.get(
        level
      )}m${highlightedLevel}\x1b[0m`;
    }

    const highlightedContext = `\x1b[35m${context}\x1b[0m`;

    expect(layout.format(record)).toBe(
      `[${timestamp.toISOString()}][${highlightedLevel}][${highlightedContext}] ${message}`
    );
  }
});
