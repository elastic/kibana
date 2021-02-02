/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
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
