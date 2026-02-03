/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';
import type { ServiceConfigDescriptor } from '@kbn/core-base-server-internal';
import { appendersSchema } from '@kbn/core-logging-server-internal';

type AppendersType = TypeOf<typeof appendersSchema>;

/** Default appender: JSON output to console */
const defaultAppender: Map<string, AppendersType> = new Map([
  [
    'console_json_default_appender',
    {
      type: 'console',
      layout: { type: 'json' },
    },
  ],
]);

/**
 * Configuration schema for the User Activity Service.
 * Uses the same appenders schema as the core logging service.
 */
const configSchema = schema.object({
  enabled: schema.boolean({ defaultValue: false }),
  appenders: schema.mapOf(schema.string(), appendersSchema, {
    defaultValue: defaultAppender,
  }),
});

/** @internal */
export type UserActivityConfigType = TypeOf<typeof configSchema>;

/** @internal */
export const config: ServiceConfigDescriptor<UserActivityConfigType> = {
  path: 'user_activity',
  schema: configSchema,
};
