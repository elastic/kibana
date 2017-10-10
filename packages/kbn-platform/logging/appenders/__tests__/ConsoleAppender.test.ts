import * as mockSchema from '../../../lib/schema';

const mockCreateLayoutConfigSchema = jest.fn();
jest.mock('../../layouts/Layouts', () => ({
  Layouts: { createConfigSchema: mockCreateLayoutConfigSchema }
}));

import { LogLevel } from '../../LogLevel';
import { LogRecord } from '../../LogRecord';
import { ConsoleAppender } from '../console/ConsoleAppender';

beforeEach(() => {
  mockCreateLayoutConfigSchema.mockReset();
});

test('`createConfigSchema()` creates correct schema.', () => {
  mockCreateLayoutConfigSchema.mockReturnValue(
    mockSchema.object({
      kind: mockSchema.literal('mock')
    })
  );

  const appenderSchema = ConsoleAppender.createConfigSchema(mockSchema);
  const validConfig = { kind: 'console', layout: { kind: 'mock' } };
  expect(appenderSchema.validate(validConfig)).toEqual({
    kind: 'console',
    layout: { kind: 'mock' }
  });

  const wrongConfig1 = { kind: 'not-console', layout: { kind: 'mock' } };
  expect(() => appenderSchema.validate(wrongConfig1)).toThrow();

  const wrongConfig2 = { kind: 'file', layout: { kind: 'mock' }, path: 'path' };
  expect(() => appenderSchema.validate(wrongConfig2)).toThrow();
});

test('`append()` correctly formats records and pushes them to console.', () => {
  jest.spyOn(global.console, 'log').mockImplementation(() => {});

  const records: LogRecord[] = [
    {
      timestamp: new Date(),
      message: 'message-1',
      context: 'context-1',
      level: LogLevel.All
    },
    {
      timestamp: new Date(),
      message: 'message-2',
      context: 'context-2',
      level: LogLevel.Trace
    },
    {
      timestamp: new Date(),
      message: 'message-3',
      context: 'context-3',
      error: new Error('Error'),
      level: LogLevel.Fatal
    }
  ];

  const appender = new ConsoleAppender({
    format(record) {
      return `mock-${JSON.stringify(record)}`;
    }
  });

  for (const record of records) {
    appender.append(record);
    expect(console.log).toHaveBeenCalledWith(`mock-${JSON.stringify(record)}`);
  }

  expect(console.log).toHaveBeenCalledTimes(records.length);
});
