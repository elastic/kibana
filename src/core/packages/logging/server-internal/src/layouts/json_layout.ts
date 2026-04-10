/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import moment from 'moment-timezone';
import { merge } from '@kbn/std';
import { schema } from '@kbn/config-schema';
import { Ecs, EcsVersion } from '@elastic/ecs';
import { LogRecord, Layout } from '@kbn/logging';

const { literal, object } = schema;

const jsonLayoutSchema = object({
  type: literal('json'),
});

/**
 * Layout that just converts `LogRecord` into JSON string.
 * @internal
 */
export class JsonLayout implements Layout {
  public static configSchema = jsonLayoutSchema;

  public format(record: LogRecord): string {
    const spanId = record.meta?.span?.id ?? record.spanId;
    const traceId = record.meta?.trace?.id ?? record.traceId;
    const transactionId = record.meta?.transaction?.id ?? record.transactionId;

    const log: Ecs = {
      ecs: { version: EcsVersion },
      '@timestamp': moment(record.timestamp).format('YYYY-MM-DDTHH:mm:ss.SSSZ'),
      message: record.message,
      error: errorToSerializableObject(record.error),
      log: {
        level: record.level.id.toUpperCase(),
        logger: record.context,
      },
      process: {
        pid: record.pid,
        uptime: process.uptime(),
      },
      span: spanId ? { id: spanId } : undefined,
      trace: traceId ? { id: traceId } : undefined,
      transaction: transactionId ? { id: transactionId } : undefined,
    };

    let output = log;
    if (record.meta != null) {
      const serializedMeta = metaToSerializableObject(record.meta);
      if (serializedMeta.error instanceof Error) {
        serializedMeta.error = errorToSerializableObject(serializedMeta.error);
      }
      output = merge(serializedMeta, log);
    }

    return JSON.stringify(output);
  }
}

/** Assumes non-nullish meta */
function metaToSerializableObject(meta: unknown): Record<string, unknown> {
  if (Array.isArray(meta) || typeof meta !== 'object') {
    return { error: String(meta) };
  }

  const metaObject = meta as { toJSON?: () => unknown };
  const serializedMeta =
    typeof metaObject.toJSON === 'function' ? metaObject.toJSON() : { ...metaObject };

  if (
    serializedMeta == null ||
    typeof serializedMeta !== 'object' ||
    Array.isArray(serializedMeta)
  ) {
    return { error: String(serializedMeta) };
  }

  return serializedMeta as Record<string, unknown>;
}

function errorToSerializableObject(error: Error | undefined) {
  if (error === undefined) {
    return error;
  }

  return {
    message: error.message,
    type: error.name,
    stack_trace: error.stack,
  };
}
