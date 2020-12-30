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

import moment from 'moment-timezone';
import { merge } from '@kbn/std';
import { schema } from '@kbn/config-schema';
import { LogRecord, Layout } from '@kbn/logging';

const { literal, object } = schema;

const jsonLayoutSchema = object({
  kind: literal('json'),
});

/** @internal */
export interface JsonLayoutConfigType {
  kind: 'json';
}

/**
 * Layout that just converts `LogRecord` into JSON string.
 * @internal
 */
export class JsonLayout implements Layout {
  public static configSchema = jsonLayoutSchema;

  private static errorToSerializableObject(error: Error | undefined) {
    if (error === undefined) {
      return error;
    }

    return {
      message: error.message,
      type: error.name,
      stack_trace: error.stack,
    };
  }

  public format(record: LogRecord): string {
    const log = {
      '@timestamp': moment(record.timestamp).format('YYYY-MM-DDTHH:mm:ss.SSSZ'),
      message: record.message,
      error: JsonLayout.errorToSerializableObject(record.error),
      log: {
        level: record.level.id.toUpperCase(),
        logger: record.context,
      },
      process: {
        pid: record.pid,
      },
    };
    const output = record.meta ? merge(log, record.meta) : log;
    return JSON.stringify(output);
  }
}
