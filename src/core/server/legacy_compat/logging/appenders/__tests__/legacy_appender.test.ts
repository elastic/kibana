/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { LogLevel } from '../../../../logging/log_level';
import { LogRecord } from '../../../../logging/log_record';
import { LegacyKbnServer } from '../../../legacy_kbn_server';
import { LegacyAppender } from '../legacy_appender';

test('`configSchema` creates correct schema.', () => {
  const appenderSchema = LegacyAppender.configSchema;
  const validConfig = { kind: 'legacy-appender' };
  expect(appenderSchema.validate(validConfig)).toEqual({
    kind: 'legacy-appender',
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
    },
    {
      context: 'context-2',
      level: LogLevel.Debug,
      message: 'message-2',
      timestamp,
    },
    {
      context: 'context-3.sub-context-3',
      level: LogLevel.Info,
      message: 'message-3',
      timestamp,
    },
    {
      context: 'context-4.sub-context-4',
      level: LogLevel.Warn,
      message: 'message-4',
      timestamp,
    },
    {
      context: 'context-5',
      error: new Error('Some Error'),
      level: LogLevel.Error,
      message: 'message-5-with-error',
      timestamp,
    },
    {
      context: 'context-6',
      level: LogLevel.Error,
      message: 'message-6-with-message',
      timestamp,
    },
    {
      context: 'context-7.sub-context-7.sub-sub-context-7',
      error: new Error('Some Fatal Error'),
      level: LogLevel.Fatal,
      message: 'message-7-with-error',
      timestamp,
    },
    {
      context: 'context-8.sub-context-8.sub-sub-context-8',
      level: LogLevel.Fatal,
      message: 'message-8-with-message',
      timestamp,
    },
    {
      context: 'context-9.sub-context-9',
      level: LogLevel.Info,
      message: 'message-9-with-message',
      timestamp,
      meta: { someValue: 3 },
    },
    {
      context: 'context-10.sub-context-10',
      level: LogLevel.Info,
      message: 'message-10-with-message',
      timestamp,
      meta: { tags: ['tag1', 'tag2'] },
    },
  ];

  const rawKbnServerMock = {
    server: { log: jest.fn() },
  };
  const appender = new LegacyAppender(new LegacyKbnServer(rawKbnServerMock));

  for (const record of records) {
    appender.append(record);
  }

  expect(rawKbnServerMock.server.log.mock.calls).toMatchSnapshot();
});
