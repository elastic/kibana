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

import { LogLevel } from '../log_level';
import { LogRecord } from '../log_record';
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
];

test('`createConfigSchema()` creates correct schema.', () => {
  const layoutSchema = JsonLayout.configSchema;

  expect(layoutSchema.validate({ kind: 'json' })).toEqual({ kind: 'json' });
});

test('`format()` correctly formats record.', () => {
  const layout = new JsonLayout();

  for (const record of records) {
    expect(layout.format(record)).toMatchSnapshot();
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
          from: 'v7',
          to: 'v8',
        },
      })
    )
  ).toStrictEqual({
    '@timestamp': '2012-02-01T09:30:22.011-05:00',
    context: 'context-with-meta',
    level: 'DEBUG',
    message: 'message-with-meta',
    meta: {
      from: 'v7',
      to: 'v8',
    },
    pid: 5355,
  });
});

test('`format()` correctly formats error record with meta-data', () => {
  const layout = new JsonLayout();

  expect(
    JSON.parse(
      layout.format({
        context: 'error-with-meta',
        level: LogLevel.Debug,
        error: {
          message: 'Some error message',
          name: 'Some error name',
          stack: 'Some error stack',
        },
        message: 'Some error message',
        timestamp,
        pid: 5355,
        meta: {
          from: 'v7',
          to: 'v8',
        },
      })
    )
  ).toStrictEqual({
    '@timestamp': '2012-02-01T09:30:22.011-05:00',
    context: 'error-with-meta',
    level: 'DEBUG',
    error: {
      message: 'Some error message',
      name: 'Some error name',
      stack: 'Some error stack',
    },
    message: 'Some error message',
    meta: {
      from: 'v7',
      to: 'v8',
    },
    pid: 5355,
  });
});
