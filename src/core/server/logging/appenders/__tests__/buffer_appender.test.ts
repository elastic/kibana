import { LogLevel } from '../../log_level';
import { LogRecord } from '../../log_record';
import { BufferAppender } from '../buffer/buffer_appender';

test('`flush()` does not return any record buffered at the beginning.', () => {
  const appender = new BufferAppender();

  expect(appender.flush()).toHaveLength(0);
});

test('`flush()` returns all appended records and cleans internal buffer.', () => {
  const records: LogRecord[] = [
    {
      timestamp: new Date(),
      message: 'message-1',
      context: 'context-1',
      level: LogLevel.All,
    },
    {
      timestamp: new Date(),
      message: 'message-2',
      context: 'context-2',
      level: LogLevel.Trace,
    },
  ];

  const appender = new BufferAppender();

  for (const record of records) {
    appender.append(record);
  }

  const flushedRecords = appender.flush();
  for (const record of records) {
    expect(flushedRecords).toContainEqual(record);
  }
  expect(flushedRecords).toHaveLength(records.length);
  expect(appender.flush()).toHaveLength(0);
});

test('`dispose()` flushes internal buffer.', async () => {
  const appender = new BufferAppender();
  appender.append({
    timestamp: new Date(),
    message: 'message-1',
    context: 'context-1',
    level: LogLevel.All,
  });

  await appender.dispose();

  expect(appender.flush()).toHaveLength(0);
});
