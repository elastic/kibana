/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { LogRecord, LogLevel } from '@kbn/logging';
import { unsafeConsole } from '@kbn/security-hardening';
import { ConsoleAppender } from './console_appender';

test('`append()` correctly formats records and pushes them to console.', () => {
  jest.spyOn(unsafeConsole, 'log').mockImplementation(() => {
    // noop
  });

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
    {
      context: 'context-3',
      error: new Error('Error'),
      level: LogLevel.Fatal,
      message: 'message-3',
      timestamp: new Date(),
      pid: 5355,
    },
  ];

  const appender = new ConsoleAppender({
    format(record) {
      return `mock-${JSON.stringify(record)}`;
    },
  });

  for (const record of records) {
    appender.append(record);
    expect(unsafeConsole.log).toHaveBeenCalledWith(`mock-${JSON.stringify(record)}`);
  }
  expect(unsafeConsole.log).toHaveBeenCalledTimes(records.length);
});
