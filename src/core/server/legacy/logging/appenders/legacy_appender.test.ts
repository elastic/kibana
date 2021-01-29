/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

jest.mock('@kbn/legacy-logging');

import { LogRecord, LogLevel } from '../../../logging';
import { LegacyLoggingServer } from '@kbn/legacy-logging';
import { LegacyAppender } from './legacy_appender';

afterEach(() => (LegacyLoggingServer as any).mockClear());

test('`configSchema` creates correct schema.', () => {
  const appenderSchema = LegacyAppender.configSchema;
  const validConfig = { kind: 'legacy-appender', legacyLoggingConfig: { verbose: true } };
  expect(appenderSchema.validate(validConfig)).toEqual({
    kind: 'legacy-appender',
    legacyLoggingConfig: { verbose: true },
  });

  const wrongConfig = { kind: 'not-legacy-appender' };
  expect(() => appenderSchema.validate(wrongConfig)).toThrow();
});

test('`append()` correctly pushes records to legacy platform.', () => {
  const timestamp = new Date(Date.UTC(2012, 1, 1, 11, 22, 33, 44));
  const records: LogRecord[] = [
    {
      context: 'context-1',
      level: LogLevel.Trace,
      message: 'message-1',
      timestamp,
      pid: 5355,
    },
    {
      context: 'context-2',
      level: LogLevel.Debug,
      message: 'message-2',
      timestamp,
      pid: 5355,
    },
    {
      context: 'context-3.sub-context-3',
      level: LogLevel.Info,
      message: 'message-3',
      timestamp,
      pid: 5355,
    },
    {
      context: 'context-4.sub-context-4',
      level: LogLevel.Warn,
      message: 'message-4',
      timestamp,
      pid: 5355,
    },
    {
      context: 'context-5',
      error: new Error('Some Error'),
      level: LogLevel.Error,
      message: 'message-5-with-error',
      timestamp,
      pid: 5355,
    },
    {
      context: 'context-6',
      level: LogLevel.Error,
      message: 'message-6-with-message',
      timestamp,
      pid: 5355,
    },
    {
      context: 'context-7.sub-context-7.sub-sub-context-7',
      error: new Error('Some Fatal Error'),
      level: LogLevel.Fatal,
      message: 'message-7-with-error',
      timestamp,
      pid: 5355,
    },
    {
      context: 'context-8.sub-context-8.sub-sub-context-8',
      level: LogLevel.Fatal,
      message: 'message-8-with-message',
      timestamp,
      pid: 5355,
    },
    {
      context: 'context-9.sub-context-9',
      level: LogLevel.Info,
      message: 'message-9-with-message',
      timestamp,
      pid: 5355,
      meta: { someValue: 3 },
    },
    {
      context: 'context-10.sub-context-10',
      level: LogLevel.Info,
      message: 'message-10-with-message',
      timestamp,
      pid: 5355,
      meta: { tags: ['tag1', 'tag2'] },
    },
  ];

  const appender = new LegacyAppender({ verbose: true });
  for (const record of records) {
    appender.append(record);
  }

  const [mockLegacyLoggingServerInstance] = (LegacyLoggingServer as any).mock.instances;
  expect(mockLegacyLoggingServerInstance.log.mock.calls).toHaveLength(records.length);
  records.forEach((r, idx) => {
    expect(mockLegacyLoggingServerInstance.log.mock.calls[idx][0]).toMatchSnapshot({
      pid: expect.any(Number),
    });
  });
});

test('legacy logging server is correctly created and disposed.', async () => {
  const mockRawLegacyLoggingConfig = { verbose: true };
  const appender = new LegacyAppender(mockRawLegacyLoggingConfig);

  expect(LegacyLoggingServer).toHaveBeenCalledTimes(1);
  expect(LegacyLoggingServer).toHaveBeenCalledWith(mockRawLegacyLoggingConfig);

  const [mockLegacyLoggingServerInstance] = (LegacyLoggingServer as any).mock.instances;
  expect(mockLegacyLoggingServerInstance.stop).not.toHaveBeenCalled();

  await appender.dispose();

  expect(mockLegacyLoggingServerInstance.stop).toHaveBeenCalledTimes(1);
});
