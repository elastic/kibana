/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Type, TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';
import type { ServiceConfigDescriptor } from '@kbn/core-base-server-internal';
import { appendersSchema } from '@kbn/core-logging-server-internal';
import type { filterPolicies } from './user_activity_filters';

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

type FilterPolicy = keyof typeof filterPolicies;

const filterPolicySchema: Type<FilterPolicy> = schema.oneOf([
  schema.literal('keep'),
  schema.literal('drop'),
]);

/** Filters applied to user activity events (defaults to none). */
const filtersSchema = schema.arrayOf(
  schema.object({
    actions: schema.arrayOf(schema.string()),
    policy: filterPolicySchema,
  }),
  { defaultValue: [] }
);

/** @internal */
export type UserActivityFiltersType = TypeOf<typeof filtersSchema>;

/**
 * Configuration schema for the User Activity Service.
 * Uses the same appenders schema as the core logging service.
 */
const configSchema = schema.object({
  enabled: schema.boolean({ defaultValue: false }),
  appenders: schema.mapOf(schema.string(), appendersSchema, {
    defaultValue: defaultAppender,
  }),
  filters: filtersSchema,
});

/** @internal */
export type UserActivityConfigType = TypeOf<typeof configSchema>;

/** @internal */
export const config: ServiceConfigDescriptor<UserActivityConfigType> = {
  path: 'user_activity',
  schema: configSchema,
};
