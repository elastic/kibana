/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import type { Ecs } from '@elastic/ecs';
import type { LogRecord, Layout } from '@kbn/logging';
import { toEcsLog } from '@kbn/core-logging-common-internal';

/** Formats log records as ECS JSON. */
export class JsonLayout implements Layout {
  public static configSchema = schema.object({ type: schema.literal('json') });

  public static ecsRecord(record: LogRecord): Ecs {
    return toEcsLog(record, process.uptime());
  }

  public format(record: LogRecord): string {
    return JSON.stringify(JsonLayout.ecsRecord(record));
  }
}
