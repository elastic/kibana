/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

jest.mock('../../layouts/layouts', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { schema } = require('@kbn/config-schema');
  return {
    Layouts: {
      configSchema: schema.object({
        kind: schema.literal('mock'),
      }),
    },
  };
});

import { LogRecord, LogLevel } from '@kbn/logging';
import { ConsoleAppender } from './console_appender';

test('`configSchema` creates correct schema.', () => {
  const appenderSchema = ConsoleAppender.configSchema;
  const validConfig = { kind: 'console', layout: { kind: 'mock' } };
  expect(appenderSchema.validate(validConfig)).toEqual({
    kind: 'console',
    layout: { kind: 'mock' },
  });

  const wrongConfig1 = { kind: 'not-console', layout: { kind: 'mock' } };
  expect(() => appenderSchema.validate(wrongConfig1)).toThrow();

  const wrongConfig2 = { kind: 'file', layout: { kind: 'mock' }, path: 'path' };
  expect(() => appenderSchema.validate(wrongConfig2)).toThrow();
});

test('`append()` correctly formats records and pushes them to console.', () => {
  jest.spyOn(global.console, 'log').mockImplementation(() => {
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
    // eslint-disable-next-line no-console
    expect(console.log).toHaveBeenCalledWith(`mock-${JSON.stringify(record)}`);
  }

  // eslint-disable-next-line no-console
  expect(console.log).toHaveBeenCalledTimes(records.length);
});
