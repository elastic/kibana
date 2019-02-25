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

import { LogLevel } from '../../log_level';
import { LogRecord } from '../../log_record';
import { BufferAppender } from './buffer_appender';

test('`flush()` does not return any record buffered at the beginning.', () => {
  const appender = new BufferAppender();

  expect(appender.flush()).toHaveLength(0);
});

test('`flush()` returns all appended records and cleans internal buffer.', () => {
  const records: LogRecord[] = [
    {
      context: 'context-1',
      level: LogLevel.All,
      message: 'message-1',
      timestamp: new Date(),
    },
    {
      context: 'context-2',
      level: LogLevel.Trace,
      message: 'message-2',
      timestamp: new Date(),
    },
  ];

  const appender = new BufferAppender();

  for (const record of records) {
    appender.append(record);
  }

  const flushedRecords = appender.flush();
  for (const record of records) {
    expect(flushedRecords).toContainEqual(record);
  }
  expect(flushedRecords).toHaveLength(records.length);
  expect(appender.flush()).toHaveLength(0);
});

test('`dispose()` flushes internal buffer.', async () => {
  const appender = new BufferAppender();
  appender.append({
    context: 'context-1',
    level: LogLevel.All,
    message: 'message-1',
    timestamp: new Date(),
  });

  await appender.dispose();

  expect(appender.flush()).toHaveLength(0);
});
