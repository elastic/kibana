/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

jest.mock('./setup_logging');

import { LegacyLoggingServer, LogRecord } from './legacy_logging_server';

test('correctly forwards log records.', () => {
  const loggingServer = new LegacyLoggingServer({ events: {} });
  const onLogMock = jest.fn();
  loggingServer.events.on('log', onLogMock);

  const timestamp = 1554433221100;
  const firstLogRecord: LogRecord = {
    timestamp: new Date(timestamp),
    pid: 5355,
    level: {
      id: 'info',
      value: 5,
    },
    context: 'some-context',
    message: 'some-message',
  };

  const secondLogRecord: LogRecord = {
    timestamp: new Date(timestamp),
    pid: 5355,
    level: {
      id: 'error',
      value: 3,
    },
    context: 'some-context.sub-context',
    message: 'some-message',
    meta: { unknown: 2 },
    error: new Error('some-error'),
  };

  const thirdLogRecord: LogRecord = {
    timestamp: new Date(timestamp),
    pid: 5355,
    level: {
      id: 'trace',
      value: 7,
    },
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
