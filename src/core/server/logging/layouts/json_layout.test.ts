/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { LogLevel, LogRecord } from '@kbn/logging';
import { JsonLayout } from './json_layout';

const timestamp = new Date(Date.UTC(2012, 1, 1, 14, 30, 22, 11));
const records: LogRecord[] = [
  {
    context: 'context-1',
    error: {
      message: 'Some error message',
      name: 'Some error name',
      stack: 'Some error stack',
    },
    level: LogLevel.Fatal,
    message: 'message-1',
    timestamp,
    pid: 5355,
  },
  {
    context: 'context-2',
    level: LogLevel.Error,
    message: 'message-2',
    timestamp,
    pid: 5355,
  },
  {
    context: 'context-3',
    level: LogLevel.Warn,
    message: 'message-3',
    timestamp,
    pid: 5355,
  },
  {
    context: 'context-4',
    level: LogLevel.Debug,
    message: 'message-4',
    timestamp,
    pid: 5355,
  },
  {
    context: 'context-5',
    level: LogLevel.Info,
    message: 'message-5',
    timestamp,
    pid: 5355,
  },
  {
    context: 'context-6',
    level: LogLevel.Trace,
    message: 'message-6',
    timestamp,
    pid: 5355,
  },
  {
    context: 'context-7',
    level: LogLevel.Trace,
    message: 'message-6',
    timestamp,
    pid: 5355,
    spanId: 'spanId-1',
    traceId: 'traceId-1',
    transactionId: 'transactionId-1',
  },
];

test('`createConfigSchema()` creates correct schema.', () => {
  const layoutSchema = JsonLayout.configSchema;

  expect(layoutSchema.validate({ type: 'json' })).toEqual({ type: 'json' });
});

test('`format()` correctly formats record and includes correct ECS version.', () => {
  const layout = new JsonLayout();

  for (const record of records) {
    const { ecs, ...restOfRecord } = JSON.parse(layout.format(record));
    expect(ecs).toStrictEqual({ version: '8.0.0' });
    expect(restOfRecord).toMatchSnapshot();
  }
});

test('`format()` correctly formats record with meta-data', () => {
  const layout = new JsonLayout();

  expect(
    JSON.parse(
      layout.format({
        context: 'context-with-meta',
        level: LogLevel.Debug,
        message: 'message-with-meta',
        timestamp,
        pid: 5355,
        meta: {
          // @ts-expect-error ECS custom meta
          version: {
            from: 'v7',
            to: 'v8',
          },
        },
      })
    )
  ).toStrictEqual({
    ecs: { version: expect.any(String) },
    '@timestamp': '2012-02-01T09:30:22.011-05:00',
    log: {
      level: 'DEBUG',
      logger: 'context-with-meta',
    },
    message: 'message-with-meta',
    version: {
      from: 'v7',
      to: 'v8',
    },
    process: {
      pid: 5355,
    },
  });
});

test('`format()` correctly formats error record with meta-data', () => {
  const layout = new JsonLayout();

  expect(
    JSON.parse(
      layout.format({
        level: LogLevel.Debug,
        context: 'error-with-meta',
        error: {
          message: 'Some error message',
          name: 'Some error type',
          stack: 'Some error stack',
        },
        message: 'Some error message',
        timestamp,
        pid: 5355,
        meta: {
          // @ts-expect-error ECS custom meta
          version: {
            from: 'v7',
            to: 'v8',
          },
        },
      })
    )
  ).toStrictEqual({
    ecs: { version: expect.any(String) },
    '@timestamp': '2012-02-01T09:30:22.011-05:00',
    log: {
      level: 'DEBUG',
      logger: 'error-with-meta',
    },
    error: {
      message: 'Some error message',
      type: 'Some error type',
      stack_trace: 'Some error stack',
    },
    message: 'Some error message',
    version: {
      from: 'v7',
      to: 'v8',
    },
    process: {
      pid: 5355,
    },
  });
});

