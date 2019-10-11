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

jest.mock('../../../../legacy/server/config');
jest.mock('../../../../legacy/server/logging');

import { LogLevel } from '../../logging/log_level';
import { LegacyLoggingServer } from './legacy_logging_server';

test('correctly forwards log records.', () => {
  const loggingServer = new LegacyLoggingServer({ events: {} });
  const onLogMock = jest.fn();
  loggingServer.events.on('log', onLogMock);

  const timestamp = 1554433221100;
  const firstLogRecord = {
    timestamp: new Date(timestamp),
    level: LogLevel.Info,
    context: 'some-context',
    message: 'some-message',
  };

  const secondLogRecord = {
    timestamp: new Date(timestamp),
    level: LogLevel.Error,
    context: 'some-context.sub-context',
    message: 'some-message',
    meta: { unknown: 2 },
    error: new Error('some-error'),
  };

  const thirdLogRecord = {
    timestamp: new Date(timestamp),
    level: LogLevel.Trace,
    context: 'some-context.sub-context',
    message: 'some-message',
    meta: { tags: ['important', 'tags'], unknown: 2 },
  };

  loggingServer.log(firstLogRecord);
  loggingServer.log(secondLogRecord);
  loggingServer.log(thirdLogRecord);

  expect(onLogMock).toHaveBeenCalledTimes(3);

  const [[firstCall], [secondCall], [thirdCall]] = onLogMock.mock.calls;
  expect(firstCall).toMatchInlineSnapshot(`
Object {
  "data": "some-message",
  "tags": Array [
    "info",
    "some-context",
  ],
  "timestamp": 1554433221100,
}
`);

  expect(secondCall).toMatchInlineSnapshot(`
Object {
  "data": [Error: some-error],
  "tags": Array [
    "error",
    "some-context",
    "sub-context",
  ],
  "timestamp": 1554433221100,
}
`);

  expect(thirdCall).toMatchInlineSnapshot(`
Object {
  "data": Object {
    Symbol(log message with metadata): Object {
      "message": "some-message",
      "metadata": Object {
        "unknown": 2,
      },
    },
  },
  "tags": Array [
    "debug",
    "some-context",
    "sub-context",
    "important",
    "tags",
  ],
  "timestamp": 1554433221100,
}
`);
});
