/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { merge } from '@kbn/std';
import type { Ecs } from '@elastic/ecs';
import { EcsVersion } from '@elastic/ecs';
import type { LogRecord } from '@kbn/logging';

const pad2 = (value: number): string => (value < 10 ? `0${value}` : `${value}`);

const pad3 = (value: number): string => {
  if (value < 10) return `00${value}`;
  if (value < 100) return `0${value}`;
  return `${value}`;
};

const padYear = (year: number): string => {
  if (year >= 1000) return `${year}`;
  if (year < 0) return `-${String(-year).padStart(4, '0')}`;
  return String(year).padStart(4, '0');
};

const formatTimestamp = (date: Date): string => {
  if (Number.isNaN(date.getTime())) {
    return 'Invalid date';
  }

  const offsetMinutes = -date.getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? '+' : '-';
  const absOffset = Math.abs(offsetMinutes);
  const offsetHours = Math.trunc(absOffset / 60);
  const offsetRemainderMinutes = absOffset % 60;

  return `${padYear(date.getFullYear())}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}T${pad2(date.getHours())}:${pad2(date.getMinutes())}:${pad2(date.getSeconds())}.${pad3(date.getMilliseconds())}${sign}${pad2(offsetHours)}:${pad2(offsetRemainderMinutes)}`;
};

/**
 * Converts a `LogRecord` into its ECS representation, using `uptime` as `process.uptime`.
 * @internal
 */
export const toEcsLog = (record: LogRecord, uptime: number): Ecs => {
  const spanId = record.meta?.span?.id ?? record.spanId;
  const traceId = record.meta?.trace?.id ?? record.traceId;
  const transactionId = record.meta?.transaction?.id ?? record.transactionId;

  const log: Ecs = {
    ecs: { version: EcsVersion },
    '@timestamp': formatTimestamp(record.timestamp),
    message: record.message,
    error: errorToSerializableObject(record.error),
    log: {
      level: record.level.id.toUpperCase(),
      logger: record.context,
    },
    process: {
      pid: record.pid,
      uptime,
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

  return output;
};

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
    return { error: { message: String(serializedMeta) } };
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
