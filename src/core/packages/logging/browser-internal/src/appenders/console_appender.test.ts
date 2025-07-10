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

const levels = [
  LogLevel.Trace,
  LogLevel.Debug,
  LogLevel.Info,
  LogLevel.Warn,
  LogLevel.Error,
  LogLevel.Fatal,
  LogLevel.All,
];

const levelsToMethods = new Map<LogLevel, keyof typeof unsafeConsole>([
  [LogLevel.Trace, 'trace'],
  [LogLevel.Debug, 'debug'],
  [LogLevel.Info, 'info'],
  [LogLevel.Warn, 'warn'],
  [LogLevel.Error, 'error'],
  [LogLevel.Fatal, 'error'],
  [LogLevel.All, 'log'],
]);

describe.each(levels)('`append()` correctly logs %p level.', (level) => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('`append()` correctly formats records and pushes them to console.', () => {
    const method = levelsToMethods.get(level)!;
    jest.spyOn(unsafeConsole, method).mockImplementation(() => {
      // noop
    });

    const records: LogRecord[] = [
      {
        context: 'context-1',
        level,
        message: 'message-1',
        timestamp: new Date(),
        pid: 5355,
      },
      {
        context: 'context-2',
        level,
        message: 'message-2',
        timestamp: new Date(),
        pid: 5355,
      },
      {
        context: 'context-3',
        error: new Error('Error'),
        level,
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
      expect(unsafeConsole[method]).toHaveBeenCalledWith(`mock-${JSON.stringify(record)}`);
    }
    expect(unsafeConsole[method]).toHaveBeenCalledTimes(records.length);
  });
});
