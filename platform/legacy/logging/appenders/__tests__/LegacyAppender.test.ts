import * as mockSchema from '../../../../lib/schema';
import { LogLevel } from '../../../../logging/LogLevel';
import { LogRecord } from '../../../../logging/LogRecord';
import { LegacyKbnServer } from '../../../LegacyKbnServer';
import { LegacyAppender } from '../LegacyAppender';

test('`createConfigSchema()` creates correct schema.', () => {
  const appenderSchema = LegacyAppender.createConfigSchema(mockSchema);
  const validConfig = { kind: 'legacy-appender' };
  expect(appenderSchema.validate(validConfig)).toEqual({
    kind: 'legacy-appender'
  });

  const wrongConfig = { kind: 'not-legacy-appender' };
  expect(() => appenderSchema.validate(wrongConfig)).toThrow();
});

test('`append()` correctly pushes records to legacy platform.', () => {
  const timestamp = new Date(Date.UTC(2012, 1, 1, 11, 22, 33, 44));
  const records: LogRecord[] = [
    {
      timestamp,
      message: 'message-1',
      context: 'context-1',
      level: LogLevel.Trace
    },
    {
      timestamp,
      message: 'message-2',
      context: 'context-2',
      level: LogLevel.Debug
    },
    {
      timestamp,
      message: 'message-3',
      context: 'context-3.sub-context-3',
      level: LogLevel.Info
    },
    {
      timestamp,
      message: 'message-4',
      context: 'context-4.sub-context-4',
      level: LogLevel.Warn
    },
    {
      timestamp,
      message: 'message-5-with-error',
      context: 'context-5',
      error: new Error('Some Error'),
      level: LogLevel.Error
    },
    {
      timestamp,
      message: 'message-6-with-message',
      context: 'context-6',
      level: LogLevel.Error
    },
    {
      timestamp,
      message: 'message-7-with-error',
      context: 'context-7.sub-context-7.sub-sub-context-7',
      error: new Error('Some Fatal Error'),
      level: LogLevel.Fatal
    },
    {
      timestamp,
      message: 'message-8-with-message',
      context: 'context-8.sub-context-8.sub-sub-context-8',
      level: LogLevel.Fatal
    }
  ];

  const rawKbnServerMock = {
    server: { log: jest.fn() }
  };
  const appender = new LegacyAppender(new LegacyKbnServer(rawKbnServerMock));

  for (const record of records) {
    appender.append(record);
  }

  expect(rawKbnServerMock.server.log.mock.calls).toMatchSnapshot();
});
