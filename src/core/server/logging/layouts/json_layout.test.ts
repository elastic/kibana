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
    timestamp: new Date(Date.UTC(2012, 1, 1)),
  },
  {
    context: 'context-2',
    level: LogLevel.Error,
    message: 'message-2',
    timestamp: new Date(Date.UTC(2012, 1, 1)),
  },
  {
    context: 'context-3',
    level: LogLevel.Warn,
    message: 'message-3',
    timestamp: new Date(Date.UTC(2012, 1, 1)),
  },
  {
    context: 'context-4',
    level: LogLevel.Debug,
    message: 'message-4',
    timestamp: new Date(Date.UTC(2012, 1, 1)),
  },
  {
    context: 'context-5',
    level: LogLevel.Info,
    message: 'message-5',
    timestamp: new Date(Date.UTC(2012, 1, 1)),
  },
  {
    context: 'context-6',
    level: LogLevel.Trace,
    message: 'message-6',
    timestamp: new Date(Date.UTC(2012, 1, 1)),
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
