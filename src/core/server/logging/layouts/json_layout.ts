/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import moment from 'moment-timezone';
import { merge } from '@kbn/std';
import { schema } from '@kbn/config-schema';
import { Ecs, LogRecord, Layout } from '@kbn/logging';

const { literal, object } = schema;

const jsonLayoutSchema = object({
  type: literal('json'),
});

/** @internal */
export interface JsonLayoutConfigType {
  type: 'json';
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
    const spanId = record.meta?.span?.id ?? record.spanId;
    const traceId = record.meta?.trace?.id ?? record.traceId;
    const transactionId = record.meta?.transaction?.id ?? record.transactionId;

    const log: Ecs = {
      ecs: { version: '8.0.0' },
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
      span: spanId ? { id: spanId } : undefined,
      trace: traceId ? { id: traceId } : undefined,
      transaction: transactionId ? { id: transactionId } : undefined,
    };
    const output = record.meta ? merge({ ...record.meta }, log) : log;

    return JSON.stringify(output);
  }
}
