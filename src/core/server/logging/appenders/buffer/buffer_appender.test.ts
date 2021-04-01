/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { LogLevel, LogRecord } from '@kbn/logging';
import { BufferAppender } from './buffer_appender';

test('`flush()` does not return any record buffered at the beginning.', () => {
  const appender = new BufferAppender();

  expect(appender.flush()).toHaveLength(0);
});

test('`flush()` returns all appended records and cleans internal buffer.', () => {
  const records: LogRecord[] = [
    {
      context: 'context-1',
      level: LogLevel.All,
      message: 'message-1',
      timestamp: new Date(),
      pid: 5355,
    },
    {
      context: 'context-2',
      level: LogLevel.Trace,
      message: 'message-2',
      timestamp: new Date(),
      pid: 5355,
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
    context: 'context-1',
    level: LogLevel.All,
    message: 'message-1',
    timestamp: new Date(),
    pid: 5355,
  });

  await appender.dispose();

  expect(appender.flush()).toHaveLength(0);
});
