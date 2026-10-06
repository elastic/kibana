/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Ecs } from '@elastic/ecs';
import type { LogRecord, Layout } from '@kbn/logging';
/**
 * Layout that just converts `LogRecord` into JSON string.
 * @internal
 */
export declare class JsonLayout implements Layout {
  static configSchema: import('@kbn/config-schema').ObjectType<{
    type: import('@kbn/config-schema').Type<'json'>;
  }>;
  static ecsRecord(record: LogRecord): Ecs;
  format(record: LogRecord): string;
}
