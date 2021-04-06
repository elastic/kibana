/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import moment from 'moment-timezone';
import { get, has, unset } from 'lodash';
import { set } from '@elastic/safer-lodash-set';
import { merge } from '@kbn/std';
import { schema } from '@kbn/config-schema';
import { Ecs, LogMeta, LogRecord, Layout } from '@kbn/logging';

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

  private static mergeLogMeta(log: Ecs, meta: LogMeta): Ecs {
    // Paths which cannot be overridden via `meta`.
    const RESERVED_PATHS = ['ecs', 'message'];

    for (const path of RESERVED_PATHS) {
      if (has(meta, path)) {
        // To prevent losing useful data, we "quarantine" conflicting keys
        // under a `kibana` property rather than deleting them entirely.
        set(log, `kibana.${path}`, get(meta, path));
        unset(meta, path);
      }
    }

    return merge(log, meta);
  }

  public format(record: LogRecord): string {
    const log: Ecs = {
      ecs: { version: '1.9.0' },
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
    const output = record.meta ? JsonLayout.mergeLogMeta(log, record.meta) : log;
    return JSON.stringify(output);
  }
}