test('format() meta can merge override logs', () => {
  const layout = new JsonLayout();
  expect(
    JSON.parse(
      layout.format({
        timestamp,
        message: 'foo',
        level: LogLevel.Error,
        context: 'bar',
        pid: 3,
        meta: {
          log: {
            // @ts-expect-error ECS custom meta
            kbn_custom_field: 'hello',
          },
        },
      })
    )
  ).toStrictEqual({
    ecs: { version: expect.any(String) },
    '@timestamp': '2012-02-01T09:30:22.011-05:00',
    message: 'foo',
    log: {
      level: 'ERROR',
      logger: 'bar',
      kbn_custom_field: 'hello',
    },
    process: {
      pid: 3,
    },
  });
});

test('format() meta can not override message', () => {
  const layout = new JsonLayout();
  expect(
    JSON.parse(
      layout.format({
        message: 'foo',
        timestamp,
        level: LogLevel.Debug,
        context: 'bar',
        pid: 3,
        meta: {
          // @ts-expect-error cannot override message
          message: 'baz',
        },
      })
    )
  ).toStrictEqual({
    ecs: { version: expect.any(String) },
    '@timestamp': '2012-02-01T09:30:22.011-05:00',
    message: 'foo',
    log: {
      level: 'DEBUG',
      logger: 'bar',
    },
    process: {
      pid: 3,
    },
  });
});

test('format() meta can not override ecs version', () => {
  const layout = new JsonLayout();
  expect(
    JSON.parse(
      layout.format({
        message: 'foo',
        timestamp,
        level: LogLevel.Debug,
        context: 'bar',
        pid: 3,
        meta: {
          // @ts-expect-error cannot override ecs version
          ecs: 1,
        },
      })
    )
  ).toStrictEqual({
    ecs: { version: expect.any(String) },
    '@timestamp': '2012-02-01T09:30:22.011-05:00',
    message: 'foo',
    log: {
      level: 'DEBUG',
      logger: 'bar',
    },
    process: {
      pid: 3,
    },
  });
});

test('format() meta can not override logger or level', () => {
  const layout = new JsonLayout();
  expect(
    JSON.parse(
      layout.format({
        message: 'foo',
        timestamp,
        level: LogLevel.Debug,
        context: 'bar',
        pid: 3,
        meta: {
          log: {
            // @ts-expect-error cannot override log.level
            level: 'IGNORE',
            logger: 'me',
          },
        },
      })
    )
  ).toStrictEqual({
    ecs: { version: expect.any(String) },
    '@timestamp': '2012-02-01T09:30:22.011-05:00',
    message: 'foo',
    log: {
      level: 'DEBUG',
      logger: 'bar',
    },
    process: {
      pid: 3,
    },
  });
});

test('format() meta can not override timestamp', () => {
  const layout = new JsonLayout();
  expect(
    JSON.parse(
      layout.format({
        message: 'foo',
        timestamp,
        level: LogLevel.Debug,
        context: 'bar',
        pid: 3,
        meta: {
          // @ts-expect-error cannot override @timestamp
          '@timestamp': '2099-02-01T09:30:22.011-05:00',
        },
      })
    )
  ).toStrictEqual({
    ecs: { version: expect.any(String) },
    '@timestamp': '2012-02-01T09:30:22.011-05:00',
    message: 'foo',
    log: {
      level: 'DEBUG',
      logger: 'bar',
    },
    process: {
      pid: 3,
    },
  });
});

test('format() meta can not override tracing properties', () => {
  const layout = new JsonLayout();
  expect(
    JSON.parse(
      layout.format({
        message: 'foo',
        timestamp,
        level: LogLevel.Debug,
        context: 'bar',
        pid: 3,
        meta: {
          span: { id: 'span_override' },
          trace: { id: 'trace_override' },
          transaction: { id: 'transaction_override' },
        },
        spanId: 'spanId',
        traceId: 'traceId',
        transactionId: 'transactionId',
      })
    )
  ).toStrictEqual({
    ecs: { version: expect.any(String) },
    '@timestamp': '2012-02-01T09:30:22.011-05:00',
    message: 'foo',
    log: {
      level: 'DEBUG',
      logger: 'bar',
    },
    process: {
      pid: 3,
    },
    span: { id: 'span_override' },
    trace: { id: 'trace_override' },
    transaction: { id: 'transaction_override' },
  });
});
